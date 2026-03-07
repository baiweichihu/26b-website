import { supabase, SUPABASE_KEY, SUPABASE_URL } from '../lib/supabase.js';

const callPublicEdgeFunction = async (functionName, payload) => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify(payload),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return {
      success: false,
      error: body?.error || `请求失败（${response.status}）`,
    };
  }

  if (body?.error) {
    return { success: false, error: body.error };
  }

  return { success: true, data: body };
};

const callRegisterOtpFunction = async (payload) => callPublicEdgeFunction('register-otp', payload);
const callPasswordResetOtpFunction = async (payload) =>
  callPublicEdgeFunction('password-reset-otp', payload);

// ================== User Registration / Login / Password Reset / Logout ===========================
/**
 * sign in (email + pwd/otp)
 * @param {Object} credentials
 * @param {string} [credentials.account] - email address
 * @param {string} [credentials.password] - password
 * @param {string} [credentials.otp]
 * @param {string} [credentials.loginType] - 'password' | 'otp'
 */
export const signIn = async ({ account, password, otp, loginType = 'password' }) => {
  try {
    let email = account;

    const ensureApprovedProfile = async (user) => {
      if (!user?.id) {
        throw new Error('账号异常，请重试');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message || '账号校验失败');
      }

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('账号尚未审批通过，请等待管理员处理');
      }
    };

    //password login
    if (loginType === 'password') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      await ensureApprovedProfile(data?.user);
      return { success: true, data };
    }
    //otp login
    else if (loginType === 'otp') {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      await ensureApprovedProfile(data?.user);
      return { success: true, data };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send register otp
 * @param {string} email
 */
export const sendRegisterOtp = async (email) => {
  const normalizedEmail = email?.trim();
  const result = await callRegisterOtpFunction({
    action: 'send',
    email: normalizedEmail,
  });
  if (!result.success) {
    return { success: false, error: result.error || '验证码发送失败' };
  }
  return { success: true, message: result.data?.message || `验证码已经发送至${email}` };
};

/**
 * send login otp
 * @param {string} email
 */
export const sendLoginOtp = async (email) => {
  const normalizedEmail = email?.trim();

  const { data: existingProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  if (!existingProfiles?.length) {
    return { success: false, error: '账号尚未审批通过，暂不可登录' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: `验证码已经发送至${normalizedEmail}` };
};

/**
 *  send password reset otp
 * @param {string} email
 */
export const sendPasswordResetOtp = async (email) => {
  const normalizedEmail = email?.trim();
  const result = await callPasswordResetOtpFunction({
    action: 'send',
    email: normalizedEmail,
  });
  if (!result.success) return { success: false, error: result.error || '验证码发送失败' };
  return { success: true, message: result.data?.message || `验证码已发送至${normalizedEmail}` };
};

/**
 * confirm password reset
 * @param {string} email
 * @param {string} otp
 * @param {string} newPassword
 */
export const resetPasswordConfirm = async (email, otp, newPassword) => {
  try {
    const result = await callPasswordResetOtpFunction({
      action: 'verify_reset',
      email: email?.trim(),
      otp: otp?.trim(),
      newPassword,
    });

    if (!result.success) throw new Error(result.error || '密码重置失败');

    return { success: true, message: '密码重置成功' };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify email OTP and submit register request
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.otp
 * @param {string} params.nickname
 * @param {string} params.reason
 */
export const submitRegisterRequest = async ({ email, otp, nickname, reason }) => {
  try {
    const normalizedEmail = email?.trim();

    const result = await callRegisterOtpFunction({
      action: 'verify_submit',
      email: normalizedEmail,
      otp: otp?.trim(),
      nickname: nickname?.trim(),
      reason: reason?.trim(),
    });

    if (!result.success) {
      throw new Error(result.error || '注册申请提交失败');
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Register request error:', error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    const message = error.message || '';
    if (!/auth session missing/i.test(message)) {
      throw error;
    }
  }
  return { success: true };
};

/**
 * Get current signed-in user
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { success: false, error: error.message };
  return { success: true, user: data?.user || null };
};

// ================== END OF User Registration / Login / Password Reset / Logout ===========================

// ================== User Profile Management ===========================
/**
 * Get current user's profile details
 */
export const getProfileDetails = async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You are not signed in.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nickname, bio, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load profile.');
    }

    return { success: true, profile };
  } catch (error) {
    console.error('Fetch profile error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update current user's profile fields
 * @param {Object} params
 * @param {string} params.nickname
 * @param {string} params.bio
 */
export const updateProfileDetails = async ({ nickname, bio }) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('You are not signed in.');
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ nickname, bio })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update profile.');
    }

    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message };
  }
};
// ================== END OF User Profile Management ===========================
