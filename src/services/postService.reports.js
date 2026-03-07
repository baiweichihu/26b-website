import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import { getAuthenticatedUser } from './postService.helpers.js';

/**
 * 提交举报
 * @param {Object} payload
 * @param {'post'|'comment'} payload.targetType
 * @param {string} payload.targetId
 * @param {string} payload.reason
 * @param {string} payload.suggestion
 */
export const createReportTicket = async ({ targetType, targetId, reason, suggestion }) => {
  try {
    if (!targetType || !targetId) {
      throw new Error('举报对象不能为空');
    }
    if (!reason || !reason.trim()) {
      throw new Error('请填写举报原因');
    }

    const user = await getAuthenticatedUser();
    const safeSuggestion = suggestion?.trim() || null;

    let targetContent = null;
    let targetAuthorId = null;
    let targetAuthorNickname = null;

    if (targetType === 'post') {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('content, author_id, author:profiles!posts_author_id_fkey(nickname)')
        .eq('id', targetId)
        .single();

      if (!postError && post) {
        targetContent = post.content;
        targetAuthorId = post.author_id;
        targetAuthorNickname = post.author?.nickname || '未知用户';
      }
    } else if (targetType === 'comment') {
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .select('content, author_id, author:profiles!comments_author_id_fkey(nickname)')
        .eq('id', targetId)
        .single();

      if (!commentError && comment) {
        targetContent = comment.content;
        targetAuthorId = comment.author_id;
        targetAuthorNickname = comment.author?.nickname || '未知用户';
      }
    }

    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      target_content: targetContent,
      target_author_id: targetAuthorId,
      target_author_nickname: targetAuthorNickname,
      reason: reason.trim(),
      suggestion: safeSuggestion,
      status: 'pending',
      admin_note: null,
    });

    if (error) {
      throw new Error(`提交举报失败: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    logger.error('createReportTicket error:', error);
    return { success: false, error: error.message };
  }
};
