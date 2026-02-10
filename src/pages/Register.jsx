import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendRegisterOtp, signUpVerifyAndSetInfo } from '../services/userService';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';
import styles from './Auth.module.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const panelRef = useRef(null);
  const heroRef = useRef(null);
  const formRef = useRef(null);
  const glowRef = useRef(null);
  const glowSecondaryRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const location = useLocation();
  const navigate = useNavigate();
  const fromPath = useMemo(() => {
    const rawFrom = location.state?.from;
    if (!rawFrom) return '/';
    if (typeof rawFrom === 'string') return rawFrom;
    if (typeof rawFrom?.pathname === 'string') return rawFrom.pathname;
    return '/';
  }, [location.state]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const panel = panelRef.current;
    if (!gsap || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const heroItems = heroRef.current?.querySelectorAll('[data-animate="hero"]') || [];
      const formItems = formRef.current?.querySelectorAll('[data-animate="form"]') || [];

      gsap.from(panel, { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out' });
      gsap.from(heroItems, {
        opacity: 0,
        y: 18,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.1,
      });
      gsap.from(formItems, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.06,
        delay: 0.2,
      });

      if (glowRef.current) {
        gsap.to(glowRef.current, {
          x: 14,
          y: -10,
          duration: 6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }

      if (glowSecondaryRef.current) {
        gsap.to(glowSecondaryRef.current, {
          x: -16,
          y: 12,
          duration: 7,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }
    }, panel);

    return () => ctx.revert();
  }, []);

  const canSubmit = useMemo(() => {
    return (
      Boolean(formData.email.trim()) &&
      Boolean(formData.otp.trim()) &&
      Boolean(formData.password) &&
      Boolean(formData.confirmPassword) &&
      formData.password === formData.confirmPassword &&
      Boolean(formData.nickname.trim())
    );
  }, [formData]);

  const confirmPasswordMismatch =
    Boolean(formData.confirmPassword) && formData.password !== formData.confirmPassword;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    if (!formData.email.trim()) {
      setNotice({ type: 'error', message: 'Please enter your email first.' });
      return;
    }

    setSendingOtp(true);
    setNotice(null);
    const result = await sendRegisterOtp(formData.email.trim());
    if (result.success) {
      setNotice({ type: 'success', message: `OTP sent to ${formData.email.trim()}.` });
    } else {
      setNotice({ type: 'error', message: result.error || 'Failed to send OTP.' });
    }
    setSendingOtp(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (confirmPasswordMismatch) {
      setNotice({ type: 'error', message: '密码不匹配' });
      return;
    }
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setNotice(null);
    const result = await signUpVerifyAndSetInfo({
      email: formData.email.trim(),
      otp: formData.otp.trim(),
      password: formData.password,
      nickname: formData.nickname.trim(),
    });

    if (result.success) {
      setNotice({ type: 'success', message: '注册成功！您可以可返回首页' });
      setFormData({
        email: formData.email.trim(),
        otp: '',
        password: '',
        confirmPassword: '',
        nickname: '',
      });
      setSubmitting(false);
      if (triggerIris) {
        triggerIris(null, '/');
      } else {
        navigate('/');
      }
      return;
    } else {
      setNotice({ type: 'error', message: result.error || 'Registration failed.' });
    }
    setSubmitting(false);
  };

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
        <div className={styles.glow} ref={glowRef} aria-hidden="true" />
        <div className={styles.glowSecondary} ref={glowSecondaryRef} aria-hidden="true" />
        <div className={styles.authLayout}>
          <div className={styles.hero} ref={heroRef}>
            <p className="scene-kicker" data-animate="hero">
              注册账户
            </p>
            <h1 className="scene-title" data-animate="hero">
              加入26B班专属档案
            </h1>
            <p className="scene-subtitle" data-animate="hero">
              验证邮箱，解锁班级墙/班日志！
            </p>
            <div className={styles.heroBadges} data-animate="hero">
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeTitle}>Stay connected！</span>
                <p className={styles.heroBadgeText}>不要错过26B班的新动态！</p>
              </div>
            </div>
            <div className="scene-actions" data-animate="hero">
              <Link
                to="/"
                className="scene-button ghost"
                onClick={(event) => triggerIris?.(event, '/')}
              >
                <i className="fas fa-house"></i>
                返回首页
              </Link>
              <Link
                to="/login"
                className="scene-button primary"
                state={{ from: fromPath }}
                onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
              >
                <i className="fas fa-arrow-right-to-bracket"></i>
                转至登录页
              </Link>
            </div>
          </div>

          <div className={styles.formCard} ref={formRef}>
            <div className={styles.formHeader} data-animate="form">
              <h2>创建账户</h2>
              <p>完成验证，解锁26B班全宇宙！</p>
            </div>

            {notice && <NoticeBox type={notice.type} message={notice.message} />}

            <form onSubmit={handleSubmit}>
              <div className={styles.sectionTitle} data-animate="form">
                第一步 · 验证邮箱
              </div>

              <div className={styles.field} data-animate="form">
                <label className="form-label" htmlFor="register-email">
                  Email
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className={styles.field} data-animate="form">
                <div className={styles.otpRow}>
                  <div>
                    <label className="form-label" htmlFor="register-otp">
                      验证码
                    </label>
                    <input
                      id="register-otp"
                      name="otp"
                      type="text"
                      className="form-control"
                      value={formData.otp}
                      onChange={handleChange}
                      autoComplete="one-time-code"
                      placeholder="8位验证码"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className={`scene-button ghost ${styles.compactButton}`}
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? '发送中...' : '发送验证码'}
                  </button>
                </div>
                <span className={styles.helperText}>我们会向您的邮箱发送验证码</span>
              </div>

              <div className={styles.divider} data-animate="form" />

              <div className={styles.sectionTitle} data-animate="form">
                第二步 · 取一个昵称吧
              </div>

              <div className={styles.field} data-animate="form">
                <label className="form-label" htmlFor="register-nickname">
                  昵称
                </label>
                <input
                  id="register-nickname"
                  name="nickname"
                  type="text"
                  className="form-control"
                  value={formData.nickname}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder="请问先生如何称呼"
                  required
                />
              </div>

              <div className={styles.field} data-animate="form">
                <label className="form-label" htmlFor="register-password">
                  密码
                </label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="设置密码"
                  required
                />
              </div>

              <div className={styles.field} data-animate="form">
                <label className="form-label" htmlFor="register-confirm-password">
                  确认密码
                </label>
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  className={`form-control ${confirmPasswordMismatch ? styles.inputError : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="重新输入密码"
                  aria-invalid={confirmPasswordMismatch}
                  required
                />
                {confirmPasswordMismatch && <span className={styles.helperText}>密码输错了哦</span>}
              </div>

              <div className={styles.formActions} data-animate="form">
                <button
                  type="submit"
                  className="scene-button primary"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? '创建中...' : '创建账户'}
                </button>
                <Link
                  to="/login"
                  className={styles.altLink}
                  state={{ from: fromPath }}
                  onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
                >
                  已有账户？请登录
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
