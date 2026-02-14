import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';
import styles from './UserManagement.module.css';

const identityLabels = {
  classmate: '本班同学',
  alumni: '校友',
  guest: '游客',
};

const roleLabels = {
  admin: '管理员',
  superuser: '超级管理员',
};

const UserManagement = () => {
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState(null);
  const panelRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setStatus('anonymous');
        setProfile(null);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname, avatar_url, identity_type, role, email, created_at')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setStatus('anonymous');
        setProfile(null);
        return;
      }

      setProfile(profileData);

      if (profileData.role === 'admin' || profileData.role === 'superuser') {
        setStatus('member');
        return;
      }

      if (profileData.identity_type === 'guest') {
        setStatus('guest');
        return;
      }

      setStatus('member');
    } catch (error) {
      console.error('UserManagement load error:', error);
      setStatus('anonymous');
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const panel = panelRef.current;
    if (!gsap || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const items = panel.querySelectorAll('[data-animate="item"]');
      gsap.from(panel, { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' });
      gsap.from(items, {
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.1,
      });
    }, panel);

    return () => ctx.revert();
  }, []);

  const handleSignOut = async () => {
    try {
      setNotice(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setNotice({ type: 'success', message: '已退出登录。' });
      setStatus('anonymous');
      setProfile(null);
      navigate('/');
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '退出失败。' });
    }
  };

  const handleResetPasswordNav = (event) => {
    if (triggerIris) {
      triggerIris(event, '/user/reset-password');
    } else {
      navigate('/user/reset-password');
    }
  };

  const displayName = useMemo(() => {
    if (status === 'anonymous') return '访客';
    return profile?.nickname || profile?.email || 'User';
  }, [profile, status]);

  const displayRole = useMemo(() => {
    if (status === 'anonymous') return '未登录';
    if (profile?.role && roleLabels[profile.role]) return roleLabels[profile.role];
    if (profile?.identity_type && identityLabels[profile.identity_type]) {
      return identityLabels[profile.identity_type];
    }
    return '成员';
  }, [profile, status]);

  const avatarText = displayName ? displayName.charAt(0) : 'U';

  if (status === 'loading') {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.managePanel}`} ref={panelRef}>
          <div className={styles.manageHeader}>
            <p className="scene-kicker">用户中心</p>
            <h1 className="scene-title">加载中...</h1>
            <p className="scene-subtitle">正在读取你的账号信息。</p>
          </div>
        </section>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.managePanel}`} ref={panelRef}>
          <div className={styles.manageHeader} data-animate="item">
            <p className="scene-kicker">用户中心</p>
            <h1 className="scene-title">需要登录</h1>
            <p className="scene-subtitle">请先登录以管理你的账号。</p>
          </div>
          <div className="scene-actions" data-animate="item">
            <Link
              to="/login"
              className="scene-button primary"
              state={{ from: fromPath }}
              onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
            >
              登录
            </Link>
            <Link
              to="/register"
              className="scene-button ghost"
              state={{ from: fromPath }}
              onClick={(event) => triggerIris?.(event, '/register', { state: { from: fromPath } })}
            >
              注册
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.managePanel}`} ref={panelRef}>
        <div className={styles.manageHeader} data-animate="item">
          <p className="scene-kicker">用户中心</p>
          <h1 className="scene-title">账号管理</h1>
          <p className="scene-subtitle">查看你的身份信息并管理访问权限。</p>
        </div>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        <div className={styles.manageGrid}>
          <div className={styles.card} data-animate="item">
            <div className={styles.profileRow}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className={styles.profileAvatarImg}
                />
              ) : (
                <span className={styles.profileAvatar}>{avatarText}</span>
              )}
              <div>
                <div className={styles.profileName}>{displayName}</div>
                <div className={styles.profileMeta}>{displayRole}</div>
              </div>
            </div>
            <p className={styles.sectionTitle}>账户信息</p>
            <ul className={styles.metaList}>
              <li className={styles.metaItem}>
                <span>邮箱</span>
                <span>{profile?.email || '—'}</span>
              </li>
              <li className={styles.metaItem}>
                <span>身份类型</span>
                <span>{identityLabels[profile?.identity_type] || '—'}</span>
              </li>
              <li className={styles.metaItem}>
                <span>角色</span>
                <span>{roleLabels[profile?.role] || '普通用户'}</span>
              </li>
              <li className={styles.metaItem}>
                <span>密码</span>
                <span className={styles.passwordAction}>
                  <span className={styles.passwordDots}>........</span>
                  <button
                    type="button"
                    className={styles.passwordButton}
                    onClick={handleResetPasswordNav}
                  >
                    重置密码
                  </button>
                </span>
              </li>
            </ul>
          </div>

          <div className={styles.card} data-animate="item">
            <p className={styles.sectionTitle}>管理选项</p>
            <div className={styles.actionList}>
              {status === 'guest' && (
                <Link
                  to="/guest-update-identity"
                  className={styles.actionItem}
                  onClick={(event) => triggerIris?.(event, '/guest-update-identity')}
                >
                  <span>升级身份</span>
                  <span className={styles.actionMeta}>Upgrade</span>
                </Link>
              )}
              <button
                type="button"
                className={`${styles.actionItem} ${styles.actionButton}`}
                onClick={handleSignOut}
              >
                <span>退出登录</span>
                <span className={styles.actionMeta}>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserManagement;
