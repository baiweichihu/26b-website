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
  - `real_name`: 真实姓名（可选）
  - `avatar_url`: 头像链接
  - `bio`: 简介
  - `identity_type`: 枚举类型 (enum)。取值：`classmate`(本班同学), `alumni`(校友), `guest`(游客)
  - `role`: 枚举类型。取值：`superuser`, `admin`, `user`
  - `is_banned`: 布尔值。是否被禁言
  - `created_at`: 注册时间

#### **`admin_permissions`**

用于记录每个管理员的具体权限范围。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `admin_id` (关联 `profiles.id`，且该用户的 `role` 必须为 `admin` 或 `superuser`)
- **重要字段:**
  - `can_manage_user_info`: 布尔值。是否有"用户信息管理"权限（审核注册、审核头像昵称修改）
  - `can_manage_user_permissions`: 布尔值。是否有"用户权限管理"权限（审核升级校友、禁言用户）
  - `can_manage_content`: 布尔值。是否有"内容管理"权限（处理举报、删除违规内容）
  - `can_manage_album`: 布尔值。是否有"相册管理"权限（增删照片、管理文件夹）
  - `granted_by`: 授予该权限的superuser ID (关联 `profiles.id`)
  - `granted_at`: 授权时间
  - `updated_at`: 最后更新时间

#### **`profile_change_requests`**

用于处理"用户修改头像和昵称需要审核"的需求。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `user_id` (关联 `profiles.id`)
- **重要字段:**
  - `new_nickname`: 申请的新昵称
  - `new_avatar_url`: 申请的新头像
  - `new_bio`: 申请的新简介
  - `status`: 状态 (pending/approved/rejected)
  - `reviewed_by`: 审核人ID (关联管理员的 `profiles.id`)

---

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

---

### 3. **AlbumService**

#### **`album_folders`**

用于管理员对相册进行文件夹层级管理。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `parent_id` (自关联 `album_folders.id`，用于创建子文件夹，为空则为根文件夹)
- **重要字段:**
  - `name`: 文件夹名称
  - `description`: 文件夹描述 (可选)
  - `sort_order`: 整数。用于排序显示
  - `created_by`: 创建该文件夹的管理员ID (关联 `profiles.id`)
  - `created_at`: 创建时间
  - `updated_at`: 最后修改时间

#### **`album_photos`**

仅限本班同学上传的公共资源池。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):**
  - `uploader_id` (关联 `profiles.id`)
  - `folder_id` (关联 `album_folders.id`，可为空表示未分类)
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

### 4. **TagService**

为了实现"支持Hashtag搜索"的最佳性能，建议使用多对多关系设计。

#### **`hashtags`**

存储所有唯一的标签名。

- **主键 (PK):** `id` (Integer 或 UUID)
- **重要字段:**
  - `name`: 标签文本 (例如 "运动会", 唯一索引)
  - `usage_count`: 使用次数 (用于热门排序)

#### **`post_tags`**

- **主键 (PK):** 联合主键 (`post_id`, `tag_id`)

#### **`photo_tags`**

- **主键 (PK):** 联合主键 (`photo_id`, `tag_id`)

---

### 5. **AdminService**

为了处理复杂的审核流程（升级校友、删除图片申请、举报、管理员任免），建议设立通用的请求/工单表。

#### **`admin_requests`**

用于处理以下业务：游客升级校友申请、相册图片添加申请、管理员申请提升权限。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):** `requester_id` (发起人)
- **重要字段:**
  - `request_type`: 枚举。取值：`upgrade_identity`, `add_photo`, `change_permissions`
  - `target_id`: UUID (可选)。例如如果想要申请添加某张照片，这里就填 `album_photos.id`
  - `evidence`: 文本/JSON列表。例如"提交相关证据升级为校友"的证据描述或图片链接
  - `requested_permissions`: JSONB (仅用于 `change_permissions` 类型)。记录申请的新权限配置，例如 `{"can_manage_album": true}`
  - `status`: `pending`, `approved`, `rejected`
  - `handled_by`: 处理该请求的管理员/superuser ID
  - `created_at`: 申请时间
  - `handled_at`: 处理时间

#### **`admin_appointments` (管理员任免记录表)**

用于superuser任免管理员的历史记录。

- **主键 (PK):** `id` (UUID)
- **外键 (FK):**
  - `user_id` (被任免的用户，关联 `profiles.id`)
  - `appointed_by` (执行任免操作的superuser，关联 `profiles.id`)
- **重要字段:**
  - `action`: 枚举。取值：`appoint` (任命), `dismiss` (免职)
  - `permissions_granted`: JSONB。任命时授予的权限配置（对应 `admin_permissions` 表的各字段）
  - `reason`: 任免原因说明 (可选)
  - `created_at`: 操作时间

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
