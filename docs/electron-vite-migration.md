# electron-vite 迁移方案

## 1. 概述

### 1.1 目标
将 LiteTrans 项目从当前的 `vite + tsc + concurrently` 构建方案迁移到 `electron-vite`，实现：
- 主进程热重载
- 统一构建配置
- 简化开发流程

### 1.2 当前架构

```
构建流程: tsc (electron/) + vite (src/) → electron-builder
开发流程: concurrently + wait-on 协调两个独立进程
输出目录: dist/electron + dist/renderer
```

### 1.3 目标架构

```
构建流程: electron-vite build → electron-builder
开发流程: electron-vite dev (统一管理)
输出目录: out/main + out/preload + out/renderer
```

---

## 2. 踩坑点汇总

### 2.1 高风险 🔴

| 问题 | 场景 | 解决方案 |
|------|------|----------|
| **静态资源路径** | 打包后找不到资源 | 静态资源放 `src/renderer/public`，引用 `out/` 下路径 |
| **CSP 策略拦截** | 请求 Supabase API 被拦截 | 修改 `index.html` 的 CSP 配置，添加 `connect-src` |
| **require 打包失败** | 使用原生模块时报 `Cannot find module` | 使用 `externalizeDeps` 或改用 ESM import |
| **工作目录变化** | `__dirname` 指向 `out/main` 而非源码 | 资源路径使用 `app.getAppPath()` 或配置 `extraResources` |

### 2.2 中风险 🟡

| 问题 | 场景 | 解决方案 |
|------|------|----------|
| **preload 沙箱限制** | preload 中 require 报错 | 设置 `sandbox: false` 或让 electron-vite 打包依赖 |
| **Mac shell 命令失效** | 打包后 `screencapture` 找不到 | 主进程顶部添加 `fix-path` |
| **pnpm + electron-builder** | NSIS 打包报错 | `.npmrc` 添加 `node-linker=hoisted` |
| **ESM/CJS 混用** | 导入第三方包类型报错 | 使用默认导入 `import pkg from 'pkg'` |

### 2.3 低风险 🟢

| 问题 | 场景 | 解决方案 |
|------|------|----------|
| **TypeScript 类型** | `window.electron` 类型报错 | 使用 `@electron-toolkit/preload` 或手动声明 |
| **HMR 失效** | 渲染进程修改不热更新 | 检查 `renderer.root` 配置是否正确 |
| **构建缓存** | 改动后构建产物未更新 | 删除 `out/` 目录重新构建 |

---

## 3. 迁移步骤

### 3.1 Phase 1: 依赖调整

```bash
# 安装
npm i electron-vite -D

# 可选：工具包
npm i @electron-toolkit/preload @electron-toolkit/utils -D

# 移除（迁移完成后）
npm uninstall concurrently wait-on
```

### 3.2 Phase 2: 目录结构调整

**当前结构：**
```
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── baidu-api.ts
│   ├── config.ts
│   └── tsconfig.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── index.html
└── vite.config.ts
```

**目标结构（最小改动方案）：**
```
├── electron/
│   ├── main.ts        # 入口重命名为 index.ts 可选
│   ├── preload.ts
│   ├── baidu-api.ts
│   └── config.ts
├── src/               # 作为 renderer 源码
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── index.html         # 移动到 src/ 下
├── electron.vite.config.ts
└── package.json
```

**操作：**
```bash
# 移动 index.html 到 src/ (作为 renderer 入口)
mv index.html src/index.html

# 删除旧的 electron tsconfig（将合并到主配置）
rm electron/tsconfig.json

# 删除旧的 vite 配置
rm vite.config.ts
```

### 3.3 Phase 3: 配置文件

**创建 `electron.vite.config.ts`：**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html')
        }
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
```

### 3.4 Phase 4: package.json 修改

```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "electron:build": "npm run build && electron-builder",
    "test:api": "npx ts-node scripts/test-api.ts",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:tsc": "tsc --noEmit"
  },
  "build": {
    "appId": "com.litetrans.app",
    "productName": "LiteTrans",
    "directories": {
      "output": "release"
    },
    "files": [
      "out/**/*"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "target": "dmg",
      "extendInfo": {
        "NSAppleEventsUsageDescription": "LiteTrans 需要控制系统截图功能",
        "NSScreenCaptureUsageDescription": "LiteTrans 需要截图权限来翻译屏幕内容"
      }
    }
  }
}
```

### 3.5 Phase 5: 代码适配

#### 5.1 main.ts 修改

```typescript
// 添加到文件顶部（解决 Mac 打包后 shell 命令问题）
import fixPath from 'fix-path'
if (process.platform === 'darwin') {
  fixPath()
}

// 修改：加载渲染进程的路径
function createWindow() {
  // ...
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    // 修改：out/renderer 而非 dist/renderer
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}
```

#### 5.2 preload.ts 修改

无需修改，electron-vite 会自动处理。

#### 5.3 index.html CSP 配置

```html
<!-- src/index.html -->
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; 
                 script-src 'self'; 
                 style-src 'self' 'unsafe-inline'; 
                 connect-src 'self' https://*.supabase.co wss://*.supabase.co;
                 img-src 'self' data: https:;" />
  <!-- ... -->
</head>
```

### 3.6 Phase 6: tsconfig 调整

**根目录 `tsconfig.json`（渲染进程）：**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**`tsconfig.node.json`（主进程/配置文件）：**
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["electron/**/*", "electron.vite.config.ts"]
}
```

---

## 4. 验证清单

### 4.1 开发模式

- [ ] `npm run dev` 正常启动
- [ ] 渲染进程 HMR 生效
- [ ] 主进程修改后自动重载
- [ ] preload 修改后自动重载
- [ ] Supabase 认证正常
- [ ] 截图功能正常

### 4.2 生产构建

- [ ] `npm run build` 成功
- [ ] `npm run electron:build` 打包成功
- [ ] 打包后应用启动正常
- [ ] 截图功能正常（Mac shell 命令）
- [ ] API 请求正常（CSP 配置）

---

## 5. 回滚方案

若迁移失败，执行以下步骤回滚：

```bash
# 1. 恢复文件
git checkout -- package.json tsconfig.json tsconfig.node.json
git checkout -- vite.config.ts
git checkout -- index.html
mv src/index.html index.html  # 如果已移动

# 2. 恢复 electron/tsconfig.json（从 git 或备份）
git checkout -- electron/tsconfig.json

# 3. 删除新配置
rm electron.vite.config.ts

# 4. 重装依赖
npm uninstall electron-vite @electron-toolkit/preload @electron-toolkit/utils
npm install concurrently wait-on -D
npm install
```

---

## 6. 时间估算

| 阶段 | 预计时间 |
|------|----------|
| Phase 1: 依赖调整 | 5 min |
| Phase 2: 目录结构 | 10 min |
| Phase 3: 配置文件 | 15 min |
| Phase 4: package.json | 5 min |
| Phase 5: 代码适配 | 20 min |
| Phase 6: tsconfig | 10 min |
| 验证测试 | 30 min |
| **总计** | **~1.5 小时** |

---

## 7. 参考资料

- [electron-vite 官方文档](https://electron-vite.org/)
- [electron-vite 中文文档](https://cn.electron-vite.org/)
- [electron-vite GitHub](https://github.com/alex8088/electron-vite)
