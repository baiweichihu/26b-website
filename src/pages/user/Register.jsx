import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendRegisterOtp, signUpVerifyAndSetInfo } from '../../services/userService';
import NoticeBox from '../../components/widgets/NoticeBox';
import { useIrisTransition } from '../../components/ui/IrisTransition';
import styles from './Auth.module.css';
import RegisterHero from '../../components/features/user/RegisterHero';
import RegisterForm from '../../components/features/user/RegisterForm';

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

  const passwordTooShort = Boolean(formData.password) && formData.password.length < 6;

  const canSubmit = useMemo(() => {
    return (
      Boolean(formData.email.trim()) &&
      Boolean(formData.otp.trim()) &&
      Boolean(formData.password) &&
      !passwordTooShort &&
      Boolean(formData.confirmPassword) &&
      formData.password === formData.confirmPassword &&
      Boolean(formData.nickname.trim())
    );
  }, [formData, passwordTooShort]);

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
    if (passwordTooShort) {
      setNotice({ type: 'error', message: '密码长度至少需要 6 个字符。' });
      return;
    }
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
          <RegisterHero
            heroRef={heroRef}
            fromPath={fromPath}
            triggerIris={triggerIris}
            styles={styles}
          />

          <div className={styles.formCard} ref={formRef}>
            <div className={styles.formHeader} data-animate="form">
              <h2>创建账户</h2>
              <p>完成验证，解锁26B班全宇宙！</p>
            </div>

            {notice && <NoticeBox type={notice.type} message={notice.message} />}

            <RegisterForm
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleSendOtp={handleSendOtp}
              sendingOtp={sendingOtp}
              confirmPasswordMismatch={confirmPasswordMismatch}
              canSubmit={canSubmit}
              submitting={submitting}
              fromPath={fromPath}
              triggerIris={triggerIris}
              styles={styles}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
