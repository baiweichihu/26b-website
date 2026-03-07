import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import { deletePeopleProfileById, getPeopleProfiles } from '../../services/peopleService';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PeopleProfileActionBar from '../../components/features/people/PeopleProfileActionBar';
import { logger } from '../../utils/logger';
import styles from './PeopleCenter.module.css';

const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="128" fill="%23d9dee8"/><circle cx="128" cy="98" r="44" fill="%23939fb3"/><path d="M52 208c10-34 40-58 76-58s66 24 76 58" fill="%23939fb3"/></svg>';

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const stringifyPhone = (phone) => {
  if (!phone) return null;
  if (typeof phone === 'string') return phone;
  if (typeof phone !== 'object') return null;

  const display = phone.display || '';
  const countryCode = phone.countryCode || '';
  const number = phone.number || '';
  const ext = phone.ext ? ` 转 ${phone.ext}` : '';

  if (display.trim()) return display;
  const merged = `${countryCode} ${number}${ext}`.trim();
  return merged || null;
};

const socialEntries = (social) => {
  if (!social || typeof social !== 'object') return [];

  const items = [];
  if (hasValue(social.wechat)) items.push(`微信：${social.wechat}`);
  if (hasValue(social.qq)) items.push(`QQ：${social.qq}`);
  if (hasValue(social.github)) items.push(`GitHub：${social.github}`);
  if (hasValue(social.bilibili)) items.push(`Bilibili：${social.bilibili}`);

  const custom = Array.isArray(social.other) ? social.other : [];
  custom.forEach((item) => {
    if (item?.platform && item?.account) {
      items.push(`${item.platform}：${item.account}`);
    }
  });

  return items;
};

const toStatusDisplay = (status) => {
  const text = String(status || '').trim();
  if (!text || text === '未设置') return '未设置状态';
  return text;
};

