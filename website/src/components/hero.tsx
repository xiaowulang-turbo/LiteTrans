'use client'

import { Button } from '@/components/ui/button'

export function Hero() {
	return (
		<section className='relative min-h-screen flex items-center justify-center overflow-hidden'>
			{/* 背景渐变光斑 */}
			<div className='absolute inset-0 overflow-hidden'>
				<div className='absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl' />
				<div className='absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl' />
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl' />
			</div>

			<div className='relative z-10 max-w-5xl mx-auto px-6 py-20 text-center'>
				{/* 标签 */}
				<div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8'>
					<span className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
					<span className='text-sm text-muted-foreground'>
						macOS / Windows 双平台支持
					</span>
				</div>

				{/* 主标题 */}
				<h1 className='text-5xl md:text-7xl font-bold tracking-tight mb-6'>
					<span className='gradient-text'>截图</span>
					<span className='text-foreground'>即</span>
					<span className='gradient-text'>翻译</span>
				</h1>

				{/* 副标题 */}
				<p className='text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed'>
					一键快捷键截图，AI 实时识别翻译，
					<br className='hidden md:block' />
					图文对照展示，让跨语言阅读更轻松
				</p>

				{/* CTA 按钮 */}
				<div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
					<Button
						size='lg'
						className='h-12 px-6 text-base bg-primary hover:bg-primary/90 glow'
						onClick={() =>
							window.open(
								'https://github.com/ArcMichael/LiteTrans/releases/latest',
								'_blank'
							)
						}
					>
						<AppleIcon className='w-5 h-5 mr-2' />
						macOS 下载
					</Button>
					<Button
						size='lg'
						className='h-12 px-6 text-base bg-primary hover:bg-primary/90 glow'
						onClick={() =>
							window.open(
								'https://github.com/ArcMichael/LiteTrans/releases/latest',
								'_blank'
							)
						}
					>
						<WindowsIcon className='w-5 h-5 mr-2' />
						Windows 下载
					</Button>
					<Button
						size='lg'
						variant='outline'
						className='h-12 px-8 text-base glass glass-hover'
					>
						了解更多
					</Button>
				</div>

				{/* 版本信息 */}
				<p className='mt-6 text-sm text-muted-foreground'>
					v1.0.0 · 免费使用 · 每日 20 次配额
				</p>

				{/* 产品截图 */}
				<div className='mt-16 relative'>
					<div className='glass rounded-2xl p-2 glow max-w-2xl mx-auto'>
						<div className='aspect-video rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center'>
							<div className='text-center'>
								<div className='w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center'>
									<span className='text-3xl'>📸</span>
								</div>
								<p className='text-muted-foreground'>
									产品演示
								</p>
							</div>
						</div>
					</div>
					{/* 装饰性浮动元素 */}
					<div className='absolute -top-4 -left-4 w-20 h-20 glass rounded-xl rotate-12 opacity-60' />
					<div className='absolute -bottom-4 -right-4 w-16 h-16 glass rounded-xl -rotate-12 opacity-60' />
				</div>
			</div>
		</section>
	)
}

function AppleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox='0 0 24 24' fill='currentColor'>
			<path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
		</svg>
	)
}

function WindowsIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox='0 0 24 24' fill='currentColor'>
			<path d='M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.676L24 0v11.551H10.949V1.773zm-10.949 10.949H9.75v9.451L0 20.551v-7.828zm10.949 0H24v11.551l-13.051-1.773v-9.778z' />
		</svg>
	)
}
