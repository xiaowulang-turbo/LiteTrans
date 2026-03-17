import { Translations } from '@/lib/i18n'

interface FeaturesProps {
	t: Translations
}

export function Features({ t }: FeaturesProps) {
	return (
		<section className="py-24 px-6">
			<div className="max-w-5xl mx-auto">
				{/* 标题 */}
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						{t.features.title[0]}
						<span className="gradient-text">{t.features.title[1]}</span>
					</h2>
					<p className="text-muted-foreground text-lg">
						{t.features.subtitle}
					</p>
				</div>

				{/* 功能卡片 */}
				<div className="grid md:grid-cols-3 gap-6">
					{t.features.items.map((feature, index) => (
						<div
							key={index}
							className="glass glass-hover rounded-2xl p-6 text-center group"
						>
							<div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
								{feature.icon}
							</div>
							<h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
