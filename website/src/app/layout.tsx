import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = localFont({
	src: './fonts/GeistVF.woff',
	variable: '--font-geist-sans',
	weight: '100 900',
})

export const metadata: Metadata = {
	title: 'LiteTrans - 截图即翻译',
	description:
		'macOS / Windows 截图翻译工具，快捷键截图，AI 实时翻译，图文对照展示',
	keywords: ['截图翻译', 'macOS', 'Windows', '翻译工具', '图片翻译', 'OCR'],
	authors: [{ name: 'LiteTrans' }],
	openGraph: {
		title: 'LiteTrans - 截图即翻译',
		description:
			'macOS / Windows 截图翻译工具，快捷键截图，AI 实时翻译，图文对照展示',
		type: 'website',
		locale: 'zh_CN',
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${geistSans.variable} font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
