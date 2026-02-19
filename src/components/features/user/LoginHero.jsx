import React from 'react';
import { Link } from 'react-router-dom';

const LoginHero = ({ heroRef, fromPath, triggerIris, styles }) => {
  return (
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
        <Link to="/" className="scene-button ghost" onClick={(event) => triggerIris?.(event, '/')}>
          <i className="fas fa-house"></i>
          返回首页
        </Link>
        <Link
          to="/register"
          className="scene-button primary"
          state={{ from: fromPath }}
          onClick={(event) => triggerIris?.(event, '/register', { state: { from: fromPath } })}
        >
          <i className="fas fa-user-plus"></i>
          前往注册
        </Link>
      </div>
    </div>
  );
};

export default LoginHero;
