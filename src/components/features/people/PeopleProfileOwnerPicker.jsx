import React from 'react';

const PeopleProfileOwnerPicker = ({
  styles,
  form,
  setForm,
  ownerPickerRef,
  ownerPickerOpen,
  setOwnerPickerOpen,
  ownerCandidatesLoading,
  ownerCandidates,
  selectedOwner,
  defaultAvatar,
  accountRoleLabels,
}) => {
  return (
    <label className={styles.field}>
      用户归属
      <div className={styles.ownerSelectWrap} ref={ownerPickerRef}>
        <button
          type="button"
          className={`form-control ${styles.ownerTrigger}`}
          onClick={() => setOwnerPickerOpen((prev) => !prev)}
        >
          {form.owner_user_id
            ? selectedOwner
              ? `${selectedOwner.nickname || '未设置昵称'} · ${selectedOwner.email || selectedOwner.id}`
              : '已选用户（信息加载中）'
            : '未归属'}
        </button>

        {ownerPickerOpen && (
          <div className={styles.ownerPicker} role="listbox" aria-label="用户归属选择">
            <button
              type="button"
              className={`${styles.ownerOption} ${!form.owner_user_id ? styles.ownerOptionActive : ''}`}
              onClick={() => {
                setForm((prev) => ({ ...prev, owner_user_id: '' }));
                setOwnerPickerOpen(false);
              }}
            >
              <div className={styles.ownerMeta}>
                <p className={styles.ownerPrimary}>未归属</p>
                <p className={styles.ownerSecondary}>该人物暂不绑定任何用户账号</p>
              </div>
            </button>

            {ownerCandidatesLoading && <p className={styles.ownerEmpty}>正在加载用户列表...</p>}
            {!ownerCandidatesLoading && ownerCandidates.length === 0 && (
              <p className={styles.ownerEmpty}>暂无可选用户</p>
            )}
            {!ownerCandidatesLoading &&
              ownerCandidates.map((candidate) => {
                const isSelected = candidate.id === form.owner_user_id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`${styles.ownerOption} ${isSelected ? styles.ownerOptionActive : ''}`}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, owner_user_id: candidate.id }));
                      setOwnerPickerOpen(false);
                    }}
                  >
                    <img
                      className={styles.ownerAvatar}
                      src={candidate.avatar_url || defaultAvatar}
                      alt={(candidate.nickname || candidate.email || candidate.id || '用户') + '头像'}
                    />
                    <div className={styles.ownerMeta}>
                      <p className={styles.ownerPrimary}>{candidate.nickname || '未设置昵称'}</p>
                      <p className={styles.ownerSecondary}>ID：{candidate.id}</p>
                      <p className={styles.ownerSecondary}>Email：{candidate.email || '无'}</p>
                      <p className={styles.ownerSecondary}>身份：内部成员</p>
                      <p className={styles.ownerSecondary}>
                        角色：{accountRoleLabels[candidate.role] || candidate.role || '未知'}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </label>
  );
};

export default PeopleProfileOwnerPicker;
