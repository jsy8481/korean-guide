
import { getAllGuides } from '@/lib/mdx';
import GuideSidebar from '@/components/GuideSidebar';

export default async function GuideLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const guides = await getAllGuides();
    const guidesByCategory = guides.reduce((acc, guide) => {
        const category = guide.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(guide);
        return acc;
    }, {} as Record<string, typeof guides>);

    return (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-12 px-4 py-8">
            <aside className="md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:overflow-y-auto w-full md:w-64 flex-shrink-0">
                <GuideSidebar guidesByCategory={guidesByCategory} />
            </aside>
            <main className="flex-1 min-w-0">
                {children}
            </main>
        </div>
    );
}
