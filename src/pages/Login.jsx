import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoticeBox from '../components/widgets/NoticeBox';
import styles from './Wall.module.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">账号</p>
          <h1 className="scene-title">登录</h1>
          <p className="scene-subtitle">当前仅提供前端界面，功能暂未接入后端。</p>
        </div>

        <NoticeBox type="info" message="登录功能暂未开放。" />

        <form className="mt-4" style={{ maxWidth: '480px' }}>
          <div className="mb-3">
            <label className="form-label">邮箱</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="请输入邮箱"
              autoComplete="email"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="scene-button primary" disabled>
              登录
            </button>
            <button type="button" className="scene-button ghost" onClick={() => navigate(-1)}>
              返回
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default Login;
