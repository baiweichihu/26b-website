import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoticeBox from '../components/widgets/NoticeBox';
import styles from './Wall.module.css';

const roleMap = {
  user: '普通用户',
  admin: '管理员',
  superuser: '超级管理员',
};

const identityMap = {
  guest: '游客',
  alumni: '校友',
  classmate: '本班同学',
};

const Profile = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@example.com');
  const [nickname, setNickname] = useState('匿名同学');
  const [bio, setBio] = useState('这里是一段自我介绍。');

  const identityType = 'guest';
  const role = 'user';
  const createdAt = '2024-01-01 10:00:00';

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">账号</p>
          <h1 className="scene-title">个人档案</h1>
          <p className="scene-subtitle">当前页面为前端示意，功能暂未接入后端。</p>
        </div>

        <NoticeBox type="info" message="资料修改、申请校友与注销功能暂未开放。" />

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '20px' }}>
          <div style={{ minWidth: '200px' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '18px',
                background:
                  'linear-gradient(135deg, rgba(255, 205, 142, 0.95), rgba(124, 197, 255, 0.9))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                color: '#132238',
                boxShadow: '0 12px 24px rgba(18, 32, 60, 0.15)',
              }}
            >
              {nickname.charAt(0)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div className="mb-3">
              <label className="form-label">邮箱</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">昵称</label>
              <input
                type="text"
                className="form-control"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Bio</label>
              <textarea
                className="form-control"
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
            <div className="mb-2" style={{ fontSize: '0.95rem', color: 'var(--muted-color)' }}>
              <div>身份类型: {identityMap[identityType] || identityType}</div>
              <div>角色权限: {roleMap[role] || role}</div>
              <div>创建时间: {createdAt}</div>
            </div>
            <div className="d-flex gap-2" style={{ marginTop: '12px', flexWrap: 'wrap' }}>
              <button type="button" className="scene-button primary" disabled>
                保存资料
              </button>
              <button type="button" className="scene-button ghost" disabled>
                申请成为校友
              </button>
              <button type="button" className="scene-button ghost" disabled>
                注销账户
              </button>
              <button type="button" className="scene-button ghost" onClick={() => navigate(-1)}>
                返回
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
