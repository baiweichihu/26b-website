import React, { useEffect, useState } from 'react';
import NoticeBox from '../../widgets/NoticeBox';
import { supabase } from '../../../lib/supabase';
import { createMyPeopleProfile } from '../../../services/peopleService';
import styles from './PeopleProfileActionBar.module.css';

const SUBJECT_OPTIONS = [
  '语文',
  '数学',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治',
  '体育',
  '心理',
  '信息',
  '音乐',
  '美术',
  '其他',
];

const PeopleProfileActionBar = ({ onChanged, showInfoNotice = true }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [notice, setNotice] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    gender: '',
    role: '',
    studentNo: '',
    subject: '',
  });

  const refreshMyProfileState = async () => {
    const authResult = await supabase.auth.getUser();

    const userId = authResult?.data?.user?.id;
    if (!userId) {
      setIsSuperuser(false);
      return;
    }

    const { data: profile, error: roleError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (roleError) {
      setIsSuperuser(false);
      return;
    }

    setIsSuperuser(profile?.role === 'superuser');
  };

  useEffect(() => {
    void refreshMyProfileState();
  }, []);

  const handleCreateFieldChange = (event) => {
    const { name, value } = event.target;
    setCreateForm((prev) => {
      if (name === 'role' && value === 'student') {
        return { ...prev, role: value, subject: '' };
      }
      if (name === 'role' && value === 'teacher') {
        return { ...prev, role: value, studentNo: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleCreate = async () => {
    setNotice(null);

    if (!createForm.name.trim() || !createForm.gender || !createForm.role) {
      setNotice({ type: 'error', message: '创建人物必须填写：name、gender、role' });
      return;
    }

    if (createForm.role === 'teacher' && !createForm.subject) {
      setNotice({ type: 'error', message: '教师身份需要选择学科' });
      return;
    }

    let studentNoNumber = null;
    if (createForm.role === 'student') {
      studentNoNumber = Number.parseInt(createForm.studentNo, 10);
      if (!Number.isInteger(studentNoNumber) || studentNoNumber <= 0) {
        setNotice({ type: 'error', message: '学生身份需要填写正确的学号（正整数）' });
        return;
      }
    }

    try {
      const { error } = await createMyPeopleProfile({
        name: createForm.name.trim(),
        gender: createForm.gender,
        role: createForm.role,
        student_no: createForm.role === 'student' ? studentNoNumber : null,
        subject: createForm.role === 'teacher' ? createForm.subject : null,
        status: '未设置',
        sort_order: createForm.role === 'student' ? studentNoNumber : 999,
      });

      if (error) throw error;
      setNotice({ type: 'success', message: '创建人物资料成功' });
      setCreateForm({ name: '', gender: '', role: '', studentNo: '', subject: '' });
      setShowCreateForm(false);
      await refreshMyProfileState();
      await onChanged?.();
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '创建失败' });
    }
  };

  return (
    <div className={styles.wrap}>
      {isSuperuser && (
        <div className={styles.row}>
          <button type="button" className="scene-button primary" onClick={() => setShowCreateForm((prev) => !prev)}>
            创建人物
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className={styles.createPanel}>
          <p className={styles.createTitle}>创建人物（必填：name / gender / role）</p>
          <div className={styles.createGrid}>
            <label className={styles.createField}>
              Name *
              <input
                className="form-control"
                name="name"
                value={createForm.name}
                onChange={handleCreateFieldChange}
                placeholder="请输入姓名"
              />
            </label>
            <label className={styles.createField}>
              Gender *
              <select className="form-select" name="gender" value={createForm.gender} onChange={handleCreateFieldChange}>
                <option value="">--请选择--</option>
                <option value="male">male</option>
                <option value="female">female</option>
              </select>
            </label>
            <label className={styles.createField}>
              Role *
              <select className="form-select" name="role" value={createForm.role} onChange={handleCreateFieldChange}>
                <option value="">--请选择--</option>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
              </select>
            </label>
            {createForm.role === 'student' && (
              <label className={styles.createField}>
                学号 *
                <select className="form-select" name="studentNo" value={createForm.studentNo} onChange={handleCreateFieldChange}>
                  <option value="">--请选择学号--</option>
                  {Array.from({ length: 30 }, (_, index) => {
                    const value = String(index + 1).padStart(2, '0');
                    return (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}
            {createForm.role === 'teacher' && (
              <label className={styles.createField}>
                学科 *
                <select className="form-select" name="subject" value={createForm.subject} onChange={handleCreateFieldChange}>
                  <option value="">--请选择学科--</option>
                  {SUBJECT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className={styles.row}>
            <button
              type="button"
              className="scene-button primary"
              onClick={handleCreate}
              disabled={
                !createForm.name.trim() ||
                !createForm.gender ||
                !createForm.role ||
                (createForm.role === 'student' && !createForm.studentNo.trim()) ||
                (createForm.role === 'teacher' && !createForm.subject)
              }
            >
              提交创建
            </button>
          </div>
        </div>
      )}

      {!isSuperuser && showInfoNotice && (
        <div className={styles.notice}>
          <NoticeBox type="info" message="仅 superuser 可创建/删除人物；普通用户仅可修改归属到自己的资料。" />
        </div>
      )}

      {notice && (
        <div className={styles.notice}>
          <NoticeBox type={notice.type} message={notice.message} />
        </div>
      )}
    </div>
  );
};

export default PeopleProfileActionBar;
