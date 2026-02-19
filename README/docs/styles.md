# UI 设计风格说明（中文）

本文用于描述本项目的 UI 设计风格与实现约定，并在每个部分标注真实代码文件，方便设计与开发对照实现。

---

## 1. 设计目标

由于这个网站的定位是**档案馆**（archive），我们希望营造一种温暖的校园回忆氛围，同时用GSAP增加一些视觉动效，让用户体验更流畅。

- **情绪氛围**：温暖、明亮、带轻微科技感与未来感的校园回忆氛围。  
  参考页面：`src/pages/Home.jsx`、`src/pages/Journal.jsx`
- **阅读体验**：信息层级清晰、文字可读性高、页面节奏适中。  
  参考样式：`src/index.css`（`scene-title` / `scene-subtitle` / `scene-kicker`）
- **一致性**：按钮、卡片、表单、动效统一风格。  
  参考组件：`src/components/layout/Header.jsx`、`src/components/layout/UserDock.jsx`
- **舒适感**：柔和渐变、玻璃质感、柔光背景；避免高对比硬色块。  
  参考背景：`src/index.css`（`body` 背景渐变）、`src/components/layout/BackgroundParticles.jsx`

---

## 2. 色彩系统

### 2.1 主色与变量

- 主色与辅色来自全局变量：  
  `--scene-accent`、`--scene-accent-2`、`--muted-color`  
  定义位置：`src/index.css`

### 2.2 背景与层级

- 面板背景与边框统一使用：  
  `--panel-bg`、`--panel-border`  
  定义位置：`src/index.css`
- 深色模式变量定义：  
  `[data-theme='dark']`  
  定义位置：`src/index.css`

---

## 3. 排版与文字层级

- **标题层级**：
  - 主标题：`scene-title`
  - 副标题：`scene-subtitle`
  - 引导标签：`scene-kicker`  
    定义位置：`src/index.css`
- **字体选择**：  
  全局字体为中文衬线：`Noto Serif SC / Source Han Serif SC`  
  定义位置：`src/index.css`（`body`）
- **混排原则**：  
  中文为主、英文为辅，常见于按钮与辅助标签。  
  参考页面：`src/pages/UserManagement.jsx`、`src/components/layout/UserDock.jsx`

---

## 4. 布局规范

- **核心布局容器**：  
  `scene-page` / `scene-panel` / `scene-hero`  
  定义位置：`src/index.css`
- **页面结构**：  
  `AppLayout` 统一包裹导航与主要内容  
  参考文件：`src/App.jsx`
- **内容间距**：  
  大范围使用网格/间距控制，避免过度拥挤  
  参考页面：`src/pages/UserManagement.jsx`（`manageGrid`）

---

## 5. 组件风格

### 5.1 按钮

- 主按钮：`scene-button primary`
- 次按钮：`scene-button ghost`  
  定义位置：`src/index.css`  
  使用示例：`src/pages/Login.jsx`、`src/pages/Register.jsx`

### 5.2 卡片 / 面板

- 面板统一使用 `scene-panel`，并结合 `panel-bg` 与 `panel-border`。  
  定义位置：`src/index.css`  
  使用示例：`src/pages/UserManagement.jsx`、`src/pages/ResetPassword.jsx`

### 5.3 表单

- 输入控件多使用 Bootstrap 的 `form-control`。  
  使用示例：`src/pages/ResetPassword.jsx`、`src/components/features/user/RegisterForm.jsx`
- 自定义表单卡片与布局：  
  `Auth.module.css`（`formCard` / `formHeader` / `field` 等）  
  参考文件：`src/pages/ResetPassword.jsx`、`src/pages/EditProfile.jsx`

### 5.4 用户信息区

- 头像与角色信息统一布局  
  参考样式：`src/pages/UserManagement.module.css`、`src/components/layout/UserDock.module.css`  
  参考组件：`src/pages/UserManagement.jsx`、`src/components/layout/UserDock.jsx`

---

## 6. 动效与过渡

- **虹膜转场**：页面跳转使用扩散动效（说的很高级其实跟ppt转场差不多）。  
  实现位置：`src/components/ui/IrisTransition.jsx`
- **进入动画**：面板与子元素轻微上移 + 渐显。  
  使用示例：`src/pages/UserManagement.jsx`
- **减少打扰**：遵循 `prefers-reduced-motion`。  
  实现位置：`src/components/ui/IrisTransition.jsx`

---

## 7. 响应式设计

- 移动端网格自动折行、按钮堆叠。  
  参考样式：`src/pages/Auth.module.css`
- 主要容器自适应宽度与间距。  
  定义位置：`src/index.css`

---

## 8. 视觉元素与装饰

- **背景粒子层**：视觉氛围层，不干扰正文。这个东西就是header和footer上的两个缓慢移动的大圆点  
  实现文件：`src/components/layout/BackgroundParticles.jsx`
- **柔光与渐变**：用于面板与背景的空间感。  
  定义位置：`src/index.css`、`src/pages/Auth.module.css`

---

## 9. 文案风格

- 中文为主、语气友好；英文为辅助说明。后续有可能考虑增加英文  
  参考页面：`src/pages/UserManagement.jsx`、`src/components/layout/UserDock.jsx`
- 错误/提示信息强调易读性与明确性。  
  参考组件：`src/components/widgets/NoticeBox.jsx`
