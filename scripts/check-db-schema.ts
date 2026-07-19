import { prisma } from "../src/lib/prisma";

async function checkColumns() {
    try {
        console.log("Checking Lead table columns...");
        const columns = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Lead'
        `;
        console.log("Lead columns:", JSON.stringify(columns, null, 2));
        
        console.log("\nChecking User table columns...");
        const userCols = await prisma.$queryRaw`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User'
        `;
         console.log("User columns:", JSON.stringify(userCols, null, 2));

    } catch (error: any) {
        console.error("Error checking columns:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkColumns();
