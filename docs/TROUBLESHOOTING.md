# LiteTrans 问题排查指南

## Supabase OAuth 相关

### 问题 1: Database error saving new user

**错误信息:**
```
ERROR: relation "user_profiles" does not exist (SQLSTATE 42P01)
500: Database error saving new user
```

**原因:**
触发器函数 `handle_new_user` 在 auth schema 上下文中执行时，未指定 `search_path`，导致找不到 `public.user_profiles` 表。

**解决方案:**
修复触发器函数，添加 `SET search_path = public` 并使用完整限定表名：

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, plan, daily_limit, daily_used, last_used_date)
  VALUES (NEW.id, 'free', 20, 0, CURRENT_DATE)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

---

### 问题 2: Electron OAuth 回调无法工作

**现象:**
点击 OAuth 登录后，浏览器授权成功，但 Electron 应用无法接收回调。

**原因:**
Electron 使用 `file://` 协议，无法作为标准 HTTP 回调地址。

**解决方案:**
1. 注册自定义协议 `litetrans://`
2. 使用 `skipBrowserRedirect: true` 阻止自动跳转
3. 通过 `shell.openExternal` 打开系统浏览器
4. 监听协议回调解析 token

**关键代码:**

```typescript
// electron/main.ts - 注册协议
app.setAsDefaultProtocolClient('litetrans')

// 处理回调
app.on('open-url', (_event, url) => {
  // 解析 litetrans://auth/callback#access_token=xxx
})

// useAuth.ts - OAuth 配置
const { data } = await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo: 'litetrans://auth/callback',
    skipBrowserRedirect: true,
  },
})
```

**Supabase Dashboard 配置:**
- Authentication → URL Configuration → Redirect URLs 添加: `litetrans://auth/callback`

---

## 配额相关

### 问题 3: 配额检查失败

**错误信息:**
```
配额检查失败
```

**排查步骤:**
1. 检查用户是否已登录
2. 检查 `user_profiles` 表中是否有该用户记录
3. 检查 RPC 函数 `check_and_use_quota` 是否存在

**验证 SQL:**
```sql
SELECT * FROM public.user_profiles WHERE id = '<user_id>';
SELECT public.get_user_quota();
```

---

## 开发调试

### 查看 Supabase Auth 日志

在 Supabase Dashboard → Logs → Auth 中查看认证相关日志，关注:
- `/authorize` - OAuth 授权请求
- `/callback` - OAuth 回调处理
- 错误级别日志

### 本地开发重新编译

```bash
npm run electron:compile
npm run electron:dev
```
