import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/api/og/*'],
                disallow: ['/dashboard/', '/api/', '/auth/'], // Protect private data
            },
        ],
        sitemap: 'https://digixcrm.com/sitemap.xml',
    };
}
