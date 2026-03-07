import React from 'react';
import { Link } from 'react-router-dom';

const RegisterForm = ({
  formData,
  handleChange,
  handleSubmit,
  handleSendOtp,
  sendingOtp,
  canSubmit,
  submitting,
  fromPath,
  triggerIris,
  styles,
}) => {
  return (
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
              placeholder="6位验证码"
              maxLength={6}
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
        <span className={styles.helperText}>我们会向您的邮箱发送 6 位验证码（10 分钟有效），请注意查看垃圾邮件箱</span>
      </div>

      <div className={styles.divider} data-animate="form" />

      <div className={styles.sectionTitle} data-animate="form">
        第二步 · 提交注册申请
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
        <label className="form-label" htmlFor="register-reason">
          申请说明
        </label>
        <textarea
          id="register-reason"
          name="reason"
          className="form-control"
          value={formData.reason}
          onChange={handleChange}
          placeholder="请简要说明你的身份和申请理由"
          rows={4}
          required
        />
      </div>

      <div className={styles.formActions} data-animate="form">
        <button type="submit" className="scene-button primary" disabled={!canSubmit || submitting}>
          {submitting ? '提交中...' : '提交申请'}
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
  );
};

export default RegisterForm;
