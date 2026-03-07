当前按业务拆分的核心 service 包括：
**UserService**、**PostService**、**AlbumService**、**AdminService**、**JournalService**、**PeopleService** 和 **InboxService**。

> 2026-03 结构补充（与当前代码一致）：
>
> - `PostService` 的通用鉴权/作者加工/媒体校验/通知安全发送 helper 已抽离至 `src/services/postService.helpers.js`；
> - `AdminService` 的通知语义封装（注册通过、禁言状态、举报结果、权限申请结果、管理员任免通知）已抽离至 `src/services/adminService.notifications.js`。
>
> `postService.js` 与 `adminService.js` 仍保留原有业务导出接口，仅调整内部组织方式。

---

### 1.UserService

Supabase 自带 `auth.users` 表处理基本的登录（手机号/密码）和 UID 生成,但是这是系统表，不是业务表。

#### **`profiles`**

存储用户的公开信息和身份状态。

- **主键 (PK):** `id` (UUID, 外键关联 `auth.users.id`，一对一关系)
- **重要字段:**
  - `email`: 邮箱
  - `nickname`: 昵称
  - `avatar_url`: 头像链接
  - `bio`: 简介
  - `identity_type`: 枚举类型 (enum)。取值：`classmate`(本班同学), `alumni`(校友), `guest`(游客)
  - `role`: 枚举类型。取值：`superuser`, `admin`, `user`
  - `is_banned`: 布尔值。是否被禁言
  - `created_at`: 注册时间

#### **`upgrade_requests`**

用于游客升级校友申请。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `requester_id` (发起人，关联 `profiles.id`)
- **重要字段:**
  - `evidence`: 文本，提交相关证据
  - `status`: 枚举类型，取值：`pending`, `approved`, `rejected`
  - `handled_by`: 处理该请求的管理员ID
  - `created_at`: 申请时间
  - `handled_at`: 处理时间

### 2. PostService

#### **`posts`**

存储帖子的核心内容。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `author_id` (关联 `profiles.id`)
- **重要字段:**
  - `content`: 文本内容
  - `media_urls`: 数组 (JSONB 或 Text Array，注意建表的时候只能选择两种类型之一)。存储图片/视频的链接列表
  - `visibility`: 枚举类型。取值：`private`, `classmate_only`, `alumni_only`, public
  - `is_anonymous`: 布尔值。是否匿名发布 (Postgres RLS 策略需配合此字段控制 `author_id` 的读取权限)
  - `view_count`: 浏览量
  - `created_at`: 发布时间

#### **`post_likes`**

记录用户对帖子的点赞，防止重复点赞。

- **主键 (PK):** 联合主键 (`post_id`, `user_id`)
- **外键:** `post_id`, `user_id`
- **重要字段:** `created_at`

#### **`comments`**

存储一级评论和回复（二级评论）。

- **主键 (PK):** `id` (UUID)
- **外键:**
  - `post_id` (关联 `posts.id`)
  - `author_id` (关联 `profiles.id`)
  - `parent_id` (自关联 `comments.id`，用于通过二级回复找到父评论，为空则为一级评论)
- **重要字段:**
  - `content`: 评论内容
  - `reply_to_user_id`: (可选) 如果是回复某人，记录被回复者的ID
  - `created_at`: 评论时间

#### **`comment_likes`**

- **主键 (PK):** 联合主键 (`comment_id`, `user_id`)

#### **`content_reports` (内容举报表)**

用于处理帖子和评论的举报。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `reporter_id` (举报人)
- **重要字段:**
  - `target_type`: 枚举 (`post`, `comment`)
  - `target_id`: UUID (被举报的帖子/评论ID)
  - `target_content`: TEXT (被举报内容的快照，用于在内容被删除后依然能查看)
  - `target_author_id`: UUID (被举报内容的作者ID，用于内容被删除后仍能查看)
  - `target_author_nickname`: TEXT (被举报内容的作者昵称快照)
  - `reason`: 举报原因
  - `suggestion`: 举报人建议的处理方式 (可选)
  - `status`: `pending`, `resolved` (已处理), `dismissed` (驳回)
  - `admin_note`: 管理员处理备注

---

### 3. **AlbumService**

暂且不需要动态的albums了，如果是静态的albums，直接建表存储图片信息即可，不需要后端再有上传和删除照片的api了；但是还是需要一个移动文件夹的api。链接先都存在本地，之后可以开一个阿里云OSS的bucket存储图片，表里只存储图片的URL。

#### **`album_photos`**

公共资源池。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):**
  - `uploader_id` (关联 `profiles.id`)
- **重要字段:**
  - `url`: 图片存储地址
  - `description`: 描述 (可选)
  - `width`: 图片宽 (优化前端展示)
  - `height`: 图片高
  - `created_at`: 上传时间
  - `moved_at`: 最后移动到文件夹的时间

#### **`album_likes`**

- **主键 (PK):** 联合主键 (`photo_id`, `user_id`)

---

### 4. **AdminService**

#### **`admin_permissions`**

用于记录每个管理员的具体权限范围。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `admin_id` (关联 `profiles.id`，且该用户的 `role` 必须为 `admin` 或 `superuser`)
- **重要字段:**
  - `can_manage_journal`: 布尔值。是否有"班日志查档审批"权限
  - `can_manage_user_permissions`: 布尔值。是否有"审核升级校友"权限
  - `can_ban_users`: 布尔值。是否有"禁言用户"权限
  - `can_manage_content`: 布尔值。是否有"内容管理"权限（处理举报、删除违规内容）
  - `granted_by`: 授予该权限的superuser ID (关联 `profiles.id`)
  - `granted_at`: 授权时间
  - `updated_at`: 最后更新时间

