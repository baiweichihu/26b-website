import React from 'react';
import { Link } from 'react-router-dom';

const RegisterForm = ({
  formData,
  handleChange,
  handleSubmit,
  handleSendOtp,
  sendingOtp,
  confirmPasswordMismatch,
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
        <button type="submit" className="scene-button primary" disabled={!canSubmit || submitting}>
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
  );
};

export default RegisterForm;
