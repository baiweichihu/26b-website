// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function renderApprovedEmail(applicantName: string, initialPassword: string) {
  return {
    subject: '关于账号注册申请的通知',
    text: `尊敬的${applicantName}，

感谢您申请注册账号。我们很高兴通知您，您的申请已通过审核！您现在已经可以登录账号。

初始密码：${initialPassword}

为保障账号安全，请首次登录后尽快修改密码。

如在登录或使用过程中遇到任何问题，欢迎随时联系我们。

祝好，
少26B网站管理团队`,
  };
}

function renderRejectedEmail(applicantName: string, rejectReason: string) {
  const reasonBlock = rejectReason?.trim() ? `拒绝原因：${rejectReason.trim()}\n\n` : '';

  return {
    subject: '关于账号注册申请的回复',
    text: `尊敬的${applicantName}，

感谢您申请注册账号。我们仔细审核了您的申请，但很遗憾未能通过。
${reasonBlock}如果您有任何疑问，或希望补充材料后重新申请，请随时联系我们。

祝好，
少26B网站管理团队`,
  };
}

type Payload = {
  status: 'approved' | 'rejected';
  toEmail: string;
  applicantName?: string;
  rejectReason?: string;
  authUserId?: string;
};

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (value) => chars[value % chars.length]).join('');
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

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const actorUserId = decodeJwtSub(jwt);
    if (!actorUserId) {
      return new Response(JSON.stringify({ error: 'Invalid user token payload' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', actorUserId)
      .single();

    if (profileError || !profile || profile.role !== 'superuser') {
      return new Response(JSON.stringify({ error: 'Forbidden: superuser only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as Payload;
    const status = payload?.status;
    const toEmail = payload?.toEmail?.trim();
    const applicantName = payload?.applicantName?.trim() || '申请人';
    const rejectReason = payload?.rejectReason?.trim() || '';
    const authUserId = payload?.authUserId?.trim() || '';

    if (!status || !['approved', 'rejected'].includes(status) || !toEmail) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let initialPassword = '';

    if (status === 'approved') {
      if (!authUserId) {
        return new Response(JSON.stringify({ error: 'approved 模式缺少 authUserId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      initialPassword = generateRandomPassword(8);
      const { error: updatePasswordError } = await adminClient.auth.admin.updateUserById(authUserId, {
        password: initialPassword,
      });

      if (updatePasswordError) {
        return new Response(
          JSON.stringify({ error: '设置初始密码失败', detail: updatePasswordError.message }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const content =
      status === 'approved'
        ? renderApprovedEmail(applicantName, initialPassword)
        : renderRejectedEmail(applicantName, rejectReason);

    try {
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
          subject: content.subject,
          text: content.text,
          category: status === 'approved' ? 'register-approved' : 'register-rejected',
        }),
      });

      if (!mailResp.ok) {
        const detail = await mailResp.text();
        return new Response(JSON.stringify({ error: 'Mailtrap send failed', detail }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (mailError) {
      const detail = mailError instanceof Error ? mailError.message : String(mailError);
      return new Response(
        JSON.stringify({
          error: 'Mailtrap send failed',
          detail,
          hint: '请检查 Mailtrap API Token 与测试发件邮箱配置。',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (status === 'rejected' && authUserId) {
      if (authUserId === actorUserId) {
        return new Response(JSON.stringify({ error: '安全限制：不能删除当前登录 superuser 账号' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', authUserId)
        .maybeSingle();

      if (targetProfile?.role === 'admin' || targetProfile?.role === 'superuser') {
        return new Response(JSON.stringify({ error: '安全限制：目标账号为管理员角色，拒绝自动删除' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await adminClient.from('profiles').delete().eq('id', authUserId);
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUserId);
      if (deleteAuthError) {
        return new Response(
          JSON.stringify({ error: '删除 auth 用户失败', detail: deleteAuthError.message }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
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
