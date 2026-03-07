import { supabase, SUPABASE_KEY, SUPABASE_URL } from '../lib/supabase.js';

export async function callRegisterEmailFunction(payload) {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  let accessToken = session?.access_token;
  if (!accessToken) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      return { error: `登录态已过期，无法发送邮件：${refreshError.message}` };
    }
    accessToken = refreshed?.session?.access_token;
  }

  if (!accessToken) {
    return { error: '登录态无效，无法发送邮件，请重新登录后重试' };
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-register-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      error: `Edge Function 调用失败（${response.status}）：${detail}`,
    };
  }

  return { error: null };
}
