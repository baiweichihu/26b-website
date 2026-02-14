# userService 文档

本文档旨在说明 `src/services/userService.js` 提供的后端（服务层）API，以及前端页面/组件如何调用这些 API。

---

## 后端（服务层）API 列表

> 说明：以下函数均定义于 `src/services/userService.js`，返回 `{ success, ... }` 结构，调用方需根据 `success` 判断结果。

### 1) signIn

- **用途**：登录（密码或邮箱 OTP）
- **签名**：`signIn({ account, password, otp, loginType = 'password' })`
- **参数**：
  - `account`：邮箱
  - `password`：密码（loginType=password 时使用）
  - `otp`：邮箱 OTP（loginType=otp 时使用）
  - `loginType`：`'password' | 'otp'`
- **说明**：登录成功后会同步更新 profiles 中的 email 字段。

### 2) sendRegisterOtp

- **用途**：注册发送 OTP
- **签名**：`sendRegisterOtp(email)`
- **说明**：注册前会检查 `profiles` 是否已有同邮箱用户，存在则返回错误。

### 3) sendLoginOtp

- **用途**：登录发送 OTP
- **签名**：`sendLoginOtp(email)`

### 4) sendPasswordResetOtp

- **用途**：发送密码重置 OTP / 重置邮件
- **签名**：`sendPasswordResetOtp(email)`

### 5) resetPasswordConfirm

- **用途**：验证 OTP 并重置密码
- **签名**：`resetPasswordConfirm(email, otp, newPassword)`

### 6) signUpVerifyAndSetInfo

- **用途**：注册后验证 OTP 并设置用户资料
- **签名**：`signUpVerifyAndSetInfo({ email, otp, password, nickname })`
- **说明**：
  - 验证 OTP 后设置密码
  - 生成 identicon 头像并写入 profiles（`avatar_url`）

### 7) signOut

- **用途**：退出登录
- **签名**：`signOut()`

### 8) getCurrentUser

- **用途**：获取当前登录用户
- **签名**：`getCurrentUser()`

### 9) submitGuestIdentityUpgradeRequest

- **用途**：游客身份升级申请
- **签名**：`submitGuestIdentityUpgradeRequest({ evidence, nickname })`
- **说明**：写入 `admin_requests` 表，状态默认为 `pending`。

### 10) getProfileDetails

- **用途**：读取当前用户的资料
- **签名**：`getProfileDetails()`
- **返回**：`nickname`、`bio`、`email`

### 11) updateProfileDetails

- **用途**：更新当前用户资料
- **签名**：`updateProfileDetails({ nickname, bio })`

---

## 前端页面与组件（调用关系）

### 页面

1. `src/pages/Login.jsx`
   - 登录入口页
   - 调用：`sendLoginOtp`、`signIn`
   - 负责 OTP 登录与密码登录流程切换。由于一些不知名原因（实际上是没有debug， userService的signIn函数发的是MagicLink，不过也能凑合用，所以就没改

2. `src/pages/Register.jsx`
   - 注册入口页
   - 调用：`sendRegisterOtp`、`signUpVerifyAndSetInfo`
   - 注册后设置昵称与头像

3. `src/pages/ResetPassword.jsx`
   - 重置密码页
   - 调用：`getCurrentUser`、`signIn`、`sendPasswordResetOtp`、`resetPasswordConfirm`、`signOut`
   - 流程：验证旧密码 → 发送 OTP → 验证 OTP → 重置密码 → 退出登录

4. `src/pages/UserManagement.jsx`
   - 用户中心/管理页
   - 读取 Supabase `profiles` 展示资料
   - 提供入口：
     - 修改资料（跳转 `EditProfile`）
     - 重置密码（跳转 `ResetPassword`）

5. `src/pages/EditProfile.jsx`
   - 用户资料编辑页
   - 调用：`getCurrentUser`、`getProfileDetails`、`updateProfileDetails`
   - 保存成功后跳转回用户中心

6. `src/pages/GuestUpdateIdentity.jsx`
   - 游客身份升级申请页
   - 调用：`submitGuestIdentityUpgradeRequest`

### 组件

1. `src/components/features/user/RegisterForm.jsx`
   - 注册表单组件
   - 调用：`sendRegisterOtp`、`signUpVerifyAndSetInfo`

2. `src/components/features/user/LoginHero.jsx`
   - 登录页头部信息区
   - 负责引导按钮及页面视觉结构

3. `src/components/layout/UserDock.jsx`
   - 用户浮动菜单（右上角）
   - 读取 Supabase `profiles` 展示昵称/角色
   - 提供跳转入口：用户中心、注册/登录等

4. `src/components/ui/AuthGateOverlay.jsx`
   - 访问受限时的引导浮层（在班日志/班级墙页面里用）
   - 提供登录/注册/升级身份的按钮入口

---

### 更改说明

- 由于supabase storage的存储限制，本项目暂时不提供头像上传功能，改为自动生成 identicon 头像并写入 `profiles` 的 `avatar_url` 字段。用户资料页和用户浮动菜单会展示这个头像。这个头像的白色部分是透明的，所以在浅色模式下会显示为灰白色，在深色模式下会显示为纯白色。
- 后续更改请在这里添加
