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
│
├── components/                # UI 组件
│   ├── features/              # 业务功能组件
│   │   ├── post/              # 帖子相关 (对应 PostService)
│   │   │   ├── PostCard.jsx
│   │   │   └── PostCard.module.css
│   │   ├── media/             # 媒体组件
│   │   │   ├── MusicPlayer.jsx
│   │   │   ├── MusicPlayer.module.css
│   │   │   ├── EasterEgg.jsx
│   │   │   └── EasterEgg.module.css
│   │   ├── album/             # 相册相关 (对应 AlbumService)
│   │   ├── user/              # 用户相关 (对应 UserService)
│   │   ├── inbox/             # 通知相关 (对应 InboxService)
│   │   ├── tag/               # 标签相关 (对应 TagService)
│   │   └── admin/             # 管理相关 (对应 AdminService)
│   │
│   ├── layout/                # 布局组件
|   |   ├── BackgroundParticles.jsx  # 背景粒子特效(满足一些神秘条件才能看得到哦)
│   │   ├── Header.jsx         # 网页头
│   │   ├── Header.module.css
│   │   ├── Navbar.jsx         # 导航栏
│   │   ├── Navbar.module.css
│   │   ├──Footer.jsx         # 网页脚
│   │   ├── Footer.module.css
|   |   ├── CornerNav.jsx      # 侧边导航栏
│   |   └── CornerNav.module.css
│   │
│   ├── landing/               # 着陆页组件
│   │   ├── IntroScreen.jsx
│   │   └── IntroScreen.module.css
│   │
│   └── ui/                    # 通用 UI 组件
│       ├── ThemeToggle.jsx    # 切换亮暗模式
│       ├── IrisTransition.jsx  # 转场
│       └── IrisTransition.module.css
│
│   └── widgets/               # 小型提示组件
│       ├── NoticeBox.jsx
│       └── NoticeBox.module.css

│
├── pages/                     # 路由页面
│   ├── Home.jsx               # 首页
│   ├── Wall.jsx               # 班级墙
│   ├── Wall.module.css
│   ├── CreatePost.jsx          # 发布帖子
│   ├── TicketCenter.jsx        # 工单中心
│   ├── PostDetail.jsx          # 帖子详情
│   ├── Login.jsx               # 登录
│   ├── Register.jsx            # 注册
│   ├── Profile.jsx             # 个人档案
│   ├── Activities.jsx         # 活动相册
│   ├── Journal.jsx            # 班级日志
│   ├── Introduction.jsx       # 班级介绍
│   ├── Contact.jsx            # 联系方式
│   └── Contact.module.css
│
├── services/                  # API 层
|   ├── tests/                # 各服务的测试脚本
│   ├── docs/                 # 各服务的功能说明文档
│   ├── postService.js         # 帖子服务
│   ├── albumService.js        # 相册服务
│   ├── userService.js         # 用户服务
│   ├── adminService.js        # 管理服务
│   ├── tagService.js          # 标签服务
│   └── inboxService.js        # 通知服务
│
└── lib/
    └── supabase.js            # Supabase 客户端初始化
```
