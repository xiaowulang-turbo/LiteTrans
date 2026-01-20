# 部署 Edge Function

## 前置条件

需要有百度图片翻译 API 凭证（APPID 和 SECRET）。

## 1. 安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# 或使用 npm
npm install -g supabase
```

## 2. 登录 Supabase

```bash
supabase login
```

## 3. 链接项目

```bash
cd /Users/ruanxiaowu/Code/LiteTrans
supabase link --project-ref vswoqqtiavuuxnicapxg
```

## 4. 设置百度 API 密钥（重要）

```bash
supabase secrets set BAIDU_APPID=你的百度APPID
supabase secrets set BAIDU_SECRET=你的百度SECRET
```

## 5. 部署函数

```bash
supabase functions deploy translate-image --no-verify-jwt
```

> 注意：`--no-verify-jwt` 是因为我们在函数内部自行验证 JWT

## 6. 验证部署

```bash
# 获取一个有效的 JWT token（从浏览器登录后的 localStorage 获取）
curl -X POST 'https://vswoqqtiavuuxnicapxg.supabase.co/functions/v1/translate-image' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -F 'image=@test.png' \
  -F 'from=auto' \
  -F 'to=zh'
```

## 架构说明

```
[Electron App] 
    ↓ 截图 (base64)
[渲染进程] 
    ↓ fetch + JWT
[Supabase Edge Function]
    ↓ 验证用户 + 读取 BAIDU_APPID/SECRET
[百度图片翻译 API]
    ↓ 返回翻译结果
[渲染进程] 
    ↓ 显示结果
```

API 密钥完全存储在 Supabase 服务端，客户端无法获取。
