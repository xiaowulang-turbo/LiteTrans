# LiteTrans P0 优化：详细实施方案

本方案旨在通过**状态管理重构、逻辑解耦、性能优化**三个阶段，将项目提升至生产级稳定性。

## 1. 状态管理与逻辑层重构 (优雅的核心)
我们将引入 `Zustand` 建立三层架构，彻底解决 `App.tsx` 的臃肿问题。

### **1.1 建立全局 Store**
- **`useAppStore`**: 统一管理 UI 视图路由 (`view`)、应用状态 (`status`)、置顶状态 (`isPinned`) 和平台信息。
- **`useAuthStore`**: 封装 Supabase 身份验证与配额逻辑。不再在组件中处理 `signIn/signOut` 细节。
- **`useTranslationStore`**: 管理当前翻译结果、语言偏好和翻译历史。

### **1.2 逻辑解耦 (Hooks)**
- **`useTranslationCore`**: 封装“截图 -> 配额校验 -> Edge Function 调用 -> 结果保存”的完整流水线。
- **`useIPCManager`**: 在应用根部统一管理 IPC 监听器，防止在组件切换时出现重复监听或内存泄漏。

---

## 2. 渲染进程组件化 (优雅的 UI)
将 [App.tsx](file:///d:/Programming/LiteTrans/src/App.tsx) 拆分为功能单一的模块。

### **2.1 目录结构调整**
```bash
src/
  ├── components/      # 原子组件 (Button, Loader, WindowControls)
  ├── layout/          # 布局组件 (TitleBar, StatusBar, ActionArea)
  ├── views/           # 页面视图 (Main, Login, Profile, History)
  ├── store/           # Zustand Stores
  └── hooks/           # 业务逻辑 Hooks
```

### **2.2 核心组件设计**
- **`TitleBar`**: 统一处理 `drag` 区域、平台特定的窗口按钮和置顶切换逻辑。
- **`StatusBar`**: 集中展示快捷键提示和当前配额进度。
- **`ViewRouter`**: `App.tsx` 将简化为一个纯粹的视图分发器，根据 `appStore` 的 `view` 状态渲染对应组件。

---

## 3. 主进程性能与健壮性 (优雅的底层)

### **3.1 内存安全管理**
- 在 [main.ts](file:///d:/Programming/LiteTrans/electron/main.ts) 中引入 `ScreenshotManager` 类。
- 采用 **"Capture-and-Forget"** 模式：确保 `lastScreenshot` 和 `pngBuffer` 在 IPC `crop-result` 回调或 `Escape` 取消时被立即显式销毁。

### **3.2 多显示器支持 (Windows)**
- 升级 `captureScreenWindows`：
  1. 获取 `Monitor.all()` 列表。
  2. 计算覆盖所有显示器的总 `bounds`。
  3. 调整 `screenshotOverlayWindow` 尺寸以覆盖完整桌面空间，支持跨屏截图。

---

## 4. 稳定性增强 (优雅的防护)

### **4.1 API 调用升级**
- 在 [supabase.ts](file:///d:/Programming/LiteTrans/src/lib/supabase.ts) 中实现带**指数退避 (Exponential Backoff)** 的重试机制。
- 针对 `AbortError` 和 `5xx` 错误自动进行最多 3 次尝试，显著提升在不稳定网络环境下的成功率。

### **4.2 全局异常监控**
- 实现 `ErrorHandler` 组件，利用 React Error Boundary 捕获 UI 崩溃。
- 主进程监听 `uncaughtException`，并通过 IPC 向用户弹出友好的错误提示而非直接闪退。

---

## 下一步行动
1. 安装 `zustand` 依赖。
2. 按照方案 1.1 和 2.1 建立新的目录结构并迁移状态逻辑。
3. 逐步从 `App.tsx` 中抽离视图组件。
