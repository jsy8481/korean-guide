
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://jsy8481.github.io'),
  title: {
    template: '%s | 한국어 기술 가이드',
    default: '한국어 기술 가이드',
  },
  description: "초보자도 실제 프로젝트에 적용 가능한 상세한 한국어 기술 가이드",
  openGraph: {
    title: '한국어 기술 가이드',
    description: '초보자도 실제 프로젝트에 적용 가능한 상세한 한국어 기술 가이드',
    url: 'https://jsy8481.github.io/korean-guide',
    siteName: '한국어 기술 가이드',
    locale: 'ko_KR',
    type: 'website',
  },
  verification: {
    google: 'PEpZRjA3CF52fo657_N5xCvBcik541r6aepiADVNO0k',
    other: {
      'naver-site-verification': 'd19b6742d8427f79e630198a0f6997f8184e4465',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={`${inter.className} bg-white`}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
