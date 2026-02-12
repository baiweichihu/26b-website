import { supabase } from '../lib/supabase.js';
import { generateIdenticonAvatarUrl } from '../utils/avatarUtils.js';

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

    const updateProfileOnSignIn = async (user) => {
      if (!user?.id) return;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: user.email })
        .eq('id', user.id);
      if (profileError) {
        console.warn('Profile update on sign-in failed:', profileError);
      }
    };

    //password login
    if (loginType === 'password') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      await updateProfileOnSignIn(data?.user);
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
      await updateProfileOnSignIn(data?.user);
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
  const { data: existingProfiles, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .limit(1);
  if (existingProfileError) return { success: false, error: existingProfileError.message };
  if (existingProfiles?.length) {
    return { success: false, error: '用户已经存在，请登录' };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      data: {},
    },
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: `验证码已经发送至${email}` };
};

/**
 * send login otp
 * @param {string} email
 */
export const sendLoginOtp = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: `验证码已经发送至${email}` };
};

/**
 *  send password reset otp
 * @param {string} email
 */
export const sendPasswordResetOtp = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { success: false, error: error.message };
  return { success: true, message: `密码重置链接已经发送至${email}` };
};

/**
 * confirm password reset
 * @param {string} email
 * @param {string} otp
 * @param {string} newPassword
 */
export const resetPasswordConfirm = async (email, otp, newPassword) => {
  try {
    // verify otp
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });
    if (verifyError) throw verifyError;

    // update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;

    return { success: true, message: '密码重置成功' };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add register user profile
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.otp
 * @param {string} params.password
 * @param {string} params.nickname
 */
export const signUpVerifyAndSetInfo = async ({ email, otp, password, nickname }) => {
  try {
    // verify otp and set password
    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (verifyError) throw verifyError;

    const user = authData.user;
    if (password) {
      const { error: pwdError } = await supabase.auth.updateUser({
        password: password,
      });
      if (pwdError) throw pwdError;
    }

    const avatarUrl = generateIdenticonAvatarUrl(user?.id || email);

    // update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nickname: nickname, avatar_url: avatarUrl })
      .eq('id', user.id); // update the nickname of the user whose id is equal to the current user id

    if (profileError) throw profileError;

    return { success: true, data: authData };
  } catch (error) {
    console.error('SignUp error:', error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return { success: true };
};
// ================== END OF User Registration / Login / Password Reset / Logout ===========================

// ================== User Profile Management ===========================
/**
 * Submit guest identity upgrade request
 * @param {Object} params
 * @param {string} params.evidence
 * @param {string|null} params.nickname
 */
export const submitGuestIdentityUpgradeRequest = async ({ evidence, nickname }) => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('You are not signed in.');
    }

    const now = new Date().toISOString();
    const payload = {
      requester_id: user.id,
      request_type: 'upgrade_identity',
      target_id: null,
      evidence: JSON.stringify({
        message: evidence?.trim() || '',
        nickname: nickname || null,
      }),
      requested_permissions: null,
      status: 'pending',
      created_at: now,
    };

    const { error: insertError } = await supabase.from('admin_requests').insert(payload);

    if (insertError) {
      throw new Error(insertError.message || 'Failed to submit request.');
    }

    return { success: true };
  } catch (error) {
    console.error('Guest identity upgrade request error:', error);
    return { success: false, error: error.message };
  }
};
// ================== END OF User Profile Management ===========================
