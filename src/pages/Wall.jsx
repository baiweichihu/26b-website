import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/features/post/PostCard';
import styles from './Wall.module.css';

const Wall = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setPosts(data || []);
      } catch (err) {
        console.error('加载帖子失败:', err);
        setError('无法加载帖子，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">班级留言墙</p>
          <h1 className="scene-title">共享笔记与回响</h1>
          <p className="scene-subtitle">留下留言、庆祝里程碑，或为班级写下一段短短的回忆。</p>
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
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Wall;
