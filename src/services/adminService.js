import { supabase } from '../lib/supabase.js';
import {
  createAuditResultNotification,
  createReportFeedbackNotification,
  createSystemAnnouncementNotification,
} from './inboxService.js';

/**
 * =====================
 * 权限管理相关函数
 * =====================
 */

/**
 * 获取管理员的权限信息
 * @param {string} adminId - 管理员ID
 * @returns {Promise<Object>}
 */
export async function getAdminPermissions(adminId) {
  if (!adminId) {
    return { data: null, error: '缺少必要参数：adminId' };
  }

  const { data, error } = await supabase
    .from('admin_permissions')
    .select('*')
    .eq('admin_id', adminId)
    .maybeSingle();

  return { data, error };
}

/**
 * 更新管理员的权限
 * @param {string} adminId - 管理员ID
 * @param {Object} permissions - 权限对象
 * @param {string} grantedBy - 授权者ID（Superuser）
 * @returns {Promise<Object>}
 */
export async function updateAdminPermissions(adminId, permissions, grantedBy) {
  if (!adminId || !permissions || !grantedBy) {
    return {
      data: null,
      error: '缺少必要参数：adminId, permissions, grantedBy',
    };
  }

  const { data, error } = await supabase
    .from('admin_permissions')
    .update({
      ...permissions,
      updated_at: new Date().toISOString(),
    })
    .eq('admin_id', adminId)
    .select();

  return { data, error };
}

/**
 * =====================
 * 用户权限管理相关函数
 * =====================
 */

/**
 * 获取游客升级校友的申请列表
 * @param {string} status - 申请状态 (pending/approved/rejected)，为空时获取所有
 * @returns {Promise<Object>}
 */
export async function getUpgradeRequests(status = null) {
  let query = supabase.from('upgrade_requests').select(
    `
      *,
      requester:requester_id(id, nickname, email, avatar_url)
    `
  );

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  return { data, error };
}

/**
 * 获取单条举报详情
 * @param {string} reportId - 举报ID
 * @returns {Promise<Object>}
 */
export async function getContentReportById(reportId) {
  if (!reportId) return { data: null, error: '缺少 reportId' };

  const { data, error } = await supabase
    .from('content_reports')
    .select(
      `
      id,
      reporter_id,
      target_type,
      target_id,
      target_content,
      target_author_id,
      target_author_nickname,
      reason,
      suggestion,
      status,
      admin_note,
      created_at,
      updated_at,
      reporter:reporter_id(id, nickname, email, avatar_url)
    `
    )
    .eq('id', reportId)
    .maybeSingle();

  return { data, error };
}

/**
 * 获取某用户的举报历史
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function getReportsByUser(userId) {
  if (!userId) return { data: [], error: '缺少 userId' };

  const { data, error } = await supabase
    .from('content_reports')
    .select(
      `
      id,
      reporter_id,
      target_type,
      target_id,
      target_content,
      target_author_id,
      target_author_nickname,
      reason,
      suggestion,
      status,
      admin_note,
      created_at,
      updated_at
    `
    )
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * 批准游客升级为校友
 * @param {string} requestId - 升级申请ID
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function approveUpgradeRequest(requestId, handledBy) {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息
    const { data: request, error: fetchError } = await supabase
      .from('upgrade_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新申请状态
    const { data: updatedRequest, error: updateError } = await supabase
      .from('upgrade_requests')
      .update({
        status: 'approved',
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 更新用户身份为校友
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ identity_type: 'alumni' })
      .eq('id', request.requester_id);

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    // 4. 发送审核通过通知
    await createAuditResultNotification(request.requester_id, 'approved', '升级为校友', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return { data: null, error: error.message || '批准申请失败' };
  }
}

/**
 * 驳回游客升级申请
 * @param {string} requestId - 升级申请ID
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function rejectUpgradeRequest(requestId, handledBy) {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息
    const { data: request, error: fetchError } = await supabase
      .from('upgrade_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新申请状态为被驳回
    const { data: updatedRequest, error: updateError } = await supabase
      .from('upgrade_requests')
      .update({
        status: 'rejected',
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 发送审核驳回通知
    await createAuditResultNotification(request.requester_id, 'rejected', '升级为校友', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return { data: null, error: error.message || '驳回申请失败' };
  }
}

/**
 * 获取特定身份的所有用户（用于 Superuser 查看）
 * @param {string} identityType - 身份类型 (classmate/alumni/guest)
 * @returns {Promise<Object>}
 */
/**
 * 根据身份获取用户列表
 * @param {string|null} identityType - 身份类型（classmate/alumni/guest，null 表示获取所有）
 * @returns {Promise<Object>}
 */
