import React, { useEffect, useState } from 'react';
import NoticeBox from '../../widgets/NoticeBox';
import { supabase } from '../../../lib/supabase';
import { createMyPeopleProfile } from '../../../services/peopleService';
import styles from './PeopleProfileActionBar.module.css';

const PeopleProfileActionBar = ({ onChanged }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [notice, setNotice] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    gender: '',
    role: '',
    studentNo: '',
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
      if (name === 'role' && value !== 'student') {
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
        status: '未设置',
        sort_order: createForm.role === 'student' ? studentNoNumber : 999,
      });

      if (error) throw error;
      setNotice({ type: 'success', message: '创建人物资料成功' });
      setCreateForm({ name: '', gender: '', role: '', studentNo: '' });
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
            测试创建人物
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
                <input
                  className="form-control"
                  name="studentNo"
                  value={createForm.studentNo}
                  onChange={handleCreateFieldChange}
                  placeholder="例如 19"
                />
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
                (createForm.role === 'student' && !createForm.studentNo.trim())
              }
            >
              提交创建
            </button>
          </div>
        </div>
      )}

      {!isSuperuser && (
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
