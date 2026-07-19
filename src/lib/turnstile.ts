import { prisma } from "./prisma";

export async function validateTurnstileToken(token: string) {
    // 0. CHECK GLOBAL OVERRIDE (Optional database toggle)
    try {
        const config = await (prisma as any).globalSettings.findUnique({
            where: { id: "SYSTEM_CONFIG" }
        });
        if (config && config.turnstileEnabled === false) {
            return true; // Global bypass active via DB
        }
    } catch (e) {
        // Fallback to active if DB fails or table missing
    }

    if (!token) return false;

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
        console.error("TURNSTILE_SECRET_KEY is missing in environment variables.");
        return false;
    }

    try {
        const formData = new FormData();
        formData.append("secret", secretKey);
        formData.append("response", token);

        const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: formData,
        });

        const outcome = await res.json();
        
        if (!outcome.success) {
            console.warn("Turnstile validation failed:", outcome["error-codes"]);
        }
        
        return outcome.success;

    } catch (err) {
        console.error("Turnstile verification error:", err);
        return false;
    }
}
