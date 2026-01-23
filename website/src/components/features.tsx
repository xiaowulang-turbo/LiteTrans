const features = [
  {
    icon: "⌨️",
    title: "快捷键截图",
    description: "Alt+Q 一键唤起截图，选区即捕获，无需繁琐操作",
  },
  {
    icon: "🌐",
    title: "AI 实时翻译",
    description: "云端 AI 识别图片文字，支持中英日韩多语言互译",
  },
  {
    icon: "📄",
    title: "图文对照",
    description: "翻译结果直接覆盖原图，保持排版，一目了然",
  },
];

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            简单三步，
            <span className="gradient-text">轻松翻译</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            专为效率而生的截图翻译体验
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
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
