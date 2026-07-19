import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://digixcrm.com';

    // Core Marketing Pages
    const routes = [
        '',
        '/pricing',
        '/features',
        '/download',
        '/contact',
        '/docs',
        '/terms',
        '/privacy',
        '/features/workflow'
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date().toISOString().split('T')[0],
        changeFrequency: 'weekly' as const,
        priority: route === '' ? 1 : 0.8,
    }));

    return routes;
}
