import QRCode from "qrcode";

/**
 * Generates a Data URL for a QR Code
 * @param text The URL or string to encode
 * @returns Promise<string>
 */
export async function generateQR(text: string): Promise<string> {
    try {
        return await QRCode.toDataURL(text, {
            margin: 1,
            width: 512,
            color: {
                dark: "#000000",
                light: "#ffffff",
            },
        });
    } catch (err) {
        console.error("QR Generation Error:", err);
        return "";
    }
}
