'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Guide {
    slug: string;
    category: string;
    title: string;
}

interface GuideSidebarProps {
    guidesByCategory: Record<string, Guide[]>;
}

export default function GuideSidebar({ guidesByCategory }: GuideSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const activeRef = useRef<HTMLLIElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (activeRef.current && sidebarRef.current) {
            const sidebar = sidebarRef.current;
            const activeEl = activeRef.current;
            const offsetTop = activeEl.offsetTop - sidebar.offsetTop;
            sidebar.scrollTop = offsetTop - sidebar.clientHeight / 2 + activeEl.clientHeight / 2;
        }
    }, [pathname]);

    const hasGuides = Object.keys(guidesByCategory).length > 0;

    return (
        <>
            {/* Mobile toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed bottom-6 right-6 z-50 bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all"
                aria-label={isOpen ? '목차 닫기' : '목차 열기'}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                )}
            </button>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`
                    fixed md:static inset-y-0 left-0 z-40
                    w-72 md:w-64 flex-shrink-0
                    bg-white dark:bg-gray-950 md:bg-transparent
                    transform transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
                    border-r md:border-r-0
                    overflow-y-auto md:overflow-y-visible
                `}
            >
                <div className="p-6 md:p-0 md:pt-0">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">목차</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="md:hidden text-gray-500 hover:text-gray-700"
                            aria-label="목차 닫기"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <hr className="border-gray-200 dark:border-gray-800 mb-4" />
                    <div className="space-y-6 pb-24">
                        {Object.entries(guidesByCategory).map(([category, categoryGuides]) => (
                            <div key={category}>
                                <h4 className="font-semibold text-sm text-gray-500 mb-2 uppercase">{category}</h4>
                                <ul className="space-y-1">
                                    {categoryGuides.map((guide) => {
                                        const href = `/guides/${guide.category}/${guide.slug}`;
                                        const isActive = pathname === href;
                                        return (
                                            <li key={guide.slug} ref={isActive ? activeRef : null}>
                                                <Link
                                                    href={href}
                                                    onClick={() => {
                                                        setIsOpen(false);
                                                        window.scrollTo(0, 0);
                                                    }}
                                                    className={`block py-1.5 px-2 rounded text-sm transition-colors ${isActive
                                                        ? 'bg-gray-100 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100'
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {guide.title}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                        {!hasGuides && (
                            <p className="text-sm text-gray-400">가이드 준비 중...</p>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
