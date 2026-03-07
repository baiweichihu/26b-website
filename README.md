# 26b-website

北京八中少26B班站点（React + Vite + Supabase）。

## 开发前必读

请先阅读 `README/` 目录下文档（均为当前仓库实际存在的文件）：

- `README/GITHUB_DEVELOP.md`：分支、提交、PR 协作流程
- `README/funcs.md`：业务功能说明（按模块）
- `README/tables.md`：数据库表与服务层设计说明
- `README/docs/styles.md`：样式规范
- `README/docs/userService.md`：用户服务说明

## 本地运行

```bash
npm install
npm run dev
```

## 常用命令

```bash
npm run build      # 生产构建
npm run preview    # 预览构建产物
npm run lint       # ESLint 检查
npm run test       # Jest 测试
npm run deploy     # 部署到 gh-pages
```

## 技术栈

- 前端：React 19 + React Router DOM 7
- 构建：Vite 7
- 样式：CSS Modules + Bootstrap 5
- 后端服务：Supabase (Auth + PostgreSQL + Storage + Edge Functions)
- 测试：Jest
- 代码质量：ESLint + Prettier + Husky

## 当前项目结构（与仓库同步）

```text
.
├─ src/
│  ├─ App.jsx
│  ├─ main.jsx
│  ├─ index.css
│  ├─ lib/
│  │  └─ supabase.js
│  ├─ services/
│  │  ├─ adminService.js
│  │  ├─ adminService.notifications.js
│  │  ├─ albumService.js
│  │  ├─ inboxService.js
│  │  ├─ journalService.js
│  │  ├─ peopleService.js
│  │  ├─ postService.js
│  │  ├─ postService.helpers.js
│  │  └─ userService.js
│  ├─ components/
│  │  ├─ features/
│  │  │  ├─ album/
│  │  │  ├─ journal/
│  │  │  ├─ media/
│  │  │  ├─ people/
│  │  │  ├─ post/
│  │  │  └─ user/
│  │  ├─ landing/
│  │  ├─ layout/
│  │  ├─ ui/
│  │  └─ widgets/
│  ├─ pages/
│  │  ├─ admin/
│  │  ├─ album/
│  │  ├─ notifications/
│  │  ├─ people/
│  │  ├─ post/
│  │  ├─ report/
│  │  ├─ static/
│  │  │  └─ journal-styles/
│  │  └─ user/
│  └─ utils/
│     └─ avatarUtils.js
├─ public/
├─ supabase/
│  ├─ config.toml
│  └─ functions/
├─ database/
│  └─ identity-refactor/
├─ README/
│  ├─ docs/
│  ├─ funcs.md
│  ├─ GITHUB_DEVELOP.md
│  └─ tables.md
├─ scripts/
│  └─ journal/
│     └─ csv_to_json.py
├─ package.json
└─ vite.config.js
```

## 路由说明（以 `src/App.jsx` 为准）

- 静态页：`/`、`/lobby`、`/activities`、`/journal`、`/handbook`、`/contact`
- 帖子：`/wall`、`/posts/new`、`/posts/:postId`
- 人物志：`/introduction/students`、`/introduction/teachers`、`/introduction/ownership-logs`
- 相册：`/album`、`/album/:folderId`
- 用户：`/login`、`/register`、`/user/reset-password`、`/user/manage`、`/user/edit-profile`
- 管理后台：`/admin/dashboard`、`/admin/ban-users`、`/admin/content-reports`、`/admin/register-approvals`、`/admin/permission-request`、`/admin/permission-approvals`、`/admin/superuser-panel`、`/admin/announcement`

## 说明

- 如果 README 与代码不一致，请以 `src/App.jsx`、`src/services/`、`README/` 实际内容为准。
- 若新增模块或页面，请同步更新本 README 与对应 `README/` 文档。

## 近期结构调整（2026-03）

- `src/services/postService.js` 的通用 helper 已抽离到 `src/services/postService.helpers.js`。
- `src/services/adminService.js` 的通知发送语义已抽离到 `src/services/adminService.notifications.js`。
- `src/pages/static/Journal.module.css` 已改为入口样式文件，拆分并引入：
	- `src/pages/static/journal-styles/Journal.layout-and-viewer.css`
	- `src/pages/static/journal-styles/Journal.responsive-and-theme.css`
- 人物编辑与帖子详情页面已做中粒度组件拆分：
	- 人物编辑：`src/components/features/people/PeopleProfileOwnerPicker.jsx`、`PeopleProfileRoleFields.jsx`、`PeopleProfileSocialSection.jsx`
	- 帖子详情：`src/components/features/post/PostDetailHeader.jsx`、`PostDetailArticle.jsx`、`PostDetailComments.jsx`
