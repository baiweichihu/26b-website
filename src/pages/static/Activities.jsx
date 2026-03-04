import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import { hasValidArchiveAccess } from '../../utils/archiveAccess';

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
        .select('identity_type, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setAuthStatus('anonymous');
        return;
      }

      if (profile.role === 'admin' || profile.role === 'superuser' || profile.identity_type === 'classmate') {
        setAuthStatus('member');
        return;
      }

      if (profile.identity_type === 'guest') {
        setAuthStatus('guest');
        return;
      }

      if (profile.identity_type === 'alumni') {
        const { data: accessRequests, error: requestError } = await supabase
          .from('access_requests')
          .select('status, archive_category, request_access_start_time, request_access_end_time, reason')
          .eq('requester_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!requestError && hasValidArchiveAccess(accessRequests, 'activities')) {
          setAuthStatus('member');
        } else {
          setAuthStatus('guest');
        }
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

    void loadAuthStatus();
    return () => data?.subscription?.unsubscribe?.();
  }, [loadAuthStatus]);

  const isLocked = authStatus === 'loading' || authStatus === 'anonymous' || authStatus === 'guest';
  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }

    if (authStatus === 'guest') {
      return {
        title: '需要申请查档权限',
        message: '校友需要向管理员申请查档时间，批准后方可浏览大事记',
        isApplyRequired: true,
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
            mode={authStatus === 'guest' ? 'guest' : 'anonymous'}
            title={gateCopy.title}
            message={gateCopy.message}
            isApplyRequired={gateCopy.isApplyRequired}
          />
        )}
      </section>
    </div>
  );
};

export default Activities;
