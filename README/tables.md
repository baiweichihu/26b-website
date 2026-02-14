初步设置6s个service：
**UserService**、**PostService**、**AlbumService**、**TagService**、**AdminService**和**InboxService**。

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

#### **`journal_access_requests`**

用于处理校友申请班日志查档的请求。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `requester_id` (申请人，关联 `profiles.id`)
- **重要字段:**
  - `requested_access_start_time`: 申请的查档起始时间
  - `requested_access_end_time`: 申请的查档结束时间
  - `reason`: 申请理由
  - `status`: `pending`, `approved`, `rejected`
  - `handled_by`: 处理该请求的管理员/superuser ID
  - `created_at`: 申请时间
  - `handled_at`: 处理时间

### 6. **InboxService**

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
