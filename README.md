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

## 文件结构

```
src/
├── App.jsx                    # 应用主组件
├── main.jsx                   # 应用入口
├── index.css                  # 全局样式
├── lib/
│   └── supabase.js            # Supabase 客户端初始化
├── utils/
│   └── avatarUtils.js         # 头像工具
├── services/                  # API 层
│   ├── adminService.js        # 管理服务
│   ├── albumService.js        # 相册服务
│   ├── inboxService.js        # 通知服务
│   ├── journalService.js      # 日志服务
│   ├── postService.js         # 帖子服务
│   └── userService.js         # 用户服务
├── components/                # UI 组件
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
└── pages/                     # 路由页面
    ├── journal/
    │   ├── Journal.jsx
    │   └── Journal.module.css
    ├── post/
    │   ├── Wall.jsx
    │   ├── Wall.module.css
    │   ├── CreatePost.jsx
    │   ├── PostDetail.jsx
    │   └── PostDetail.module.css
    ├── static/
    │   ├── Home.jsx
    │   ├── Lobby.jsx
    │   ├── Activities.jsx
    │   ├── Introduction.jsx
    │   ├── Contact.jsx
    │   └── Contact.module.css
    └── user/
        ├── Login.jsx
        ├── Register.jsx
        ├── ResetPassword.jsx
        ├── EditProfile.jsx
        ├── GuestUpdateIdentity.jsx
        ├── UserManagement.jsx
        ├── UserManagement.module.css
        └── Auth.module.css
```
