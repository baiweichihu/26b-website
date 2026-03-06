# userService 文档（当前版本）

本文档对应 `src/services/userService.js` 的当前实现。

## 核心认证与密码接口

### `signIn({ account, password, otp, loginType = 'password' })`
- 用途：登录（密码登录 / 邮箱 OTP 登录）。
- 规则：登录成功后会校验该用户在 `profiles` 中存在（即已审批通过）。

### `sendLoginOtp(email)`
- 用途：发送登录 OTP（Supabase OTP）。
- 规则：仅 `profiles` 中已存在的邮箱可发送。

### `sendPasswordResetOtp(email)`
- 用途：发送重置密码验证码（自定义 Edge Function：`password-reset-otp`）。
- 当前规则：发送 6 位数字验证码，10 分钟有效（由函数侧控制）。

### `resetPasswordConfirm(email, otp, newPassword)`
- 用途：校验验证码并重置密码（`password-reset-otp` 的 `verify_reset`）。
- 当前规则：
  - `otp` 必须为 6 位数字；
  - `newPassword` 最少 6 位。

### `signOut()`
- 用途：退出登录。
- 容错：若返回 `Auth session missing`，按“已退出”处理。

### `getCurrentUser()`
- 用途：获取当前登录用户。

## 注册申请接口

### `sendRegisterOtp(email)`
- 用途：发送注册验证码（Edge Function：`register-otp`）。

### `submitRegisterRequest({ email, otp, nickname, reason })`
- 用途：验证注册验证码并提交注册申请。
- 行为：创建待审批申请，等待 superuser 处理。

## 个人资料接口

### `getProfileDetails()`
- 用途：读取当前用户资料（`nickname`、`bio`、`email`）。

### `updateProfileDetails({ nickname, bio })`
- 用途：更新当前用户资料。

## 对应页面关系（简表）

- `src/pages/user/Login.jsx`：`signIn`、`sendLoginOtp`
- `src/pages/user/Register.jsx`：`sendRegisterOtp`、`submitRegisterRequest`
- `src/pages/user/ResetPassword.jsx`：`getCurrentUser`、`sendPasswordResetOtp`、`resetPasswordConfirm`
- `src/pages/user/EditProfile.jsx`：`getProfileDetails`、`updateProfileDetails`

## 已下线链路（不再使用）

- 游客升级校友申请
- 查档申请与审批
- `profiles.identity_type` 相关逻辑
