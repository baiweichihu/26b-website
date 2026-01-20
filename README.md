# 26b-website

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
│   │   ├── Header.jsx
│   │   ├── Header.module.css
│   │   ├── Navbar.jsx
│   │   ├── Navbar.module.css
│   │   └── Footer.jsx
│   │
│   ├── landing/               # 着陆页组件
│   │   ├── IntroScreen.jsx
│   │   └── IntroScreen.module.css
│   │
│   └── ui/                    # 通用 UI 组件
│       └── ThemeToggle.jsx
│
├── pages/                     # 路由页面
│   ├── Home.jsx               # 首页
│   ├── Wall.jsx               # 班级墙
│   ├── Wall.module.css
│   ├── Activities.jsx         # 活动相册
│   ├── Journal.jsx            # 班级日志
│   ├── Introduction.jsx       # 班级介绍
│   ├── Contact.jsx            # 联系方式
│   └── Contact.module.css
│
├── services/                  # API 层
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