const pinyinNameCollator = new Intl.Collator('zh-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

const PeopleCenter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState('loading');
  const [peopleStatus, setPeopleStatus] = useState('idle');
  const [people, setPeople] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedMap, setExpandedMap] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const loadPeople = useCallback(async () => {
    setPeopleStatus('loading');
    const { data, error } = await getPeopleProfiles();
    if (error) {
      logger.error('加载人物档案失败:', error);
      setPeople([]);
      setPeopleStatus('error');
      return;
    }

    setPeople(data || []);
    setPeopleStatus('ready');
  }, []);


  const loadAuthStatus = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setCurrentUserId(null);
        setIsSuperuser(false);
        setAuthStatus('anonymous');
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setIsSuperuser(false);
        setAuthStatus('anonymous');
        return;
      }

      setIsSuperuser(profile.role === 'superuser');

      setAuthStatus('member');
    } catch (error) {
      logger.error('PeopleCenter auth check failed:', error);
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

  useEffect(() => {
    const run = async () => {
      if (authStatus !== 'member') return;
      await loadPeople();
    };

    void run();
  }, [authStatus, loadPeople]);

  const isLocked = authStatus === 'loading' || authStatus === 'anonymous';
  const directoryRole = useMemo(() => {
    if (location.pathname.includes('/teachers')) return 'teacher';
    return 'student';
  }, [location.pathname]);

  const handleEditPerson = (personId) => {
    if (!personId) return;
    navigate(`/people/edit/${personId}`);
  };

  const handleDeletePerson = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const { error } = await deletePeopleProfileById(deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      await loadPeople();
    } catch (error) {
      logger.error('删除人物失败:', error);
    } finally {
      setDeleting(false);
    }
  };

  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }

    return {
      title: '请登录',
      message: '登录后方可浏览人物志',
    };
  }, [authStatus]);

  const visiblePeople = useMemo(() => {
    const filtered = people.filter((person) => person.role === directoryRole);

    if (directoryRole === 'student') {
      return [...filtered].sort((left, right) => {
        const leftStudentNo = Number.isFinite(left.student_no) ? left.student_no : Number.MAX_SAFE_INTEGER;
        const rightStudentNo = Number.isFinite(right.student_no) ? right.student_no : Number.MAX_SAFE_INTEGER;

        if (leftStudentNo !== rightStudentNo) {
          return leftStudentNo - rightStudentNo;
        }

        const leftSort = Number.isFinite(left.sort_order) ? left.sort_order : Number.MAX_SAFE_INTEGER;
        const rightSort = Number.isFinite(right.sort_order) ? right.sort_order : Number.MAX_SAFE_INTEGER;

        if (leftSort !== rightSort) {
          return leftSort - rightSort;
        }

        return String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN');
      });
    }

    if (directoryRole === 'teacher') {
      return [...filtered].sort((left, right) => {
        const leftName = String(left.name || '').trim();
        const rightName = String(right.name || '').trim();
        return pinyinNameCollator.compare(leftName, rightName);
      });
    }

    return filtered;
  }, [people, directoryRole]);

  const toggleExpanded = (personId) => {
    setExpandedMap((prev) => ({
      ...prev,
      [personId]: !prev[personId],
    }));
  };

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.panel} ${gateStyles.lockedContainer}`}>
        <div className={`${gateStyles.lockedContent} ${isLocked ? gateStyles.isLocked : ''}`} aria-hidden={isLocked}>
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <div>
                <p className="scene-kicker">人物中心</p>
                <h1 className="scene-title">{directoryRole === 'teacher' ? '教师介绍' : '学生介绍'}</h1>
                <p className="scene-subtitle">珍惜每一次来之不易的相遇</p>
              </div>
              <div className={styles.headerAction}>
                <PeopleProfileActionBar onChanged={loadPeople} showInfoNotice={false} />
              </div>
            </div>

            <div className={styles.directoryTabs}>
              <button
                type="button"
                className={`scene-button ${styles.directoryTabButton} ${directoryRole === 'student' ? 'primary' : 'ghost'}`}
                onClick={() => navigate('/introduction/students')}
              >
                学生目录
              </button>
              <button
                type="button"
                className={`scene-button ${styles.directoryTabButton} ${directoryRole === 'teacher' ? 'primary' : 'ghost'}`}
                onClick={() => navigate('/introduction/teachers')}
              >
                教师目录
              </button>
            </div>
            {directoryRole === 'teacher' && <p className={styles.directoryHint}>按照拼音首字母排序</p>}
          </div>

          {peopleStatus === 'loading' && <p className={styles.empty}>正在加载人物档案...</p>}
          {peopleStatus === 'error' && <p className={styles.empty}>人物档案加载失败，请稍后重试</p>}
          {peopleStatus === 'ready' && visiblePeople.length === 0 && <p className={styles.empty}>暂无人物档案数据</p>}

          {peopleStatus === 'ready' && visiblePeople.length > 0 && (
            <div className={styles.grid}>
              {visiblePeople.map((person) => {
                const phone = stringifyPhone(person.phone);
                const hobbies = Array.isArray(person.hobbies)
                  ? person.hobbies.filter((item) => hasValue(item))
                  : [];
                const skills = Array.isArray(person.skills)
                  ? person.skills.filter((item) => hasValue(item))
                  : [];
                const socials = socialEntries(person.social);
                const email = hasValue(person.social?.email) ? `邮箱：${person.social.email}` : null;
                const studentNumber =
                  person.role === 'student' && Number.isFinite(person.student_no)
                    ? String(person.student_no).padStart(2, '0')
                    : null;
                const roleLabel = person.role === 'teacher' ? '教师' : '学生';
                const statusText = toStatusDisplay(person.status);
                const isExpanded = !!expandedMap[person.id];
                const canEdit = isSuperuser || person.owner_user_id === currentUserId;
                const canDelete = isSuperuser;
                const isAssigned = hasValue(person.owner_user_id);

                const topMeta =
                  person.role === 'teacher'
                    ? [roleLabel, hasValue(person.subject) ? person.subject : '未设置状态', ...(isAssigned ? [statusText] : [])].join(' · ')
                    : [roleLabel, ...(isAssigned ? [statusText] : [])].join(' · ');

                return (
                  <article key={person.id} className={styles.card}>
                    <div
                      className={styles.top}
                      onClick={() => toggleExpanded(person.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleExpanded(person.id);
                        }
                      }}
                    >
                      <div className={styles.identityBlock}>
                        {hasValue(studentNumber) && <span className={styles.studentNo}>{studentNumber}</span>}
                        <img
                          className={styles.avatar}
                          src={hasValue(person.avatar_url) ? person.avatar_url : DEFAULT_AVATAR_DATA_URI}
                          alt={`${person.name || '人物'}头像`}
                        />
                        <div>
                          {hasValue(person.name) && <h3 className={styles.name}>{person.name}</h3>}
                          <p className={styles.meta}>{topMeta}</p>
                          {hasValue(person.nickname) && <p className={styles.meta}>昵称：{person.nickname}</p>}
                          {hasValue(person.bio) && <p className={styles.meta}>介绍：{person.bio}</p>}
                        </div>
                      </div>

                      {isSuperuser && (
                        <span className={`${styles.ownershipTag} ${isAssigned ? styles.assigned : styles.unassigned}`}>
                          {isAssigned ? '已归属' : '未归属'}
                        </span>
                      )}

                      <span
                        className={`${styles.foldIndicator} ${isExpanded ? styles.expanded : ''}`}
                        aria-hidden="true"
                      />

                      <div className={styles.cardActions}>
                        {canEdit && (
                          <button
                            type="button"
                            className="scene-button primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditPerson(person.id);
                            }}
                          >
                            修改资料
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="scene-button primary"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(person);
                            }}
                          >
                            删除人物
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <div className={styles.detailColumns}>
                          <div className={styles.detailColumn}>
                            {hasValue(person.english_name) && <p className={styles.detailItem}>英文名：{person.english_name}</p>}
                            {hasValue(person.university) && <p className={styles.detailItem}>院校：{person.university}</p>}
                            {hasValue(person.major) && <p className={styles.detailItem}>专业：{person.major}</p>}
                            {hasValue(person.current_position) && <p className={styles.detailItem}>职位：{person.current_position}</p>}
                            {person.role !== 'teacher' && hasValue(person.website) && <p className={styles.detailItem}>个人网站：{person.website}</p>}
                            {hasValue(phone) && <p className={styles.detailItem}>电话：{phone}</p>}
                            {hasValue(email) && <p className={styles.detailItem}>{email}</p>}
                          </div>

                          <div className={styles.detailColumn}>
                            {hobbies.length > 0 && <p className={styles.inlineDetail}>爱好：{hobbies.join('、')}</p>}
                            {skills.length > 0 && <p className={styles.inlineDetail}>技能：{skills.join('、')}</p>}
                            {socials.map((value, index) => (
                              <p key={`social-${person.id}-${index}`} className={styles.detailItem}>
                                {value}
                              </p>
                            ))}
                          </div>
                        </div>

                        {hasValue(person.description) && <p className={styles.description}>{person.description}</p>}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {isLocked && (
          <AuthGateOverlay
            mode={authStatus === 'guest' ? 'guest' : 'anonymous'}
            title={gateCopy.title}
            message={gateCopy.message}
            isApplyRequired={gateCopy.isApplyRequired}
          />
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="确认删除人物"
          message={`确定要删除「${deleteTarget?.name || '该人物'}」吗？此操作不可撤销。`}
          confirmText={deleting ? '删除中...' : '删除'}
          cancelText="取消"
          confirmDisabled={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeletePerson}
        />
      </section>
    </div>
  );
};

export default PeopleCenter;
