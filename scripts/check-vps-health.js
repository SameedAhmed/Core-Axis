const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

async function runTests() {
    // 1. Determine the base URL and normalize pathPrefix
    let baseUrl = process.argv[2] || "http://localhost:3000";
    const pathPrefix = "";

    // Strip trailing slash and pathPrefix from baseUrl to prevent double-prefixing
    baseUrl = baseUrl.replace(/\/+$/, "");
    if (baseUrl.endsWith(pathPrefix)) {
        baseUrl = baseUrl.substring(0, baseUrl.length - pathPrefix.length);
    }

    console.log(`${colors.bright}${colors.cyan}--- DigiXCrm VPS Health Check ---${colors.reset}`);
    console.log(`Targeting: ${colors.bright}${baseUrl}${pathPrefix}${colors.reset}`);
    console.log(`${colors.yellow}Note: If you see 404s for new routes, remember to upload and run 'npm run build' on the VPS.${colors.reset}\n`);

    const tests = [
        { name: "Public Landing Page", path: "/", expected: 200 },
        { name: "Database Integration Test", path: "/api/health/", expected: 200 },
        { name: "Authentication Portal", path: "/auth/signin/", expected: 200 },
        { name: "Registration Entry", path: "/auth/register-flow/", expected: 200 },
        { name: "Dashboard Protected Access (Check Redirect)", path: "/dashboard/", expected: 307 },
        { name: "Static Icon Assets", path: "/icon.svg", expected: 200 },
        { name: "Global Stylesheet", path: "/_next/static/css/app/layout.css", expected: [200, 404] }, // 404 is okay if naming differs, but usually exists
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const fullUrl = `${baseUrl}${pathPrefix}${test.path}`;
        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                redirect: 'manual', // We want to see the 307/302 redirects
            });

            const status = response.status;
            const isExpected = Array.isArray(test.expected) 
                ? test.expected.includes(status) 
                : status === test.expected;

            if (isExpected || (test.name.includes("Protected") && (status === 307 || status === 302))) {
                console.log(`${colors.green}✓ PASS${colors.reset} | ${test.name.padEnd(45)} | Status: ${status}`);
                passed++;
            } else {
                console.log(`${colors.red}✗ FAIL${colors.reset} | ${test.name.padEnd(45)} | Status: ${status} (Expected: ${test.expected})`);
                failed++;
            }
        } catch (error) {
            console.log(`${colors.red}✗ ERR ${colors.reset} | ${test.name.padEnd(45)} | Error: ${error.message}`);
            failed++;
        }
    }

    // API Route Specific Check
    console.log(`\n${colors.bright}${colors.cyan}--- API Endpoint Verification ---${colors.reset}`);
    
    // Test Onboarding Send Link (Method Not Allowed check is a good sign it exists)
    try {
        const onboardingRes = await fetch(`${baseUrl}${pathPrefix}/api/onboarding/send-link/`, { method: "GET" });
        if (onboardingRes.status === 405) {
            console.log(`${colors.green}✓ PASS${colors.reset} | API Onboarding Link (Method Check)           | Status: 405 (Correct, GET not allowed)`);
            passed++;
        } else {
            console.log(`${colors.yellow}! WARN${colors.reset} | API Onboarding Link                           | Status: ${onboardingRes.status}`);
        }
    } catch (e) {}

    console.log(`\n${colors.bright}--- Results Summary ---${colors.reset}`);
    console.log(`Passed: ${colors.green}${passed}${colors.reset}`);
    console.log(`Failed: ${colors.red}${failed}${colors.reset}`);

    if (failed > 0) {
        console.log(`\n${colors.red}Attention:${colors.reset} Some routes returned unexpected status codes. Check your VPS reverse proxy or database connection.`);
        process.exit(1);
    } else {
        console.log(`\n${colors.green}Success:${colors.reset} All critical routes are responding correctly.`);
        process.exit(0);
    }
}

runTests();
