# 26b-website

## 开发者须知

在开发前，**请务必认真阅读README文件夹中的所有内容**：

- `GITHUB_DEVELOP.md`：包含了如何使用GitHub进行代码管理的详细步骤。
- `CODE_OF_CONDUCT.md`：包含了代码准则和PR审查准则。
- `jest.md`: 包含了如何编写和运行测试的说明。
- `funcs.md`: 包含了各个服务模块的功能说明。
- `tables.md`: 数据库建表协议。

## 运行

运行（开发测试）方式如下：

```bash
npm install
npm run dev
```

如果要部署到白尾赤狐的github网页，请使用

```bash
npm run build
npm run deploy
```

## 技术栈

- **前端框架**: React 19.2.0 + React Router DOM 7.12.0
- **构建工具**: Vite 7.2.4
- **样式框架**: Bootstrap 5.3.8 + React Bootstrap 2.10.10
- **数据库**: Supabase (PostgreSQL)
- **Markdown支持**: React Markdown + 语法高亮
- **PDF支持**: React PDF
- **代码质量**: ESLint + Prettier + Husky
- **测试框架**: Jest
- **部署**: GitHub Pages

## 文件结构

```
src/
├── App.jsx                    # 应用主组件和路由配置
├── main.jsx                   # 应用入口
├── index.css                  # 全局样式
├── lib/
│   └── supabase.js            # Supabase 客户端初始化
├── utils/
│   └── avatarUtils.js         # 头像工具
├── services/                  # API 服务层
│   ├── adminService.js        # 管理服务
│   ├── albumService.js        # 相册服务
│   ├── inboxService.js        # 通知服务
│   ├── journalService.js      # 日志服务
│   ├── postService.js         # 帖子服务
│   └── userService.js         # 用户服务
├── components/                # 可复用 UI 组件
│   ├── features/              # 业务功能组件
│   │   ├── journal/
│   │   │   ├── JournalLayout.jsx
│   │   │   ├── MDViewer.jsx
│   │   │   ├── PDFViewer.jsx
│   │   │   └── TableOfContents.jsx
│   │   ├── media/
│   │   │   ├── MusicPlayer.jsx
│   │   │   ├── MusicPlayer.module.css
│   │   │   ├── EasterEgg.jsx
│   │   │   └── EasterEgg.module.css
│   │   ├── post/
│   │   │   ├── PostCard.jsx
│   │   │   ├── PostCard.module.css
│   │   │   ├── PostCommentComposer.jsx
│   │   │   ├── PostCommentComposer.module.css
│   │   │   ├── PostCommentList.jsx
│   │   │   ├── PostCommentList.module.css
│   │   │   ├── PostMetrics.jsx
│   │   │   ├── PostMetrics.module.css
│   │   │   ├── PostWallControls.jsx
│   │   │   ├── PostWallControls.module.css
│   │   │   ├── PostWallEmptyState.jsx
│   │   │   ├── PostWallEmptyState.module.css
│   │   │   ├── PostWallHero.jsx
│   │   │   └── PostWallHero.module.css
│   │   └── user/
│   │       ├── LoginHero.jsx
│   │       ├── RegisterHero.jsx
│   │       └── RegisterForm.jsx
│   ├── landing/
│   │   ├── IntroScreen.jsx
│   │   └── IntroScreen.module.css
│   ├── layout/
│   │   ├── BackgroundParticles.jsx
│   │   ├── Header.jsx
│   │   ├── Header.module.css
│   │   ├── Navbar.jsx
│   │   ├── Navbar.module.css
│   │   ├── Footer.jsx
│   │   ├── Footer.module.css
│   │   ├── CornerNav.jsx
│   │   ├── CornerNav.module.css
│   │   ├── UserDock.jsx
│   │   └── UserDock.module.css
│   ├── ui/
│   │   ├── ThemeToggle.jsx
│   │   ├── IrisTransition.jsx
│   │   ├── IrisTransition.module.css
│   │   ├── AuthGateOverlay.jsx
│   │   ├── AuthGateOverlay.module.css
│   │   ├── ReportGateOverlay.jsx
│   │   └── ReportGateOverlay.module.css
│   └── widgets/
│       ├── NoticeBox.jsx
│       └── NoticeBox.module.css
└── pages/                     # 路由页面组件
    ├── admin/                 # 管理后台页面
    │   ├── AdminDashboard.jsx
    │   ├── AdminDashboard.module.css
    │   ├── Announcement.jsx
    │   ├── Announcement.module.css
    │   ├── BanUsers.jsx
    │   ├── ContentReports.jsx
    │   ├── ContentReports.module.css
    │   ├── JournalApproval.jsx
    │   ├── JournalApproval.module.css
    │   ├── PermissionApprovals.jsx
    │   ├── PermissionApprovals.module.css
    │   ├── PermissionRequest.jsx
    │   ├── PermissionRequest.module.css
    │   ├── SuperuserPanel.jsx
    │   ├── SuperuserPanel.module.css
    │   ├── UpgradeApprovals.jsx
    │   └── UserPermissions.jsx
    ├── album/                 # 相册页面
    │   └── .gitkeep
    ├── journal/               # 日志相关页面
    │   ├── AlumniJournalAccess.jsx
    │   ├── Journal.jsx
    │   └── Journal.module.css
    ├── notifications/         # 通知页面
    │   ├── Notifications.jsx
    │   └── Notifications.module.css
    ├── post/                  # 帖子相关页面
    │   ├── CreatePost.jsx
    │   ├── PostDetail.jsx
    │   ├── PostDetail.module.css
    │   ├── Wall.jsx
    │   └── Wall.module.css
    ├── report/                # 报告页面
    │   ├── ReportDetail.jsx
    │   └── ReportDetail.module.css
    ├── static/                # 静态页面
    │   ├── Activities.jsx
    │   ├── Contact.jsx
    │   ├── Contact.module.css
    │   ├── Home.jsx
    │   ├── Introduction.jsx
    │   └── Lobby.jsx
    └── user/                  # 用户相关页面
        ├── Auth.module.css
        ├── EditProfile.jsx
        ├── GuestUpdateIdentity.jsx
        ├── Login.jsx
        ├── Register.jsx
        ├── ResetPassword.jsx
        ├── UserManagement.jsx
        └── UserManagement.module.css
```
