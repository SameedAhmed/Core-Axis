import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as any,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                code: { label: "2FA Code", type: "text" }
            },
            async authorize(credentials) {
                // Turnstile CAPTCHA skipped by global request
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { account: true }
                });

                if (!user || !user.password) {
                    throw new Error("User not found or password not set");
                }

                // Tier 1: Individual User Suspension
                if (!user.isActive) {
                    throw new Error("USER_SUSPENDED");
                }

                // Tier 2: Organizational Tier Suspension
                // If the account owner or the account itself is suspended, all linked users are blocked.
                if (user.account && !user.account.isActive) {
                    throw new Error("ORGANIZATION_SUSPENDED");
                }

                // Tier 3: Subscription Enforcement (Enterprise Loophole Fix)
                if (user.account?.planTier === "ENTERPRISE" && !user.account.hasPaymentSetup) {
                    throw new Error("PAYMENT_REQUIRED");
                }

                const dbPassword = (user as any).password;
                const isValid = await bcrypt.compare(credentials.password, dbPassword);

                if (!isValid) {
                    throw new Error("Invalid password");
                }

                if ((user as any).isTwoFactorEnabled) {
                    const providedCode = credentials.code?.trim();
                    if (!providedCode || providedCode === "undefined" || providedCode === "null") {
                        throw new Error("2FA_REQUIRED");
                    }
                    
                    const twofactor = require("node-2fa");
                    const isCodeValid = twofactor.verifyToken((user as any).twoFactorSecret, providedCode, 1);

                    if (!isCodeValid) {
                        throw new Error("2FA_INVALID");
                    }
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                };
            }


        })
    ],
    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async signIn({ user, account }) {
            // Credentials provider already validates the user in authorize()
            if (account?.provider === "credentials") {
                return true;
            }

            // For Google and Email flows, check if user exists (i.e. was invited)
            if (!user.email) return false;

            const existingUser = await prisma.user.findUnique({
                where: { email: user.email }
            });

            if (!existingUser) {
                // Reject signin if not in DB (invitation only system)
                return false;
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as unknown as { role: string }).role;
                token.id = (user as unknown as { id: string }).id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as unknown as { role: string }).role = token.role as string;
                (session.user as unknown as { id: string }).id = token.id as string;
            }
            return session;
        }
    },
    // SECURITY: Add a random secret for JWT encryption if not in .env
    secret: process.env.NEXTAUTH_SECRET,
};

