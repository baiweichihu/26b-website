import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import styles from './AdminSimplePage.module.css';

function PermissionApprovals() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          navigate('/');
          return;
        }

        if (profile.role !== 'superuser') {
          navigate('/');
        }
      } catch (err) {
        console.error('检查权限失败:', err);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/admin/dashboard')}
          title="返回管理员中心"
        >
          <i className="fas fa-arrow-left"></i> 返回
        </button>
        <h1>权限变更审批</h1>
      </div>
      <div className={styles.contentBox}>权限变更审批功能即将上线。</div>
    </div>
  );
}

export default PermissionApprovals;
