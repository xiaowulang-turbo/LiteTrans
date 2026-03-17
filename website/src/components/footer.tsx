import { Translations } from '@/lib/i18n'

interface FooterProps {
	t: Translations
}

export function Footer({ t }: FooterProps) {
	return (
		<footer className="py-12 px-6 border-t border-border">
			<div className="max-w-5xl mx-auto">
				<div className="flex flex-col md:flex-row items-center justify-between gap-6">
					{/* Logo */}
					<div className="flex items-center gap-2">
						<div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
							<span className="text-xs font-bold text-white">L</span>
						</div>
						<span className="font-medium">LiteTrans</span>
					</div>

					{/* 链接 */}
					<div className="flex items-center gap-6 text-sm text-muted-foreground">
						<a href="#" className="hover:text-foreground transition-colors">
							{t.footer.privacy}
						</a>
						<a href="#" className="hover:text-foreground transition-colors">
							{t.footer.terms}
						</a>
						<a
							href="https://github.com/xiaowulang-turbo/LiteTrans-Releases"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground transition-colors"
						>
							GitHub
						</a>
					</div>

					{/* 版权 */}
					<p className="text-sm text-muted-foreground">
						{t.footer.copyright.replace('{year}', String(new Date().getFullYear()))}
					</p>
				</div>
			</div>
		</footer>
	);
}
