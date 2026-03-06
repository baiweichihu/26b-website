# 注册审批邮件自动发送（Supabase Edge Function）

已接入函数：
- `supabase/functions/send-register-email/index.ts`

前端触发点：
- superuser 批准注册申请后自动调用
- superuser 驳回注册申请后自动调用（并在函数内删除待审批账号）

## 1) 需要的 Supabase Secrets（服务端环境变量）

> 这里是 **Supabase 云端函数环境变量**，不是前端 `.env`。

- `MAILTRAP_API_TOKEN`
- `MAILTRAP_SENDER_EMAIL`（必须是 Mailtrap 允许/已验证的发件地址）
- `MAILTRAP_SENDER_NAME`（例如 `26B Website Team`）

## 2) 部署函数

```bash
supabase functions deploy send-register-email
```

## 3) 设置 secrets（示例）

```bash
supabase secrets set MAILTRAP_API_TOKEN=your_mailtrap_token
supabase secrets set MAILTRAP_SENDER_EMAIL=verified_sender@example.com
supabase secrets set MAILTRAP_SENDER_NAME="26B Website Team"
```

## 4) 本地联调（可选）

```bash
supabase functions serve send-register-email --env-file ./supabase/.env.local
```

`supabase/.env.local` 示例：

```bash
MAILTRAP_API_TOKEN=your_mailtrap_token
MAILTRAP_SENDER_EMAIL=verified_sender@example.com
MAILTRAP_SENDER_NAME=26B Website Team
```

## 5) 说明

- 前端不会持有 Mailtrap API token。
- 函数内部会校验调用者必须是 `superuser`，非 superuser 调用会返回 403。
- 驳回时账号删除由函数执行（`auth.admin.deleteUser`），失败时前端会提示警告。

## 6) 发件域说明（重要）

- Mailtrap API 要求发件地址来自可用/已验证发件域。
- `@163.com` 属于公共邮箱域名，你无法为 `163.com` 添加 DNS 记录，因此通常不能作为“自有已验证域”。
- 建议：
	- 开发测试继续用 Mailtrap 提供的测试发件地址。
	- 生产使用你自己可控域名（如 `mail.yourdomain.com`）做 SPF/DKIM/DMARC 后再配置发件地址。

## 7) 已上线库的必要热修

若你已出现驳回 `409`（`No API key found in request`）错误，请先执行：

- `database/identity-refactor/sql/007_reject_rpc_no_direct_auth_delete.sql`

作用：把 SQL RPC 调整为“只改申请状态”，避免在数据库函数里直接删 `auth.users` 导致冲突。
