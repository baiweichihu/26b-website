import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoticeBox from '../../components/widgets/NoticeBox';
import { supabase } from '../../lib/supabase';
import { getPeopleProfileOwnerChangeLogs } from '../../services/peopleService';
import styles from './PeopleOwnershipLogs.module.css';

const formatUser = (user, fallbackId) => {
  if (!fallbackId) return '未归属';
  if (!user) return `用户 ${fallbackId}`;
  return `${user.nickname || '未设置昵称'} · ${user.email || user.id}`;
};

const formatTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('zh-CN', { hour12: false });
};

const PeopleOwnershipLogs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [logs, setLogs] = useState([]);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setNotice(null);

      try {
        const authResult = await supabase.auth.getUser();
        const userId = authResult?.data?.user?.id;

        if (!userId) {
          setIsSuperuser(false);
          setNotice({ type: 'error', message: '请先登录后查看归属记录' });
          return;
        }

        const { data: roleRow, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (roleError) {
          setNotice({ type: 'error', message: roleError.message || '权限校验失败' });
          setIsSuperuser(false);
          return;
        }

        if (roleRow?.role !== 'superuser') {
          setNotice({ type: 'error', message: '仅 superuser 可查看归属记录' });
          setIsSuperuser(false);
          return;
        }

        setIsSuperuser(true);
        const { data, error } = await getPeopleProfileOwnerChangeLogs(300);
        if (error) {
          setNotice({ type: 'error', message: error.message || '归属记录加载失败' });
          setLogs([]);
          return;
        }

        setLogs(data || []);
      } catch (error) {
        setIsSuperuser(false);
        setLogs([]);
        setNotice({ type: 'error', message: error.message || '归属记录加载失败' });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const hasLogs = useMemo(() => logs.length > 0, [logs]);

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.panel}`}>
        <div className={styles.header}>
          <div>
            <p className="scene-kicker">人物中心</p>
            <h1 className="scene-title">归属变更记录</h1>
            <p className="scene-subtitle">仅 superuser 可查看，用于追踪人物归属调整历史</p>
          </div>
          <button type="button" className="scene-button ghost" onClick={() => navigate('/introduction/students')}>
            返回人物中心
          </button>
        </div>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        {loading && <p className={styles.empty}>正在加载归属记录...</p>}

        {!loading && isSuperuser && !hasLogs && <p className={styles.empty}>暂无归属变更记录</p>}

        {!loading && isSuperuser && hasLogs && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>人物</th>
                  <th>旧归属</th>
                  <th>新归属</th>
                  <th>操作者</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td>{formatTime(item.changed_at)}</td>
                    <td>
                      <div className={styles.personName}>{item.people_profile?.name || item.people_profile_id}</div>
                      <div className={styles.personMeta}>{item.people_profile?.role === 'teacher' ? '教师' : '学生'}</div>
                    </td>
                    <td>{formatUser(item.old_owner, item.old_owner_user_id)}</td>
                    <td>{formatUser(item.new_owner, item.new_owner_user_id)}</td>
                    <td>{formatUser(item.changed_by, item.changed_by_user_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default PeopleOwnershipLogs;