#### **`admin_requests`**

用于处理管理员申请权限变更向superuser提交的请求。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `requester_id` (申请人，关联 `profiles.id`)
- **重要字段:**
  - `requested_permissions`: JSONB。记录申请的新权限配置，例如 `{"can_manage_album": true}`
  - `reason`: 申请理由
  - `status`: 枚举。取值：`pending`, `approved`, `rejected`
  - `handled_by`: 处理该请求的superuser ID (关联 `profiles.id`)
  - `created_at`: 申请时间
  - `handled_at`: 处理时间

---

### 5. **JournalService**

#### **`access_requests`**

用于处理校友申请各类档案查档的请求（班级日志/成长手册/班级相册/人物志/大事记）。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `requester_id` (申请人，关联 `profiles.id`)
- **重要字段:**
  - `archive_category`: 查档类别，建议枚举值：`journal`、`handbook`、`album`、`introduction`、`activities`
  - `request_access_start_time`: 申请的查档起始时间
  - `request_access_end_time`: 申请的查档结束时间
  - `reason`: 申请理由
  - `status`: `pending`, `approved`, `rejected`
  - `handled_by`: 处理该请求的管理员/superuser ID
  - `created_at`: 申请时间
  - `handled_at`: 处理时间

> 前端路由说明：查档申请页面已通用化为 `/archive/access-request`，不再使用仅面向班日志语义的页面命名。

---

### 6. **PeopleService**

#### **`people_profiles`**

用于存储人物志动态数据（学生/教师），支持“先创建档案，再分配归属用户”。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):**
  - `owner_user_id` (关联 `auth.users.id`，可为空；为空表示尚未分配用户归属)
  - `created_by_user_id` (关联 `auth.users.id`，记录创建人)
- **重要字段:**
  - `student_no`: 学号（学生使用）
  - `name`: 姓名
  - `gender`: `male`, `female`
  - `role`: `student`, `teacher`
  - `status`: 状态文案（默认建议 `未设置`）
  - `description`, `bio`: 人物描述
  - `hobbies`, `skills`, `phone`, `social`: JSON 字段
  - `avatar_path`: 人物志照片在 Supabase Storage 中的路径
  - `sort_order`: 排序值
  - `updated_at`, `created_at`: 时间戳

> 约束建议：
> - 保留 `owner_user_id` 的“非空唯一索引”（`where owner_user_id is not null`），保证一个用户最多归属一条人物。
> - `owner_user_id` 允许为空，配合 superuser 创建后再分配归属。
> - `created_by_user_id` 建议 `not null`，便于审计。

> 当前前端/服务层权限模型（与页面行为一致）：
> - 仅 `superuser` 可创建人物与删除人物；
> - `superuser` 可修改 `owner_user_id`（用户归属）；
> - 普通用户仅可修改归属到自己的人物资料。

> 当前前端路由：
> - 人物目录：`/introduction/students`、`/introduction/teachers`
> - 归属记录：`/introduction/ownership-logs`（仅 superuser）
> - 人物编辑：`/people/edit/:profileId`

#### **`people_profile_owner_change_logs`**

用于记录人物 `owner_user_id` 的变更审计日志，便于追溯 superuser 的归属调整操作。

- **主键 (PK):** `id` (bigint identity)
- **外键 (FK):**
  - `people_profile_id` (关联 `people_profiles.id`)
  - `old_owner_user_id` (关联 `profiles.id`，可为空)
  - `new_owner_user_id` (关联 `profiles.id`，可为空)
  - `changed_by_user_id` (关联 `profiles.id`，记录操作者)
- **重要字段:**
  - `changed_at`: 变更时间（UTC）

> 建议策略：
> - 通过 `people_profiles` 的 `after update of owner_user_id` 触发器自动写入日志；
> - 开启 RLS，仅 `superuser` 允许 `select/insert`。
>
> 相关 SQL 请放在 `database/identity-refactor/sql/` 下统一维护（含建表、触发器、索引、RLS 与 policy）。

#### **Storage Bucket：`people-avatars`**

人物志照片文件使用独立桶：`people-avatars`（注意：这不是用户账户头像）。

- **FILE SIZE LIMIT:** `2MB`
- **ALLOWED MIME TYPES:** `image/jpeg`, `image/png`, `image/webp`
- **路径约定:** `${owner_user_id}/filename.ext`
  - 用户仅可写入/更新/删除自己的目录
  - 管理员/超级管理员可管理所有目录
  - 读取权限跟随人物志查档权限策略

> 补充说明：用户帐户头像仍使用 `profiles.avatar_url`（identicon 方案），不支持用户上传；`people-avatars` 仅用于人物志页面展示的个人照片。

### 7. **InboxService**

#### **`notifications`**

用户接收的所有系统通知，包括：审核结果、举报反馈、互动消息（点赞评论）。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `recipient_id` (接收通知的用户，关联 `profiles.id`)
- **索引:** `(recipient_id, created_at)` 复合索引，用于快速拉取"我的通知列表"
- **重要字段:**
  - `type`: 枚举。取值建议：
    - `system_announcement` (系统公告)
    - `audit_result` (审核结果)
    - `report_feedback` (举报反馈)
    - `interaction` (社交互动: 有人点赞/评论了帖子/相册)
  - `title`: 标题
  - `content`: 通知详情文本
  - `related_resource_type`: 字符串 (如 `admin_request`, `profile`, `post`)
  - `related_resource_id`: UUID (点击通知后跳转的目标业务ID)
  - `is_read`: 布尔值。默认为 `false`
  - `created_at`: 通知生成时间
