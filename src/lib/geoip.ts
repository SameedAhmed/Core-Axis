
export async function getLocationFromIP(ip: string): Promise<string | null> {
    if (!ip || ip === "::1" || ip === "127.0.0.1") return null;

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,regionName`);
        const data = await response.json();

        if (data.status === "success") {
            return `${data.city}${data.regionName ? `, ${data.regionName}` : ""}${data.country ? `, ${data.country}` : ""}`;
        }
        return null;
    } catch (error) {
        console.error("GeoIP Lookup Failed:", error);
        return null;
    }
}
