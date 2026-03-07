-- 013_password_reset_email_otp.sql
-- Custom 6-digit email OTP storage for password reset flow

begin;

create table if not exists public.password_reset_email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_otps_email_created
  on public.password_reset_email_otps(email, created_at desc);

create index if not exists idx_password_reset_otps_email_expires
  on public.password_reset_email_otps(email, expires_at);

alter table public.password_reset_email_otps enable row level security;
revoke all on public.password_reset_email_otps from anon, authenticated;

commit;
