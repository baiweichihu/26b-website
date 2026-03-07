// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OTP_EXPIRE_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function generateSixDigitOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateTempPassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => chars[value % chars.length]).join('');
}

async function sendOtpMail({ mailtrapToken, senderEmail, senderName, toEmail, code }: any) {
  const subject = '26B 注册验证码';
  const text = `尊敬的申请人，\n\n你的注册验证码为：${code}\n\n验证码 ${OTP_EXPIRE_MINUTES} 分钟内有效，请勿泄露给他人。\n\n如果这不是你的操作，请忽略此邮件。\n\n祝好，\n少26B网站管理团队`;

  const mailResp = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mailtrapToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email: toEmail }],
      subject,
      text,
      category: 'register-otp',
    }),
  });

  if (!mailResp.ok) {
    const detail = await mailResp.text();
    throw new Error(`Mailtrap send failed: ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const mailtrapToken = Deno.env.get('MAILTRAP_API_TOKEN') || '';
    const senderEmail = Deno.env.get('MAILTRAP_SENDER_EMAIL') || 'hello@demomailtrap.co';
    const senderName = Deno.env.get('MAILTRAP_SENDER_NAME') || '26B Website Team';

    if (!supabaseUrl || !serviceRoleKey || !mailtrapToken || !senderEmail) {
      return new Response(JSON.stringify({ error: 'Missing required server secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const action = payload?.action;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'send') {
      const email = normalizeEmail(payload?.email);
      if (!email) {
        return new Response(JSON.stringify({ error: '邮箱不能为空' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pendingRequests } = await adminClient
        .from('register_requests')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .limit(1);
      if (pendingRequests?.length) {
        return new Response(JSON.stringify({ error: '该邮箱已有待审核申请，请勿重复提交' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existingProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (existingProfiles?.length) {
        return new Response(JSON.stringify({ error: '用户已经存在，请直接登录' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: lastOtp } = await adminClient
        .from('register_email_otps')
        .select('created_at')
        .eq('email', email)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastOtp?.created_at) {
        const lastTime = new Date(lastOtp.created_at).getTime();
        const now = Date.now();
        if (now - lastTime < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
          return new Response(JSON.stringify({ error: `发送过于频繁，请 ${OTP_RESEND_COOLDOWN_SECONDS} 秒后重试` }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const code = generateSixDigitOtp();
      const codeHash = await sha256Hex(`${email}:${code}`);
      const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000).toISOString();

      await adminClient
        .from('register_email_otps')
        .delete()
        .eq('email', email)
        .is('consumed_at', null);

      const { error: insertError } = await adminClient.from('register_email_otps').insert({
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message || '验证码保存失败' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        await sendOtpMail({ mailtrapToken, senderEmail, senderName, toEmail: email, code });
      } catch (mailError) {
        return new Response(
          JSON.stringify({
            error: '验证码发送失败',
            detail: mailError instanceof Error ? mailError.message : String(mailError),
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(JSON.stringify({ success: true, message: `验证码已发送至 ${email}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify_submit') {
      const email = normalizeEmail(payload?.email);
      const code = String(payload?.otp || '').trim();
      const nickname = String(payload?.nickname || '').trim();
      const reason = String(payload?.reason || '').trim();

      if (!email || !code || !nickname || !reason) {
        return new Response(JSON.stringify({ error: '缺少必要参数' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: '验证码格式无效，请输入6位数字' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: otpRow, error: otpError } = await adminClient
        .from('register_email_otps')
        .select('id, code_hash, expires_at, attempts')
        .eq('email', email)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError || !otpRow) {
        return new Response(JSON.stringify({ error: '验证码不存在或已失效' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(otpRow.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: '验证码已过期，请重新发送' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const codeHash = await sha256Hex(`${email}:${code}`);
      if (codeHash !== otpRow.code_hash) {
        await adminClient
          .from('register_email_otps')
          .update({ attempts: (otpRow.attempts || 0) + 1 })
          .eq('id', otpRow.id);

        return new Response(JSON.stringify({ error: '验证码错误' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pendingRequests } = await adminClient
        .from('register_requests')
        .select('id')
        .eq('email', email)
        .eq('status', 'pending')
        .limit(1);
      if (pendingRequests?.length) {
        return new Response(JSON.stringify({ error: '该邮箱已有待审核申请，请勿重复提交' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existingProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (existingProfiles?.length) {
        return new Response(JSON.stringify({ error: '用户已经存在，请直接登录' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tempPassword = generateTempPassword();
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (createUserError || !createdUser?.user?.id) {
        return new Response(
          JSON.stringify({ error: createUserError?.message || '创建账号失败，请稍后重试' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: insertRequestError } = await adminClient.from('register_requests').insert({
        auth_user_id: createdUser.user.id,
        email,
        nickname,
        reason,
        status: 'pending',
      });

      if (insertRequestError) {
        await adminClient.auth.admin.deleteUser(createdUser.user.id);
        return new Response(JSON.stringify({ error: insertRequestError.message || '提交申请失败' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await adminClient
        .from('register_email_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', otpRow.id);

      return new Response(
        JSON.stringify({ success: true, message: '注册申请已提交，请等待 superuser 审核' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        detail: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
