import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useIrisTransition } from '../ui/IrisTransition';
import styles from './UserDock.module.css';

const identityLabels = {
  classmate: '本班同学',
  alumni: '校友',
  guest: '游客',
};

const roleLabels = {
  admin: '管理员',
  superuser: '超级管理员',
};

const UserDock = () => {
  const [openKey, setOpenKey] = useState(null);
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const dockRef = useRef(null);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const location = useLocation();
  const baseUrl = import.meta.env.BASE_URL || '/';

  const fromPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;
  const open = openKey === location.key;

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
        .select('nickname, avatar_url, identity_type, role, email')
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
      console.error('UserDock load error:', error);
      setStatus('anonymous');
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [loadProfile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!open) return;
      const panel = panelRef.current;
      const button = buttonRef.current;
      if (panel && panel.contains(event.target)) return;
      if (button && button.contains(event.target)) return;
      setOpenKey(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const dock = dockRef.current;
    if (!gsap || !dock || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from(dock, { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' });
    }, dock);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const gsap = window.gsap;
    if (!panel) return;

    if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panel.style.display = open ? 'block' : 'none';
      panel.style.height = '';
      return;
    }

    gsap.killTweensOf(panel);
    if (open) {
      panel.style.display = 'block';
      const fullHeight = panel.scrollHeight;
      gsap.fromTo(
        panel,
        { height: 0, opacity: 0, y: -8 },
        {
          height: fullHeight,
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          onComplete: () => {
            panel.style.height = 'auto';
          },
        }
      );
    } else {
      gsap.to(panel, {
        height: 0,
        opacity: 0,
        y: -6,
        duration: 0.25,
        ease: 'power2.inOut',
        onComplete: () => {
          panel.style.display = 'none';
          panel.style.height = '';
        },
      });
    }
  }, [open]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setOpenKey(null);
      window.location.assign(`${baseUrl}`);
    } catch (error) {
      console.error('UserDock sign out error:', error);
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

  return (
    <div className={styles.dockWrap} ref={dockRef}>
      <div className={styles.dockInner}>
        <button
          type="button"
          className={styles.userButton}
          onClick={() => setOpenKey((prev) => (prev === location.key ? null : location.key))}
          aria-expanded={open}
          ref={buttonRef}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatar}>{avatarText}</span>
          )}
          <span className={styles.userMeta}>
            <span className={styles.userName}>{displayName}</span>
          </span>
          <i
            className={`fas fa-chevron-down ${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            aria-hidden="true"
          ></i>
        </button>

        <div className={styles.panel} ref={panelRef}>
          <div className={styles.panelHeader}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className={styles.panelAvatarImg} />
            ) : (
              <span className={styles.panelAvatar}>{avatarText}</span>
            )}
            <div>
              <div className={styles.panelName}>{displayName}</div>
              <div className={styles.panelSub}>{displayRole}</div>
            </div>
          </div>

          <div className={styles.panelDivider} />

          <div className={styles.panelList}>
            {status === 'anonymous' ? (
              <>
                <Link
                  to="/login"
                  className={styles.panelItem}
                  state={{ from: fromPath }}
                  onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
                >
                  <span>登录账号</span>
                  <span className={styles.panelMeta}>Sign in</span>
                </Link>
                <Link
                  to="/register"
                  className={`${styles.panelItem} ${styles.panelItemGhost}`}
                  state={{ from: fromPath }}
                  onClick={(event) =>
                    triggerIris?.(event, '/register', { state: { from: fromPath } })
                  }
                >
                  <span>注册账号</span>
                  <span className={styles.panelMeta}>Register</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/user/manage"
                  className={styles.panelItem}
                  onClick={(event) => triggerIris?.(event, '/user/manage')}
                >
                  <span>用户管理</span>
                  <span className={styles.panelMeta}>Center</span>
                </Link>
                {(profile?.role === 'admin' || profile?.role === 'superuser') && (
                  <Link
                    to="/admin/dashboard"
                    className={styles.panelItem}
                    onClick={(event) => triggerIris?.(event, '/admin/dashboard')}
                  >
                    <span>{profile?.role === 'superuser' ? '管理面板' : '管理员面板'}</span>
                    <span className={styles.panelMeta}>Admin</span>
                  </Link>
                )}
                {status === 'guest' && (
                  <Link
                    to="/guest-update-identity"
                    className={`${styles.panelItem} ${styles.panelItemGhost}`}
                    onClick={(event) => triggerIris?.(event, '/guest-update-identity')}
                  >
                    <span>验证校友身份</span>
                    <span className={styles.panelMeta}>Upgrade</span>
                  </Link>
                )}
                <button
                  type="button"
                  className={`${styles.panelItem} ${styles.panelAction}`}
                  onClick={handleSignOut}
                >
                  <span>退出登录</span>
                  <span className={styles.panelMeta}>Sign out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDock;
