'use client'

import { Button } from '@/components/ui/button'

export function Download() {
	return (
		<section className='py-24 px-6'>
			<div className='max-w-3xl mx-auto'>
				<div className='glass rounded-3xl p-8 md:p-12 text-center glow relative overflow-hidden'>
					{/* 背景装饰 */}
					<div className='absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl' />
					<div className='absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl' />

					<div className='relative z-10'>
						{/* 图标 */}
						<div className='w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20'>
							<span className='text-4xl'>📸</span>
						</div>

						<h2 className='text-2xl md:text-3xl font-bold mb-3'>
							立即体验 LiteTrans
						</h2>
						<p className='text-muted-foreground mb-8 max-w-md mx-auto'>
							支持 macOS 12.0+ 及 Windows 10+，安装即用，无需配置
						</p>

						{/* 下载按钮 */}
						<div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
							<Button
								size='lg'
								className='h-14 px-10 text-lg bg-primary hover:bg-primary/90 glow'
								onClick={() =>
									window.open(
										'https://github.com/ArcMichael/LiteTrans/releases/latest',
										'_blank'
									)
								}
							>
								<AppleIcon className='w-6 h-6 mr-2' />
								macOS 下载
							</Button>
							<Button
								size='lg'
								className='h-14 px-10 text-lg bg-primary hover:bg-primary/90 glow'
								onClick={() =>
									window.open(
										'https://github.com/ArcMichael/LiteTrans/releases/latest',
										'_blank'
									)
								}
							>
								<WindowsIcon className='w-6 h-6 mr-2' />
								Windows 下载
							</Button>
						</div>

						{/* 信息 */}
						<div className='mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground'>
							<div className='flex items-center gap-2'>
								<CheckIcon className='w-4 h-4 text-green-400' />
								<span>免费使用</span>
							</div>
							<div className='flex items-center gap-2'>
								<CheckIcon className='w-4 h-4 text-green-400' />
								<span>每日 20 次配额</span>
							</div>
							<div className='flex items-center gap-2'>
								<CheckIcon className='w-4 h-4 text-green-400' />
								<span>无广告</span>
							</div>
						</div>
					</div>
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

function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<polyline points='20,6 9,17 4,12' />
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
