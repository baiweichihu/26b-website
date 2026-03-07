import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCurrentUser,
  resetPasswordConfirm,
  sendPasswordResetOtp,
} from '../../services/userService';
import NoticeBox from '../../components/widgets/NoticeBox';
import { useIrisTransition } from '../../components/ui/IrisTransition';
import styles from './Auth.module.css';

const PASSWORD_MIN_LENGTH = 6;

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    otp: '',
  });
  const [email, setEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState(null);

  const panelRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const result = await getCurrentUser();
      if (!result.success || !result.user) {
        navigate('/login', { replace: true });
        return;
      }
      setEmail(result.user.email || '');
      setLoadingUser(false);
    };

    loadUser();
  }, [navigate]);

  const confirmPasswordMismatch =
    Boolean(formData.confirmPassword) && formData.newPassword !== formData.confirmPassword;
  const newPasswordTooShort =
    Boolean(formData.newPassword) && formData.newPassword.length < PASSWORD_MIN_LENGTH;

  const canSendOtp = useMemo(() => {
    return Boolean(email);
  }, [email]);

  const canSubmit = useMemo(() => {
    return (
      otpSent &&
      formData.otp.trim().length === 6 &&
      formData.newPassword.length >= PASSWORD_MIN_LENGTH &&
      Boolean(formData.confirmPassword) &&
      !confirmPasswordMismatch
    );
  }, [confirmPasswordMismatch, formData.confirmPassword, formData.newPassword, formData.otp, otpSent]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    if (!email) {
      setNotice({ type: 'error', message: 'Email unavailable. Please sign in again.' });
      return;
    }

    try {
      setSendingOtp(true);
      setNotice(null);

      const otpResult = await sendPasswordResetOtp(email);
      if (!otpResult.success) {
        throw new Error(otpResult.error || 'Failed to send reset code.');
      }

      setOtpSent(true);
      setNotice({ type: 'success', message: otpResult.message || 'Reset code sent.' });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to send reset code.' });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setNotice(null);
      const result = await resetPasswordConfirm(email, formData.otp.trim(), formData.newPassword);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reset password.');
      }
      navigate('/login', { replace: true });
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to reset password.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
          <p className="scene-kicker">我的账户</p>
          <h1 className="scene-title">加载中...</h1>
          <p className="scene-subtitle">请稍等，正在加载您的个人信息...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.glowSecondary} aria-hidden="true" />
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>重置密码</h2>
            <p>先验证邮箱，再设置新密码</p>
          </div>

          {notice && <NoticeBox type={notice.type} message={notice.message} />}

          <form onSubmit={handleResetPassword}>
            <div className={styles.sectionTitle}>第一步 · 验证邮箱</div>
            <div className={styles.field}>
              <div className={styles.otpRow}>
                <div>
                  <label className="form-label" htmlFor="reset-otp">
                    6位验证码
                  </label>
                  <input
                    id="reset-otp"
                    name="otp"
                    type="text"
                    className="form-control"
                    value={formData.otp}
                    onChange={handleChange}
                    autoComplete="one-time-code"
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="button"
                  className={`scene-button ghost ${styles.compactButton}`}
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !canSendOtp}
                >
                  {sendingOtp ? '发送中...' : '发送验证码'}
                </button>
              </div>
              <span className={styles.helperText}>
                我们会向 {email || '您的邮箱'} 发送6位验证码（10分钟有效），请注意在您的（垃圾）邮件中查收
              </span>
            </div>

            <div className={styles.sectionTitle}>第二步 · 输入新密码</div>
            <div className={styles.field}>
              <label className="form-label" htmlFor="new-password">
                新密码
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                className={`form-control ${newPasswordTooShort ? styles.inputError : ''}`}
                value={formData.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                aria-invalid={newPasswordTooShort}
                required
              />
              <span className={styles.helperText}>密码长度至少 {PASSWORD_MIN_LENGTH} 位</span>
              {newPasswordTooShort && (
                <span className={styles.helperText}>新密码长度不足 {PASSWORD_MIN_LENGTH} 位</span>
              )}
            </div>
            <div className={styles.field}>
              <label className="form-label" htmlFor="confirm-password">
                确认新密码
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                className={`form-control ${confirmPasswordMismatch ? styles.inputError : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                aria-invalid={confirmPasswordMismatch}
                required
              />
              {confirmPasswordMismatch && <span className={styles.helperText}>密码输错了哦</span>}
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className="scene-button primary"
                disabled={!canSubmit || submitting}
              >
                {submitting ? '重置中...' : '确认重置密码'}
              </button>
              <Link
                to="/user/manage"
                className={styles.altLink}
                onClick={(event) => triggerIris?.(event, '/user/manage')}
              >
                返回账户页
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ResetPassword;
