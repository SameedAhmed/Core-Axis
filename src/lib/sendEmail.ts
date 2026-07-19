import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || "465"),
        secure: true,
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
        }
    });

    return await transporter.sendMail({
        from: process.env.EMAIL_FROM || "DigiXCrm <noreply@digixcrm.com>",
        to,
        subject,
        html
    });
}
