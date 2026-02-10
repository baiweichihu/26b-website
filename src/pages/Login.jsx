import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendLoginOtp, signIn } from '../services/userService';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';
import styles from './Auth.module.css';

const Login = () => {
  const [loginType, setLoginType] = useState('password');
  const [formData, setFormData] = useState({ account: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const panelRef = useRef(null);
  const heroRef = useRef(null);
  const formRef = useRef(null);
  const glowRef = useRef(null);
  const glowSecondaryRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleLoginTypeChange = (nextType) => {
    setNotice(null);
    setLoginType(nextType);
    setFormData((prev) => ({
      ...prev,
      password: nextType === 'password' ? prev.password : '',
      otp: nextType === 'otp' ? prev.otp : '',
    }));
  };

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
          x: 18,
          y: -12,
          duration: 6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }

      if (glowSecondaryRef.current) {
        gsap.to(glowSecondaryRef.current, {
          x: -12,
          y: 16,
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
    if (!formData.account.trim()) return false;
    if (loginType === 'password') {
      return Boolean(formData.password);
    }
    return Boolean(formData.otp);
  }, [formData, loginType]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async () => {
    if (!formData.account.trim()) {
      setNotice({ type: 'error', message: 'Please enter your email first.' });
      return;
    }

    setOtpSending(true);
    setNotice(null);
    const result = await sendLoginOtp(formData.account.trim());
    if (result.success) {
      setNotice({ type: 'success', message: `OTP sent to ${formData.account.trim()}.` });
    } else {
      setNotice({ type: 'error', message: result.error || 'Failed to send OTP.' });
    }
    setOtpSending(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setNotice(null);
    const result = await signIn({
      account: formData.account.trim(),
      password: formData.password,
      otp: formData.otp,
      loginType,
    });

    if (result.success) {
      setNotice({ type: 'success', message: '登录成功！' });
    } else {
      setNotice({ type: 'error', message: result.error || '登录失败！' });
    }
    if (result.success) {
      const safeTarget = fromPath === '/login' || fromPath === '/register' ? '/' : fromPath || '/';
      navigate(safeTarget, { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
        <div className={styles.glow} ref={glowRef} aria-hidden="true" />
        <div className={styles.glowSecondary} ref={glowSecondaryRef} aria-hidden="true" />
        <div className={styles.authLayout}>
          <div className={styles.hero} ref={heroRef}>
            <p className="scene-kicker" data-animate="hero">
              登录
            </p>
            <h1 className="scene-title" data-animate="hero">
              欢迎回家！
            </h1>
            <p className="scene-subtitle" data-animate="hero">
              登录并验证身份，解锁26B班的专属回忆
            </p>
            <div className={styles.heroBadges} data-animate="hero">
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeTitle}>登录/注册账号</span>
                <p className={styles.heroBadgeText}>解锁班级墙公开内容</p>
              </div>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeTitle}>验证校友身份</span>
                <p className={styles.heroBadgeText}>解锁班日志与班级墙校友可见内容</p>
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
                to="/register"
                className="scene-button primary"
                state={{ from: fromPath }}
                onClick={(event) =>
                  triggerIris?.(event, '/register', { state: { from: fromPath } })
                }
              >
                <i className="fas fa-user-plus"></i>
                前往注册
              </Link>
            </div>
          </div>

          <div className={styles.formCard} ref={formRef}>
            <div className={styles.formHeader} data-animate="form">
              <h2>请登录</h2>
              <p>可以用邮箱+密码/验证码登录哦</p>
            </div>

            {notice && <NoticeBox type={notice.type} message={notice.message} />}

            <div className={styles.modeToggle} data-animate="form">
              <button
                type="button"
                className={`${styles.modeButton} ${
                  loginType === 'password' ? styles.modeButtonActive : ''
                }`}
                aria-pressed={loginType === 'password'}
                onClick={() => handleLoginTypeChange('password')}
              >
                密码登录
              </button>
              <button
                type="button"
                className={`${styles.modeButton} ${
                  loginType === 'otp' ? styles.modeButtonActive : ''
                }`}
                aria-pressed={loginType === 'otp'}
                onClick={() => handleLoginTypeChange('otp')}
              >
                验证码登录
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.field} data-animate="form">
                <label className="form-label" htmlFor="login-email">
                  邮箱
                </label>
                <input
                  id="login-email"
                  name="account"
                  type="email"
                  className="form-control"
                  value={formData.account}
                  onChange={handleChange}
                  autoComplete="email"
                  placeholder="name@example.com"
                  required
                />
              </div>

              {loginType === 'password' ? (
                <div className={styles.field} data-animate="form">
                  <label className="form-label" htmlFor="login-password">
                    密码
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    required
                  />
                </div>
              ) : (
                <div className={styles.field} data-animate="form">
                  <div className={styles.otpRow}>
                    <div>
                      <label className="form-label" htmlFor="login-otp">
                        验证码
                      </label>
                      <input
                        id="login-otp"
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
                      disabled={otpSending}
                    >
                      {otpSending ? '发送中...' : '发送验证码'}
                    </button>
                  </div>
                  <span className={styles.helperText}>我们会向你的邮箱发送6位验证码</span>
                </div>
              )}

              <div className={styles.formActions} data-animate="form">
                <button
                  type="submit"
                  className="scene-button primary"
                  disabled={!canSubmit || loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <Link
                  to="/register"
                  className={styles.altLink}
                  state={{ from: fromPath }}
                  onClick={(event) =>
                    triggerIris?.(event, '/register', { state: { from: fromPath } })
                  }
                >
                  还没有账户？点击注册
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
