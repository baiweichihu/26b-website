import React from 'react';
import { Link } from 'react-router-dom';

const RegisterHero = ({ heroRef, fromPath, triggerIris, styles }) => {
  return (
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
        <Link to="/" className="scene-button ghost" onClick={(event) => triggerIris?.(event, '/')}>
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
  );
};

export default RegisterHero;
