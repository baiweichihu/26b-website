# Mailtrap 邮件发送用法

当前项目已切回 Mailtrap API 发送。

请优先参考 [EDGE_FUNCTION_SETUP.md](database/identity-refactor/email-templates/EDGE_FUNCTION_SETUP.md) 中的 secrets 配置与发件域要求。

已接入模板文件：
- `register-approved.md`
- `register-rejected.md`

发送脚本：
- `scripts/send-register-email.mjs`

## 1) 环境变量

复制 `.env.example` 为你本地环境变量配置（PowerShell 可直接 `$env:KEY='value'`），至少要有：

- `MAILTRAP_API_TOKEN`
- `MAILTRAP_SENDER_EMAIL`
- `MAILTRAP_SENDER_NAME`

## 2) 发送“通过”邮件

```bash
npm run mail:approved -- --to your_user@example.com --name 申请人昵称
```

## 3) 发送“驳回”邮件

```bash
npm run mail:rejected -- --to your_user@example.com --name 申请人昵称 --reason "资料不完整，请补充班级信息"
```

## 4) 参数说明

- `--status`：由 npm script 固定（approved / rejected）
- `--to`：收件人邮箱（必填）
- `--name`：申请人姓名/昵称（可选，默认“申请人”）
- `--reason`：驳回原因（仅 rejected 时建议填写）

## 5) 注意

- 不要把 token 写进代码或提交到仓库。
- 你给出的 token 已在对话中暴露，建议立刻去 Mailtrap 后台旋转（重新生成）新 token。
