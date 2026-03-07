# Identity 重构 TODOLIST

> 目标（已确认）：
> - 删除 `profiles.identity_type`（不再维护身份字段）
> - 所有“有账号且可登录”的用户统一视为内部人员（internal）
> - 访客/游客 = 未登录用户（visitor），不在 `profiles` / `auth` 中存在记录
> - 注册流程改为“提交申请 -> 审核通过后才能登录”（非直接注册即登录）

## 0) 当前阶段（仅规划，不改代码）

- [x] 创建 SQL 专用目录
- [x] 创建重构待办文档
- [ ] 完成需求口径确认（与产品/你逐条确认）

## 1) 待确认问题（回答后锁定方案）

- [x] Q1. 已注册用户是否全部归类为 `internal`？（即不再存在“登录游客”）
  - 结论：是。
- [x] Q2. `profiles.identity_type` 是继续保留字段并改枚举，还是改为布尔字段（如 `is_internal`）？
  - 结论：两者都不采用，直接删除 `identity_type` 字段。
- [x] Q3. `visitor` 是否完全等价于“未登录用户”（不写入 `profiles`）？
  - 结论：是；并且 Supabase Auth 中也不应有 visitor 记录。
- [x] Q4. 管理员任命是否仍要求“仅 classmate 可任命”？若 classmate 被删除，改为“任意 internal 可任命”吗？
  - 结论：改为任意 internal 可任命。
- [x] Q5. 帖子可见性 `visibility` 是否从 `private/classmate_only/alumni_only/public` 收敛为 `private/public`？
  - 结论：都不保留，删除 `visibility` 字段；所有帖子统一“内部可见（登录可见）”。
- [x] Q6. “所有校友查档界面删除”是否包含：`/archive/access-request`、`/admin/journal-approval` 与相关入口文案？
  - 结论：是，全部删除。
- [x] Q7. 是否同时删除“游客升级校友”全链路（`/guest-update-identity` + `upgrade_requests` + 审批页）？
  - 结论：是，全删。
- [x] Q8. `access_requests` 查档申请链路是否全删？
  - 结论：是，全删（含页面/接口/订阅/工具函数）。
- [x] Q9. 管理员权限字段是否删除 `can_manage_journal` 与 `can_manage_user_permissions`？
  - 结论：删除（两项当前价值低且与新模型不一致）。
- [x] Q10. 系统公告按身份投放策略？
  - 结论：仅“全部内部人员”。
- [x] Q11. 帖子未登录访问策略？
  - 结论：门禁（未登录无法浏览帖子）。
- [x] Q12. 注册流程？
  - 结论：提交注册申请（新表）-> superuser 审批通过 -> 写入 profiles -> 邮件通知。
- [x] Q13. 注册审批权限归属？
  - 结论：superuser only。
- [x] Q14. 历史数据策略：`upgrade_requests` / `access_requests` 处理方式？
  - 结论：先做归档快照，再删表。

## 1.1) 最后一组待确认（锁定实现细节）

- [x] Q15. 注册申请通过后，是“自动创建 auth 账号并发设置密码邮件”，还是“仅通知通过，由用户再走注册页完成激活”？
  - 结论：自动创建 auth 账号并发送“设置密码”邮件。
  - 补充：注册申请前仍需邮箱验证码验证有效性。
- [x] Q16. 注册申请表是否需要包含：`email`、`nickname`、`reason`、`status(pending/approved/rejected)`、`handled_by`、`handled_at`、`reject_reason`？
  - 结论：按该字段集执行。
- [x] Q17. 对重复申请规则：同一邮箱在 `pending` 状态时，是否禁止再次提交？
  - 结论：禁止；并且在“发送验证码”阶段就先校验并拦截。
- [x] Q18. profiles 创建时机：审批通过后立即创建一条最小 profile（昵称可为空）是否可接受？
  - 结论：可接受；审批通过即创建。
- [x] Q19. superuser 审批入口：是否新增单独页面（如 `/admin/register-approvals`）？
  - 结论：确认新增。
- [x] Q20. 邮件发送方式：继续使用 Supabase Auth 官方邮件能力，还是接入第三方服务（如 Resend）？
  - 结论：优先使用 Supabase Auth 自带邮件链路（可行前提下）。

## 2) 实施任务（确认后执行）

- [x] 冻结身份模型与权限矩阵
- [ ] 生成数据库迁移 SQL（含回滚）
- [ ] 清理升级与查档相关表/策略/订阅
- [ ] 前端路由与页面删除（升级/查档/审批）
- [ ] 门禁逻辑统一为 `anonymous` vs `internal`
- [ ] 服务层删除校友升级与查档逻辑
- [ ] 后台权限项与菜单重构
- [ ] 通知身份定向逻辑重构
- [ ] 文档更新与回归测试

## 3) SQL 存放约定

- 目录：`database/identity-refactor/sql/`
- 预期文件：
  - `001_schema.sql`
  - `002_data_migration.sql`
  - `003_cleanup.sql`
  - `004_rollback.sql`

## 4) 历史快照目录

- 目录：`database/identity-refactor/snapshots/`
- 用途：存放删表前导出的快照文件（CSV / SQL dump / JSON）

---

最后更新：2026-03-06
