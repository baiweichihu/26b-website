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
  return String(email || '').trim().toLowerCase();
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

async function sendOtpMail({ mailtrapToken, senderEmail, senderName, toEmail, code }: any) {
  const subject = '26B 重置密码验证码';
  const text = `尊敬的用户，\n\n你的重置密码验证码为：${code}\n\n验证码 ${OTP_EXPIRE_MINUTES} 分钟内有效，请勿泄露给他人。\n\n如果这不是你的操作，请忽略此邮件。\n\n祝好，\n少26B网站管理团队`;

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
      category: 'password-reset-otp',
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
    const email = normalizeEmail(payload?.email);

    if (!email) {
      return new Response(JSON.stringify({ error: '邮箱不能为空' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (!profile?.id) {
      return new Response(JSON.stringify({ error: '账号不存在或尚未审批通过' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send') {
      const { data: lastOtp } = await adminClient
        .from('password_reset_email_otps')
        .select('created_at')
        .eq('email', email)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastOtp?.created_at) {
        const lastTime = new Date(lastOtp.created_at).getTime();
        if (Date.now() - lastTime < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
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
        .from('password_reset_email_otps')
        .delete()
        .eq('email', email)
        .is('consumed_at', null);

      const { error: insertError } = await adminClient.from('password_reset_email_otps').insert({
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

    if (action === 'verify_reset') {
      const code = String(payload?.otp || '').trim();
      const newPassword = String(payload?.newPassword || '');

      if (!/^\d{6}$/.test(code)) {
        return new Response(JSON.stringify({ error: '验证码格式无效，请输入6位数字' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return new Response(JSON.stringify({ error: '新密码长度至少 6 位' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: otpRow, error: otpError } = await adminClient
        .from('password_reset_email_otps')
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
          .from('password_reset_email_otps')
          .update({ attempts: (otpRow.attempts || 0) + 1 })
          .eq('id', otpRow.id);

        return new Response(JSON.stringify({ error: '验证码错误' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(profile.id, {
        password: newPassword,
      });

      if (resetError) {
        return new Response(JSON.stringify({ error: '重置密码失败', detail: resetError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await adminClient
        .from('password_reset_email_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', otpRow.id);

      return new Response(JSON.stringify({ success: true, message: '密码重置成功' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
