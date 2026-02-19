import { supabase } from '../lib/supabase.js';

// 存储活跃的频道订阅，避免重复订阅
const activeChannels = new Map();

/**
 * 为新注册用户创建欢迎通知
 * @param {string} userId - 新用户ID
 * @returns {Promise<Object>}
 */
export async function createWelcomeNotification(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        recipient_id: userId,
        type: 'system_announcement',
        title: '标题',
        content: '这是一个welcomenotification',
        related_resource_type: null,
        related_resource_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
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
export async function createAuditResultNotification(
  userId,
  status,
  requestType,
  relatedResourceId
) {
  const title = status === 'approved' ? '申请已批准' : '申请已驳回';
  const content = `你的${requestType}申请已${status === 'approved' ? '被批准' : '被驳回'}`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        recipient_id: userId,
        type: 'audit_result',
        title: title,
        content: content,
        related_resource_type: 'admin_request',
        related_resource_id: relatedResourceId,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

/**
 * 创建举报反馈通知
 * @param {string} userId - 举报人ID
 * @param {string} status - 处理状态 (approved/rejected)
 * @param {string} targetType - 被举报内容类型 (post/comment)
 * @returns {Promise<Object>}
 */
export async function createReportFeedbackNotification(
  userId,
  status,
  targetType,
  reportId = null
) {
  const title = status === 'approved' ? '举报已处理' : '举报已驳回';
  const content =
    status === 'approved'
      ? `感谢你的举报，我们已对违规${targetType === 'post' ? '帖子' : '评论'}进行处理`
      : `感谢你的举报，我们审核后认为该${targetType === 'post' ? '帖子' : '评论'}无违规，已驳回举报`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        recipient_id: userId,
        type: 'report_feedback',
        title: title,
        content: content,
        related_resource_type: 'content_reports',
        related_resource_id: reportId,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
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
export async function createInteractionNotification(
  userId,
  actionType,
  actorName,
  targetType,
  targetId
) {
  const actionText = actionType === 'like' ? '点赞了你的' : '评论了你的';
  const targetText = targetType === 'post' ? '帖子' : '评论';

  const title = `${actorName}${actionText}${targetText}`;
  const content = `${actorName}${actionText}${targetText}`;

  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        recipient_id: userId,
        type: 'interaction',
        title: title,
        content: content,
        related_resource_type: targetType,
        related_resource_id: targetId,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

/**
 * 发送系统通知给指定用户
 * @param {string} userId - 接收用户ID
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 * @returns {Promise<Object>}
 */
export async function createSystemNotification(userId, title, content) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        recipient_id: userId,
        type: 'system_announcement',
        title: title,
        content: content,
        related_resource_type: null,
        related_resource_id: null,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

/**
 * 订阅用户的实时通知（WebSocket）
 * @param {string} userId - 用户ID
 * @param {Function} onNotification - 收到通知时的回调函数
 * @returns {Promise<Object>} 返回 channel 对象和错误信息
 */
export async function subscribeToNotifications(userId, onNotification) {
  if (!userId || !onNotification) {
    return {
      channel: null,
      error: '缺少必要参数：userId 或 onNotification',
    };
  }

  const channelName = `notifications:${userId}`;

  // 检查是否已有活跃的订阅
  if (activeChannels.has(channelName)) {
    return {
      channel: activeChannels.get(channelName),
      error: null,
    };
  }

  try {
    // 创建 Realtime 频道
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          // 新通知到达时触发回调
          onNotification({
            type: 'INSERT',
            data: payload.new,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          // 通知更新时触发回调（例如标记为已读）
          onNotification({
            type: 'UPDATE',
            data: payload.new,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ 已订阅用户 ${userId} 的实时通知`);
        } else if (status === 'CLOSED') {
          console.log(`❌ 用户 ${userId} 的通知订阅已关闭`);
          activeChannels.delete(channelName);
        }
      });

    // 存储活跃频道
    activeChannels.set(channelName, channel);

    return { channel, error: null };
  } catch (error) {
    return {
      channel: null,
      error: error.message || '订阅失败',
    };
  }
}

/**
 * 取消订阅用户的实时通知
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 返回操作结果
 */
export async function unsubscribeFromNotifications(userId) {
  if (!userId) {
    return { success: false, error: '缺少必要参数：userId' };
  }

  const channelName = `notifications:${userId}`;

  try {
    const channel = activeChannels.get(channelName);

    if (!channel) {
      return {
        success: false,
        error: '该用户没有活跃的订阅',
      };
    }

    // 取消订阅
    await supabase.removeChannel(channel);
    activeChannels.delete(channelName);

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error.message || '取消订阅失败',
    };
  }
}

/**
 * 获取用户的未读通知列表
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function getUnreadNotifications(userId) {
  if (!userId) {
    return {
      data: null,
      error: '缺少必要参数：userId',
    };
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * 标记通知为已读
 * @param {string} notificationId - 通知ID
 * @returns {Promise<Object>}
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) {
    return {
      data: null,
      error: '缺少必要参数：notificationId',
    };
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select();

  return { data, error };
}

/**
 * 标记用户的所有通知为已读
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function markAllNotificationsAsRead(userId) {
  if (!userId) {
    return {
      data: null,
      error: '缺少必要参数：userId',
    };
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .select();

  return { data, error };
}

/**
 * 获取用户的所有通知列表（包括已读和未读）
 * @param {string} userId - 用户ID
 * @param {number} limit - 限制条数（默认50）
 * @param {number} offset - 分页偏移（默认0）
 * @returns {Promise<Object>}
 */
export async function getAllNotifications(userId, limit = 50, offset = 0) {
  if (!userId) {
    return {
      data: null,
      error: '缺少必要参数：userId',
    };
  }

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error, count };
}

/**
 * 删除单条通知
 * @param {string} notificationId - 通知ID
 * @returns {Promise<Object>}
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) {
    return {
      success: false,
      error: '缺少必要参数：notificationId',
    };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * 发布系统公告（Superuser 操作）
 * 向指定身份的用户或所有用户发送公告通知
 * @param {string} title - 公告标题
 * @param {string} content - 公告内容
 * @param {string} publishedBy - 发布者ID（Superuser）
 * @param {Array<string>} targetIdentities - 目标身份数组 (classmate/alumni/guest)，为空时发送给所有用户
 * @returns {Promise<Object>} { insertedCount, error }
 */
export async function createSystemAnnouncementNotification(
  title,
  content,
  publishedBy,
  targetIdentities = []
) {
  if (!title || !content || !publishedBy) {
    return {
      insertedCount: 0,
      error: '缺少必要参数：title, content, publishedBy',
    };
  }

  try {
    let query = supabase.from('profiles').select('id');

    // 如果指定了目标身份，仅向这些身份的用户发送
    if (targetIdentities.length > 0) {
      query = query.in('identity_type', targetIdentities);
    }

    const { data: recipients, error: fetchError } = await query;

    if (fetchError) {
      return { insertedCount: 0, error: fetchError.message };
    }

    if (!recipients || recipients.length === 0) {
      return {
        insertedCount: 0,
        error: '没有符合条件的接收者',
      };
    }

    // 为每个用户创建通知记录
    const notifications = recipients.map((recipient) => ({
      recipient_id: recipient.id,
      type: 'system_announcement',
      title: title,
      content: content,
      related_resource_type: 'announcement',
      related_resource_id: null,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      return {
        insertedCount: 0,
        error: error.message,
      };
    }

    return {
      insertedCount: notifications.length,
      error: null,
    };
  } catch (error) {
    return {
      insertedCount: 0,
      error: error.message || '发布公告失败',
    };
  }
}
