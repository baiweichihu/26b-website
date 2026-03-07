import {
  createAuditResultNotification,
  createReportFeedbackNotification,
  createWelcomeNotification,
  createSystemNotification,
} from './inboxService.js';

export const notifyRegisterApproved = async (userId) => {
  await createWelcomeNotification(userId);
  await createSystemNotification(
    userId,
    '注册申请已通过',
    '你的注册申请已通过，请查收邮件中的初始密码并登录。'
  );
};

export const notifyBanStatusChanged = async (userId, { banned, reason = '' } = {}) => {
  if (banned) {
    await createSystemNotification(
      userId,
      '账号状态变更',
      `你已被禁言。原因：${reason || '违反社区规定'}`
    );
    return;
  }

  await createSystemNotification(userId, '账号状态变更', '你的账号已被解除禁言。');
};

export const notifyReportHandled = async (reporterId, status, targetType, reportId) => {
  await createReportFeedbackNotification(reporterId, status, targetType, reportId);
};

export const notifyPermissionRequestHandled = async (requesterId, status, requestId) => {
  await createAuditResultNotification(requesterId, status, '权限变更', requestId);
};

export const notifyAdminRoleChanged = async (userId, { appointed } = {}) => {
  await createSystemNotification(
    userId,
    '权限变更',
    appointed ? '你已被任命为管理员。' : '你的管理员身份已被撤销。'
  );
};
