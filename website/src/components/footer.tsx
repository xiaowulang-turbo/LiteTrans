export function Footer() {
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
              隐私政策
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              使用条款
            </a>
            <a
              href="https://github.com/user/litetrans"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* 版权 */}
          <p className="text-sm text-muted-foreground">
            © 2024 LiteTrans. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
