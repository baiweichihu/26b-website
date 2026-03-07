import React from 'react';

const PeopleProfileRoleFields = ({
  styles,
  form,
  handleChange,
  statusOptionsByRole,
}) => {
  if (form.role === 'student') {
    return (
      <>
        <label className={styles.field}>
          学号 *（创建后不可修改）
          <input className="form-control" name="student_no" value={form.student_no} disabled readOnly />
        </label>
        <label className={styles.field}>
          昵称
          <input className="form-control" name="nickname" value={form.nickname} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          英文名
          <input className="form-control" name="english_name" value={form.english_name} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          状态
          <select className="form-select" name="status" value={form.status} onChange={handleChange}>
            <option value="">--请选择状态--</option>
            {statusOptionsByRole.student.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          院校名称
          <input className="form-control" name="university" value={form.university} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          专业
          <input className="form-control" name="major" value={form.major} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          爱好（空格分隔）
          <input className="form-control" name="hobbiesText" value={form.hobbiesText} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          技能（空格分隔）
          <input className="form-control" name="skillsText" value={form.skillsText} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          手机
          <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          邮箱
          <input className="form-control" name="email" value={form.email} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          个人网站
          <input className="form-control" name="website" value={form.website} onChange={handleChange} />
        </label>
      </>
    );
  }

  if (form.role === 'teacher') {
    return (
      <>
        <label className={styles.field}>
          学科（创建后不可修改）
          <input className="form-control" name="subject" value={form.subject} disabled readOnly />
        </label>
        <label className={styles.field}>
          昵称
          <input className="form-control" name="nickname" value={form.nickname} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          状态
          <select className="form-select" name="status" value={form.status} onChange={handleChange}>
            <option value="">--请选择状态--</option>
            {statusOptionsByRole.teacher.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          职位
          <input className="form-control" name="current_position" value={form.current_position} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          爱好（空格分隔）
          <input className="form-control" name="hobbiesText" value={form.hobbiesText} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          技能（空格分隔）
          <input className="form-control" name="skillsText" value={form.skillsText} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          手机
          <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
        </label>
        <label className={styles.field}>
          邮箱
          <input className="form-control" name="email" value={form.email} onChange={handleChange} />
        </label>
      </>
    );
  }

  return null;
};

export default PeopleProfileRoleFields;
