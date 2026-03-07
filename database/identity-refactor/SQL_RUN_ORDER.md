# Identity Refactor SQL 执行顺序（现行）

## 一次性执行顺序

1. `sql/001_schema.sql`
2. `sql/001b_reject_register_cleanup.sql`
3. `sql/002_data_migration.sql`
4. `sql/003_cleanup.sql`
5. `sql/005_disable_legacy_auth_user_trigger.sql`
6. `sql/006_reject_rpc_hardening.sql`
7. `sql/007_reject_rpc_no_direct_auth_delete.sql`
8. `sql/008_fix_register_requests_unique_pending.sql`
9. `sql/009_register_email_otp.sql`
10. `sql/010_people_profiles_rls_fix.sql`
11. `sql/011_cleanup_invalid_people_avatar_paths.sql`
12. `sql/012_people_avatars_storage_rls_fix.sql`
13. `sql/013_password_reset_email_otp.sql`

## 可选收尾（确认不再需要库内回滚快照后）

14. `sql/014_drop_backup_tables.sql`

> 说明：`003_cleanup.sql` 会在库内生成临时备份表：
> - `public.upgrade_requests_backup_20260306`
> - `public.access_requests_backup_20260306`
>
> 当你已经完成本地快照导出且不再依赖这两个库内备份表时，再执行 `014` 删除。

## 最小验收清单

- 注册：发送 6 位验证码并提交申请成功。
- 审批：superuser 在注册审批页可通过/驳回，且邮件发送正常。
- 重置密码：发送 6 位验证码并成功重置密码。
- 用户中心与管理后台不再出现“校友升级 / 查档审批”入口。
- `profiles.identity_type` 与 `posts.visibility` 不再被业务代码依赖。

## 回滚说明（重要）

- `004_rollback.sql` 仅在你仍保留 `*_backup_20260306` 两张备份表时可直接使用。
- 若已执行 `014_drop_backup_tables.sql`，请改用你导出的本地快照进行手动恢复。