export async function getUsersByIdentity(identityType) {
  let query = supabase.from('profiles').select(
    `
      id,
      nickname,
      email,
      avatar_url,
      identity_type,
      role,
      is_banned,
      created_at
    `
  );

  // 如果指定了 identityType，则过滤；否则获取所有用户
  if (identityType) {
    query = query.eq('identity_type', identityType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  return { data, error };
}

/**
 * 禁言用户
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function banUser(userId) {
  if (!userId) {
    return { data: null, error: '缺少必要参数：userId' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_banned: true })
    .eq('id', userId)
    .select();

  return { data, error };
}

/**
 * 解禁用户
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>}
 */
export async function unbanUser(userId) {
  if (!userId) {
    return { data: null, error: '缺少必要参数：userId' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_banned: false })
    .eq('id', userId)
    .select();

  return { data, error };
}

/**
 * =====================
 * 内容管理相关函数
 * =====================
 */

/**
 * 获取内容举报列表
 * @param {string} status - 举报状态 (pending/approved/rejected)，为空时获取所有
 * @returns {Promise<Object>}
 */
export async function getContentReports(status = null) {
  let query = supabase.from('content_reports').select(
    `
      id,
      reporter_id,
      target_type,
      target_id,
      target_content,
      target_author_id,
      target_author_nickname,
      reason,
      suggestion,
      status,
      admin_note,
      created_at,
      updated_at,
      reporter:reporter_id(id, nickname, email, avatar_url)
    `
  );

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  return { data, error };
}

/**
 * 处理内容举报为"已解决"（违规内容已删除）
 * @param {string} reportId - 举报ID
 * @param {string} adminNote - 管理员处理备注
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function resolveReport(reportId, adminNote, handledBy) {
  if (!reportId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：reportId, handledBy',
    };
  }

  try {
    // 1. 获取举报信息
    const { data: report, error: fetchError } = await supabase
      .from('content_reports')
      .select('reporter_id, target_type, target_id')
      .eq('id', reportId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新举报状态为已处理
    const { data: updatedReport, error: updateError } = await supabase
      .from('content_reports')
      .update({
        status: 'approved',
        admin_note: adminNote,
      })
      .eq('id', reportId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 发送举报处理通知给举报人
    await createReportFeedbackNotification(
      report.reporter_id,
      'approved',
      report.target_type,
      reportId
    );

    return { data: updatedReport, error: null };
  } catch (error) {
    return { data: null, error: error.message || '处理举报失败' };
  }
}

/**
 * 驳回举报（认为举报内容无违规）
 * @param {string} reportId - 举报ID
 * @param {string} adminNote - 管理员驳回备注
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function dismissReport(reportId, adminNote, handledBy) {
  if (!reportId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：reportId, handledBy',
    };
  }

  try {
    // 1. 获取举报信息
    const { data: report, error: fetchError } = await supabase
      .from('content_reports')
      .select('reporter_id, target_type, target_id')
      .eq('id', reportId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新举报状态为已驳回
    const { data: updatedReport, error: updateError } = await supabase
      .from('content_reports')
      .update({
        status: 'rejected',
        admin_note: adminNote,
      })
      .eq('id', reportId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 发送举报驳回通知给举报人
    await createReportFeedbackNotification(
      report.reporter_id,
      'rejected',
      report.target_type,
      reportId
    );

    return { data: updatedReport, error: null };
  } catch (error) {
    return { data: null, error: error.message || '驳回举报失败' };
  }
}

/**
 * 删除违规帖子
 * @param {string} postId - 帖子ID
 * @param {string} deletedBy - 删除者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function deletePost(postId, deletedBy) {
  if (!postId || !deletedBy) {
    return { data: null, error: '缺少必要参数：postId, deletedBy' };
  }

  try {
    // 1. 获取帖子信息（用于权限检查）
    const { error: fetchError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 删除帖子
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    return { data: { deletedPostId: postId }, error: null };
  } catch (error) {
    return { data: null, error: error.message || '删除帖子失败' };
  }
}

/**
 * 删除违规评论
 * @param {string} commentId - 评论ID
 * @param {string} deletedBy - 删除者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function deleteComment(commentId, deletedBy) {
  if (!commentId || !deletedBy) {
    return { data: null, error: '缺少必要参数：commentId, deletedBy' };
  }

  try {
    // 删除评论
    const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    return { data: { deletedCommentId: commentId }, error: null };
  } catch (error) {
    return { data: null, error: error.message || '删除评论失败' };
  }
}

/**
 * =====================
 * 班日志审核相关函数
 * =====================
 */

/**
 * 获取班日志查档申请列表
 * @param {string} status - 申请状态 (pending/approved/rejected)，为空时获取所有
 * @returns {Promise<Object>}
 */
export async function getJournalAccessRequests(status = null) {
  let query = supabase.from('journal_access_requests').select(
    `
      *,
      requester:requester_id(id, nickname, email, avatar_url)
    `
  );

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  return { data, error };
}

/**
 * 批准班日志查档申请
 * @param {string} requestId - 查档申请ID
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function approveJournalAccess(requestId, handledBy) {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息，包含查档天数
    const { data: request, error: fetchError } = await supabase
      .from('journal_access_requests')
      .select('requester_id, requested_access_days')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    if (!request.requested_access_days) {
      return { data: null, error: '申请中缺少查档天数信息' };
    }

    // 2. 计算时间范围
    // 开始时间 = 批准时的日期的 00:00:00
    // 结束时间 = 开始时间 + 申请天数天
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + request.requested_access_days);
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(
      startDate.getDate()
    ).padStart(2, '0')}`;
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(
      endDate.getDate()
    ).padStart(2, '0')}`;

    // 3. 更新申请状态为批准，并设置时间范围
    const { data: updatedRequest, error: updateError } = await supabase
      .from('journal_access_requests')
      .update({
        status: 'approved',
        requested_access_start_time: startDateStr,
        requested_access_end_time: endDateStr,
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 4. 发送审核通过通知
    await createAuditResultNotification(request.requester_id, 'approved', '班日志查档', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return { data: null, error: error.message || '批准查档申请失败' };
  }
}

/**
 * 驳回班日志查档申请
 * @param {string} requestId - 查档申请ID
 * @param {string} handledBy - 处理者ID（管理员）
 * @returns {Promise<Object>}
 */
export async function rejectJournalAccess(requestId, handledBy) {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息
    const { data: request, error: fetchError } = await supabase
      .from('journal_access_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新申请状态为驳回
    const { data: updatedRequest, error: updateError } = await supabase
      .from('journal_access_requests')
      .update({
        status: 'rejected',
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 发送审核驳回通知
    await createAuditResultNotification(request.requester_id, 'rejected', '班日志查档', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return { data: null, error: error.message || '驳回查档申请失败' };
  }
}

/**
 * =====================
 * 管理员权限申请相关函数
 * =====================
 */

/**
 * 管理员申请权限变更
 * @param {string} requesterId - 申请者ID（管理员）
 * @param {Object} requestedPermissions - 申请的新权限配置
 * @param {string} reason - 申请理由
 * @returns {Promise<Object>}
 */
export async function submitPermissionChangeRequest(requesterId, requestedPermissions, reason) {
  if (!requesterId || !requestedPermissions || !reason) {
    return {
      data: null,
      error: '缺少必要参数：requesterId, requestedPermissions, reason',
    };
  }

  const { data, error } = await supabase
    .from('admin_requests')
    .insert([
      {
        requester_id: requesterId,
        requested_permissions: requestedPermissions,
        reason: reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

/**
 * 获取管理员的权限变更申请列表
 * @param {string} status - 申请状态 (pending/approved/rejected)，为空时获取所有
 * @returns {Promise<Object>}
 */
export async function getPermissionChangeRequests(status = null) {
  let query = supabase.from('admin_requests').select(
    `
      *,
      requester:requester_id(id, nickname, email, role),
      handler:handled_by(id, nickname)
    `
  );

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  return { data, error };
}

/**
 * Superuser 批准管理员权限变更申请
 * @param {string} requestId - 权限变更申请ID
 * @param {string} handledBy - 处理者ID（Superuser）
 * @returns {Promise<Object>}
 */
export async function approvePermissionChangeRequest(requestId, handledBy, adminNote = '') {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息
    const { data: request, error: fetchError } = await supabase
      .from('admin_requests')
      .select('requester_id, requested_permissions')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新申请状态为批准
    const { data: updatedRequest, error: updateError } = await supabase
      .from('admin_requests')
      .update({
        status: 'approved',
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
        admin_note: adminNote,
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 更新管理员的实际权限
    const { error: permError } = await supabase
      .from('admin_permissions')
      .update({
        ...request.requested_permissions,
        updated_at: new Date().toISOString(),
      })
      .eq('admin_id', request.requester_id);

    if (permError) {
      return { data: null, error: permError.message };
    }

    // 4. 发送通知
    await createAuditResultNotification(request.requester_id, 'approved', '权限变更', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.message || '批准权限变更请求失败',
    };
  }
}

/**
 * Superuser 驳回管理员权限变更申请
 * @param {string} requestId - 权限变更申请ID
 * @param {string} handledBy - 处理者ID（Superuser）
 * @returns {Promise<Object>}
 */
export async function rejectPermissionChangeRequest(requestId, handledBy, adminNote = '') {
  if (!requestId || !handledBy) {
    return {
      data: null,
      error: '缺少必要参数：requestId, handledBy',
    };
  }

  try {
    // 1. 获取申请信息
    const { data: request, error: fetchError } = await supabase
      .from('admin_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // 2. 更新申请状态为驳回
    const { data: updatedRequest, error: updateError } = await supabase
      .from('admin_requests')
      .update({
        status: 'rejected',
        handled_by: handledBy,
        handled_at: new Date().toISOString(),
        admin_note: adminNote,
      })
      .eq('id', requestId)
      .select();

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    // 3. 发送通知
    await createAuditResultNotification(request.requester_id, 'rejected', '权限变更', requestId);

    return { data: updatedRequest, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.message || '驳回权限变更请求失败',
    };
  }
}

/**
 * =====================
 * Superuser 管理员任免相关函数
 * =====================
 */

/**
 * Superuser 任命用户为管理员
 * @param {string} userId - 要任命的用户ID
 * @param {Object} permissions - 初始权限配置
 * @param {string} grantedBy - 授权者ID（Superuser）
 * @returns {Promise<Object>}
 */
export async function appointAdmin(userId, permissions, grantedBy) {
  if (!userId || !permissions || !grantedBy) {
    return {
      data: null,
      error: '缺少必要参数：userId, permissions, grantedBy',
    };
  }

  try {
    // 1. 检查用户是否为本班同学
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('identity_type, role')
      .eq('id', userId)
      .single();

    if (userError) {
      return { data: null, error: userError.message };
    }

    if (user.identity_type !== 'classmate') {
      return {
        data: null,
        error: '只有本班同学可以成为管理员',
      };
    }

    // 2. 更新用户角色为 admin
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);

    if (roleError) {
      return { data: null, error: roleError.message };
    }

    // 3. 创建管理员权限记录
    const { data: adminPermData, error: permError } = await supabase
      .from('admin_permissions')
      .insert([
        {
          admin_id: userId,
          ...permissions,
          granted_by: grantedBy,
          granted_at: new Date().toISOString(),
        },
      ])
      .select();

    if (permError) {
      return { data: null, error: permError.message };
    }

    return { data: adminPermData, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.message || '任命管理员失败',
    };
  }
}

/**
 * Superuser 撤销用户的管理员身份
 * @param {string} adminId - 管理员ID
 * @param {string} removedBy - 撤销者ID（Superuser）
 * @returns {Promise<Object>}
 */
export async function removeAdmin(adminId, removedBy) {
  if (!adminId || !removedBy) {
    return {
      data: null,
      error: '缺少必要参数：adminId, removedBy',
    };
  }

  try {
    // 1. 更新用户角色为 user
    const { error: roleError } = await supabase
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', adminId);

    if (roleError) {
      return { data: null, error: roleError.message };
    }

    // 2. 删除管理员权限记录
    const { error: permError } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('admin_id', adminId);

    if (permError) {
      return { data: null, error: permError.message };
    }

    return { data: { removedAdminId: adminId }, error: null };
  } catch (error) {
    return {
      data: null,
      error: error.message || '撤销管理员失败',
    };
  }
}

/**
 * Superuser 获取所有管理员及其权限
 * @returns {Promise<Object>}
 */
export async function getAllAdmins() {
  try {
    const { data, error } = await supabase.from('admin_permissions').select(
      `
        *,
        admin:admin_id(
          id,
          nickname,
          email,
          avatar_url,
          identity_type,
          created_at
        )
      `
    );

    return { data, error };
  } catch (error) {
    return { data: null, error: error.message || '获取管理员列表失败' };
  }
}

/**
 * =====================
 * 系统公告相关函数
 * =====================
 */

/**
 * Superuser 发布系统公告
 * @param {string} title - 公告标题
 * @param {string} content - 公告内容
 * @param {string} publishedBy - 发布者ID（Superuser）
 * @param {Array<string>} targetIdentities - 目标身份数组，为空时发送给所有用户
 * @returns {Promise<Object>} { insertedCount, error }
 */
export async function publishSystemAnnouncement(
  title,
  content,
  publishedBy,
  targetIdentities = []
) {
  return await createSystemAnnouncementNotification(title, content, publishedBy, targetIdentities);
}
