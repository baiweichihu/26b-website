import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import { useIrisTransition } from '../ui/IrisTransition';
import { supabase } from '../../lib/supabase';

const Header = () => {
  const headerRef = useRef(null);
  const swipeRef = useRef(null);
  const blobRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const schoolUrl = 'https://www.no8ms.bj.cn/cms/home/';
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeaderOffset = () => {
      document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight}px`);
    };

    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);

    return () => window.removeEventListener('resize', updateHeaderOffset);
  }, []);

  // 检查登录状态和未读通知数
  useEffect(() => {
    const fetchUnreadCount = async (currentUserId) => {
      if (!currentUserId) return;
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);

      if (!error) {
        setUnreadCount(notifications?.length || 0);
      }
    };

    const checkLoginAndNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoggedIn(false);
          setUnreadCount(0);
          setUserId(null);
          return;
        }

        setIsLoggedIn(true);
        setUserId(user.id);
        await fetchUnreadCount(user.id);
      } catch (error) {
        console.error('检查登录状态或通知失败:', error);
      }
    };

    checkLoginAndNotifications();

    // 订阅认证状态变化
    const { data } = supabase.auth.onAuthStateChange(() => {
      checkLoginAndNotifications();
    });

    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async () => {
          const { data: notifications, error } = await supabase
            .from('notifications')
            .select('id')
            .eq('recipient_id', userId)
            .eq('is_read', false);

          if (!error) {
            setUnreadCount(notifications?.length || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const handleUnreadCount = (event) => {
      if (typeof event.detail === 'number') {
        setUnreadCount(event.detail);
      }
    };

    window.addEventListener('notifications:unreadCount', handleUnreadCount);

    return () => {
      window.removeEventListener('notifications:unreadCount', handleUnreadCount);
    };
  }, []);

  const handleSchoolClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    window.location.assign(schoolUrl);
  };

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const header = headerRef.current;
    if (!gsap || !header || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (swipeRef.current) {
        gsap.fromTo(
          swipeRef.current,
          { xPercent: -120, opacity: 0 },
          { xPercent: 120, opacity: 0.85, duration: 1.6, ease: 'power3.out' }
        );
      }

      if (blobRef.current) {
        gsap.to(blobRef.current, {
          borderRadius: '40% 60% 55% 45% / 45% 40% 60% 55%',
          duration: 5.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
        gsap.to(blobRef.current, {
          x: 24,
          y: -12,
          duration: 8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }
    }, header);

    return () => ctx.revert();
  }, []);

  return (
    <header className={styles.pageHeader} ref={headerRef}>
      <div className={styles.headerSwipe} ref={swipeRef} aria-hidden="true" />
      <div className={styles.headerBlob} ref={blobRef} aria-hidden="true" />
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-2 text-center">
            <div className="d-flex justify-content-center">
              <a
                className={`${styles.iconCircle} me-2`}
                href={schoolUrl}
                aria-label="北京八中官网"
                onPointerDown={handleSchoolClick}
                onClick={handleSchoolClick}
              >
                <img src={`${import.meta.env.BASE_URL}bjbz_icon.png`} alt="校徽" />
              </a>
              <div className={`${styles.iconCircle} ms-2`}>
                <img src={`${import.meta.env.BASE_URL}shao26b_icon.png`} alt="班徽" />
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <h1 className="display-4 mb-2">
              <span className={styles.schoolName}>北京八中</span>
              <span className={styles.className}>少26B班</span>
            </h1>
          </div>
          <div className="col-md-2 text-end">
            <div className={styles.headerActionGroup}>
              {isLoggedIn && (
                <Link
                  to="/notifications"
                  className={styles.notificationBtn}
                  aria-label="通知中心"
                  onClick={(event) => triggerIris?.(event, '/notifications')}
                  title="查看通知"
                >
                  <i className={`fas fa-bell ${styles.notificationIcon}`}></i>
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </Link>
              )}
              <Link
                to="/contact"
                className={styles.contactBtn}
                onClick={(event) => triggerIris?.(event, '/contact')}
              >
                <i className={`fas fa-envelope ${styles.contactIcon}`}></i>
                <span className={styles.contactText}>联系我们</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
