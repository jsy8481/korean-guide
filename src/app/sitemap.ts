
import { MetadataRoute } from 'next';
import { getAllGuides } from '@/lib/mdx';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const guides = await getAllGuides();
    const baseUrl = 'https://jsy8481.github.io';

    const guideUrls = guides.map((guide) => ({
        url: `${baseUrl}/guides/${guide.category}/${guide.slug}`,
        lastModified: new Date(guide.date),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/guides`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        ...guideUrls,
    ];
}
