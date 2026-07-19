import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
        return new NextResponse('Domain parameter is required', { status: 400 });
    }

    // Clean up domain if user pasted full URL
    let cleanDomain = domain;
    try {
        if (cleanDomain.startsWith('http')) {
            cleanDomain = new URL(cleanDomain).hostname;
        }
        cleanDomain = cleanDomain.replace(/^www\./, '');
    } catch {
        // keep as is if unparseable
    }

    // Attempt Primary: Clearbit (High Quality Logos)
    try {
        const primaryRes = await fetch(`https://logo.clearbit.com/${cleanDomain}`, { 
            signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (primaryRes.ok) {
            const buffer = await primaryRes.arrayBuffer();
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': primaryRes.headers.get('content-type') || 'image/png',
                    'Cache-Control': 'public, max-age=604800, immutable',
                },
            });
        }
    } catch (e) {
        // Clearbit blocked by DNS/Firewall or timed out, swallow error and proceed to fallback
        console.log(`[API Logo] Clearbit fetch failed for ${cleanDomain}`);
    }

    // Attempt Secondary: Google Favicons
    try {
        const fallbackRes = await fetch(`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`, {
             signal: AbortSignal.timeout(3000)
        });
        
        if (fallbackRes.ok) {
            const buffer = await fallbackRes.arrayBuffer();
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': fallbackRes.headers.get('content-type') || 'image/png',
                    'Cache-Control': 'public, max-age=604800, immutable',
                },
            });
        }

        return new NextResponse('No logo found', { status: 404 });
    } catch (error) {
        return new NextResponse('Internal server error during fetch', { status: 500 });
    }
}
