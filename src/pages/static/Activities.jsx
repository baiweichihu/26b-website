import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';

const Activities = () => {
  const [authStatus, setAuthStatus] = useState('loading');

  const loadAuthStatus = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthStatus('anonymous');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setAuthStatus('anonymous');
        return;
      }

      setAuthStatus('member');
    } catch (error) {
      console.error('Activities auth check failed:', error);
      setAuthStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void loadAuthStatus();
    });

    const timer = setTimeout(() => {
      void loadAuthStatus();
    }, 0);

    return () => {
      clearTimeout(timer);
      data?.subscription?.unsubscribe?.();
    };
  }, [loadAuthStatus]);

  const isLocked = authStatus === 'loading' || authStatus === 'anonymous';
  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }

    return {
      title: '请登录',
      message: '登录后方可浏览大事记',
    };
  }, [authStatus]);

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel scene-hero ${gateStyles.lockedContainer}`}>
        <div className={`${gateStyles.lockedContent} ${isLocked ? gateStyles.isLocked : ''}`} aria-hidden={isLocked}>
          <p className="scene-kicker">大事纪</p>
          <h1 className="scene-title">那些跃动于记忆中的瞬间</h1>

          <p className="scene-subtitle">26B班的赛博琥珀</p>
        </div>
        <div className="scene-orb" aria-hidden="true">
          <span className="scene-orb-core"></span>
          <span className="scene-orb-ring"></span>
        </div>

        {isLocked && (
          <AuthGateOverlay
            mode="anonymous"
            title={gateCopy.title}
            message={gateCopy.message}
          />
        )}
      </section>
    </div>
  );
};

export default Activities;
