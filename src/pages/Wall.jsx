import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/features/post/PostCard';
import {
  createPost,
  getPosts,
  togglePostLike,
  getComments,
  addComment,
  toggleCommentLike,
  searchPosts,
} from '../services/postService';
import { signIn } from '../services/userService';
import styles from './Wall.module.css';

const Wall = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [replyTargetByPost, setReplyTargetByPost] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchHashtag, setSearchHashtag] = useState('');
  const [searchSortBy, setSearchSortBy] = useState('time');

  const loadCommentsForPosts = useCallback(async (postList) => {
    const resultMap = {};

    await Promise.all(
      (postList || []).map(async (post) => {
        const result = await getComments(post.id);
        if (result.success) {
          resultMap[post.id] = result.data || [];
        }
      })
    );

    setCommentsByPost(resultMap);
  }, []);

  const refreshPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPosts();
      if (!result.success) {
        throw new Error(result.error || '无法加载帖子');
      }

      const nextPosts = result.data || [];
      setPosts(nextPosts);
      await loadCommentsForPosts(nextPosts);
      return true;
    } catch (err) {
      console.error('加载帖子失败:', err);
      setError('无法加载帖子，请稍后再试。');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCommentsForPosts]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  // 测试 signIn + createPost 函数
  const handleTestCreatePost = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      // 1. 先登录
      console.log('1️⃣ 开始登录...');
      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      console.log('登录结果:', loginResult);

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      console.log('✅ 登录成功');

      // 2. 然后发帖
      console.log('2️⃣ 开始创建帖子...');
      const testPostData = {
        content: '这是一条测试帖子 - 测试登录+发帖流程 ' + new Date().toLocaleTimeString(),
        visibility: 'public',
        is_anonymous: false,
      };

      console.log('调用 createPost，参数:', testPostData);
      const postResult = await createPost(testPostData);

      console.log('createPost 返回结果:', postResult);

      if (postResult.success) {
        setTestMessage(`✅ 登录成功！帖子创建成功！ID: ${postResult.data.id}`);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // 测试带图片的发帖
  const handleTestCreatePostWithImage = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      // 1. 先登录
      console.log('1️⃣ 开始登录...');
      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      console.log('登录结果:', loginResult);

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      console.log('✅ 登录成功');

      // 2. 然后发帖（带图片）
      console.log('2️⃣ 开始创建带图片的帖子...');
      const testPostData = {
        content: '这是一条带图片的测试帖子 ' + new Date().toLocaleTimeString(),
        visibility: 'public',
        is_anonymous: false,
        media_urls: ['https://picsum.photos/400/300?random=1'],
      };

      console.log('调用 createPost，参数:', testPostData);
      const postResult = await createPost(testPostData);

      console.log('createPost 返回结果:', postResult);

      if (postResult.success) {
        setTestMessage(`✅ 登录成功！带图片帖子创建成功！ID: ${postResult.data.id}`);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // 测试匿名发帖
  const handleTestCreateAnonymousPost = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      console.log('1️⃣ 开始登录...');
      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      const testPostData = {
        content: '这是一条匿名测试帖子 ' + new Date().toLocaleTimeString(),
        visibility: 'public',
        is_anonymous: true,
      };

      const postResult = await createPost(testPostData);

      if (postResult.success) {
        setTestMessage(`✅ 匿名帖子创建成功！ID: ${postResult.data.id}`);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // 测试内容缩略（约200字符）
  const handleTestCreateLongPost = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      const longContent =
        '这是一条用于测试内容缩略功能的长帖子。为了达到大约两百个字符的长度，这里会继续补充一些描述性的文字。内容包含若干句子，用于验证超过150字符后会显示为缩略，并且点击展开后能够完整显示。最后再添加一些补充说明，使整体长度超过限制。这是一条用于测试内容缩略功能的长帖子。为了达到大约两百个字符的长度，这里会继续补充一些描述性的文字。内容包含若干句子，用于验证超过150字符后会显示为缩略，并且点击展开后能够完整显示。最后再添加一些补充说明，使整体长度超过限制。这是一条用于测试内容缩略功能的长帖子。为了达到大约两百个字符的长度，这里会继续补充一些描述性的文字。内容包含若干句子，用于验证超过150字符后会显示为缩略，并且点击展开后能够完整显示。最后再添加一些补充说明，使整体长度超过限制。这是一条用于测试内容缩略功能的长帖子。为了达到大约两百个字符的长度，这里会继续补充一些描述性的文字。内容包含若干句子，用于验证超过150字符后会显示为缩略，并且点击展开后能够完整显示。最后再添加一些补充说明，使整体长度超过限制。';

      const postResult = await createPost({
        content: longContent,
        visibility: 'public',
        is_anonymous: false,
      });

      if (postResult.success) {
        setTestMessage(`✅ 长内容帖子创建成功！ID: ${postResult.data.id}`);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestTogglePostLike = async (postId) => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const result = await togglePostLike(postId);
      if (result.success) {
        setTestMessage(`✅ 帖子${result.data.liked ? '点赞' : '取消点赞'}成功`);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 操作失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestGetComments = async (postId) => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const result = await getComments(postId);
      if (result.success) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: result.data || [],
        }));
        setTestMessage(`✅ 获取评论成功 (${(result.data || []).length} 条)`);
      } else {
        setTestMessage(`❌ 获取评论失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestAddComment = async (postId, postComments = []) => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const draft = commentDrafts[postId] || '';
      if (!draft.trim()) {
        setTestMessage('❌ 评论内容不能为空');
        return;
      }

      const replyTargetId = replyTargetByPost[postId] || '';
      const replyTargetComment = replyTargetId
        ? postComments.find((comment) => comment.id === replyTargetId)
        : null;
      const replyToUserId = replyTargetComment?.author_id || null;

      const result = await addComment(postId, draft.trim(), replyTargetId || null, replyToUserId);
      if (result.success) {
        setCommentDrafts((prev) => ({
          ...prev,
          [postId]: '',
        }));
        setReplyTargetByPost((prev) => ({
          ...prev,
          [postId]: '',
        }));
        setTestMessage('✅ 评论发布成功');
        await handleTestGetComments(postId);
        await refreshPosts();
      } else {
        setTestMessage(`❌ 评论失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestToggleCommentLike = async (postId, commentId) => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      if (!commentId) {
        setTestMessage('❌ 当前没有可点赞的评论');
        return;
      }

      const result = await toggleCommentLike(commentId);
      if (result.success) {
        setTestMessage(`✅ 评论${result.data.liked ? '点赞' : '取消点赞'}成功`);
        await handleTestGetComments(postId);
      } else {
        setTestMessage(`❌ 操作失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSimulateOtherView = async (post) => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const nextViewCount = (post.view_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('posts')
        .update({ view_count: nextViewCount })
        .eq('id', post.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setTestMessage('✅ 已模拟他人浏览（强制增加浏览量）');
      await refreshPosts();
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestSearch = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      const result = await searchPosts({
        keyword: searchKeyword,
        hashtag: searchHashtag,
        sortBy: searchSortBy,
      });

      if (result.success) {
        const nextPosts = result.data || [];
        setPosts(nextPosts);
        await loadCommentsForPosts(nextPosts);
        setTestMessage(`✅ 搜索完成 (${(result.data || []).length} 条)`);
      } else {
        setTestMessage(`❌ 搜索失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleResetSearch = async () => {
    setSearchKeyword('');
    setSearchHashtag('');
    setSearchSortBy('time');
    await refreshPosts();
  };

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">班级留言墙</p>
          <h1 className="scene-title">共享笔记与回响</h1>
          <p className="scene-subtitle">留下留言、庆祝里程碑，或为班级写下一段短短的回忆。</p>

          {/* 测试按钮 */}
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handleTestCreatePost}
              disabled={testLoading}
              className="btn btn-outline-primary btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '🧪 测试登录+发帖'}
            </button>
            <button
              onClick={handleTestCreatePostWithImage}
              disabled={testLoading}
              className="btn btn-outline-success btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '🖼️ 测试发帖(带图片)'}
            </button>
            <button
              onClick={handleTestCreateAnonymousPost}
              disabled={testLoading}
              className="btn btn-outline-secondary btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '🕶️ 测试匿名发帖'}
            </button>
            <button
              onClick={handleTestCreateLongPost}
              disabled={testLoading}
              className="btn btn-outline-dark btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '📝 测试内容缩略'}
            </button>
            {testMessage && (
              <span style={{ fontSize: '14px', marginLeft: '10px' }}>{testMessage}</span>
            )}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索关键词"
              className="form-control form-control-sm"
              style={{ maxWidth: '180px' }}
            />
            <input
              type="text"
              value={searchHashtag}
              onChange={(event) => setSearchHashtag(event.target.value)}
              placeholder="标签(#可选)"
              className="form-control form-control-sm"
              style={{ maxWidth: '180px' }}
            />
            <select
              value={searchSortBy}
              onChange={(event) => setSearchSortBy(event.target.value)}
              className="form-select form-select-sm"
              style={{ maxWidth: '140px' }}
            >
              <option value="time">按时间</option>
              <option value="likes">按点赞</option>
            </select>
            <button
              onClick={handleTestSearch}
              disabled={testLoading}
              className="btn btn-outline-primary btn-sm"
            >
              {testLoading ? '测试中...' : '🔍 搜索'}
            </button>
            <button
              onClick={handleResetSearch}
              disabled={testLoading}
              className="btn btn-outline-secondary btn-sm"
            >
              重置
            </button>
          </div>
        </div>

        {loading && (
          <div className={styles.stateBlock}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <p className={styles.stateText}>正在加载帖子...</p>
          </div>
        )}

        {error && (
          <div className={`alert alert-danger ${styles.stateBlock}`} role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className={styles.stateBlock}>
            <div className={styles.emptyState}>
              <i className="fas fa-comment-slash fa-3x mb-3"></i>
              <h4>暂无帖子</h4>
              <p>成为第一个为 26B 班留言的人。</p>
            </div>
          </div>
        )}

        <div className="row g-4">
          {posts.map((post) => {
            const postComments = commentsByPost[post.id] || [];
            const draftValue = commentDrafts[post.id] || '';
            const replyValue = replyTargetByPost[post.id] || '';

            return (
              <PostCard
                key={post.id}
                post={post}
                comments={postComments}
                commentDraft={draftValue}
                replyTarget={replyValue}
                testLoading={testLoading}
                onToggleLike={() => handleTestTogglePostLike(post.id)}
                onSimulateView={() => handleSimulateOtherView(post)}
                onCommentDraftChange={(value) =>
                  setCommentDrafts((prev) => ({
                    ...prev,
                    [post.id]: value,
                  }))
                }
                onReplyTargetChange={(value) =>
                  setReplyTargetByPost((prev) => ({
                    ...prev,
                    [post.id]: value,
                  }))
                }
                onAddComment={() => handleTestAddComment(post.id, postComments)}
                onToggleCommentLike={(commentId) => handleTestToggleCommentLike(post.id, commentId)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Wall;
