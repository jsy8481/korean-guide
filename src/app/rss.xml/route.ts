import { Feed } from "feed";
import { getAllGuides } from "@/lib/mdx";

export const dynamic = "force-static";

export async function GET() {
    const guides = await getAllGuides();
    const site_url = "https://jsy8481.github.io";

    const feedOptions = {
        title: "한국어 기술 가이드 | NestJS & Drizzle",
        description: "초보자도 실제 프로젝트에 적용 가능한 상세한 한국어 기술 가이드",
        id: site_url,
        link: site_url,
        language: "ko",
        image: `${site_url}/logo.svg`,
        favicon: `${site_url}/favicon.ico`,
        copyright: `All rights reserved ${new Date().getFullYear()}, jsy8481`,
        generator: "Feed for Node.js",
        feedLinks: {
            rss2: `${site_url}/rss.xml`,
        },
        author: {
            name: "jsy8481",
            link: "https://github.com/jsy8481",
        },
    };

    const feed = new Feed(feedOptions);

    guides.forEach((guide) => {
        feed.addItem({
            title: guide.title,
            id: `${site_url}/guides/${guide.category}/${guide.slug}`,
            link: `${site_url}/guides/${guide.category}/${guide.slug}`,
            description: guide.description,
            date: new Date(guide.date),
            category: [{ name: guide.category }],
        });
    });

    return new Response(feed.rss2(), {
        headers: {
            "Content-Type": "text/xml; charset=utf-8",
        },
    });
}
