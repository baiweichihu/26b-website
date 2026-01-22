import { supabase } from '../lib/supabase.js';

/**
 * 为新注册用户创建欢迎通知
 * @param {string} userId - 新用户ID
 * @returns {Promise<Object>}
 */
export async function createWelcomeNotification(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      recipient_id: userId,
      type: 'system_announcement',
      title: '标题',
      content: '这是一个welcomenotification',
      related_resource_type: null,
      related_resource_id: null,
      is_read: false,
      created_at: new Date().toISOString()
    }])
    .select();

  return { data, error };
}

/**
 * 创建审核结果通知
 * @param {string} userId - 接收通知的用户ID
 * @param {string} status - 审核状态 (approved/rejected)
 * @param {string} requestType - 申请类型 (如: 升级校友、修改头像等)
 * @param {string} relatedResourceId - 相关资源ID
 * @returns {Promise<Object>}
 */
export async function createAuditResultNotification(userId, status, requestType, relatedResourceId) {
  const title = status === 'approved' ? '申请已批准' : '申请已驳回';
  const content = `你的${requestType}申请已${status === 'approved' ? '被批准' : '被驳回'}`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      recipient_id: userId,
      type: 'audit_result',
      title: title,
      content: content,
      related_resource_type: 'admin_request',
      related_resource_id: relatedResourceId,
      is_read: false,
      created_at: new Date().toISOString()
    }])
    .select();

  return { data, error };
}

/**
 * 创建举报反馈通知
 * @param {string} userId - 举报人ID
 * @param {string} status - 处理状态 (resolved/dismissed)
 * @param {string} targetType - 被举报内容类型 (post/comment)
 * @returns {Promise<Object>}
 */
export async function createReportFeedbackNotification(userId, status, targetType) {
  const title = status === 'resolved' ? '举报已处理' : '举报已驳回';
  const content = status === 'resolved' 
    ? `感谢你的举报，我们已对违规${targetType === 'post' ? '帖子' : '评论'}进行处理`
    : `感谢你的举报，我们审核后认为该${targetType === 'post' ? '帖子' : '评论'}无违规，已驳回举报`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      recipient_id: userId,
      type: 'report_feedback',
      title: title,
      content: content,
      related_resource_type: 'content_reports',
      related_resource_id: null,
      is_read: false,
      created_at: new Date().toISOString()
    }])
    .select();

  return { data, error };
}

/**
 * 创建社交互动通知 (点赞/评论)
 * @param {string} userId - 被互动者ID（如帖子作者）
 * @param {string} actionType - 互动类型 (like/comment)
 * @param {string} actorName - 操作者的昵称
 * @param {string} targetType - 目标类型 (post/comment)
 * @param {string} targetId - 目标ID
 * @returns {Promise<Object>}
 */
export async function createInteractionNotification(userId, actionType, actorName, targetType, targetId) {
  const actionText = actionType === 'like' ? '点赞了你的' : '评论了你的';
  const targetText = targetType === 'post' ? '帖子' : '评论';
  
  const title = `${actorName}${actionText}${targetText}`;
  const content = `${actorName}${actionText}${targetText}`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      recipient_id: userId,
      type: 'interaction',
      title: title,
      content: content,
      related_resource_type: targetType,
      related_resource_id: targetId,
      is_read: false,
      created_at: new Date().toISOString()
    }])
    .select();

  return { data, error };
}
