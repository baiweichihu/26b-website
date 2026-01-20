
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
                
                console.log('正在从Supabase获取帖子数据...');
                const { data, error: fetchError } = await supabase
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;

                console.log('获取到帖子数据:', data);
                setPosts(data || []);
            } catch (err) {
                console.error('加载帖子失败:', err);
                setError('加载失败，请稍后重试');
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    return (
        <div className={`${styles.pageContent} active`}>
             <div className="container">
                <div className="text-center mb-5">
                    <h2 className="mb-3"><i className="fas fa-pen-square me-2"></i>班级墙</h2>
                    <p className="text-muted">这里是少26B班的留言墙，记录我们的点滴和回忆</p>
                </div>
                
                {loading && (
                    <div className="text-center my-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">加载中...</span>
                        </div>
                        <p className="mt-3">正在加载帖子...</p>
                    </div>
                )}
                
                {error && (
                    <div className="alert alert-danger text-center" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <span>{error}</span>
                    </div>
                )}
                
                {!loading && !error && posts.length === 0 && (
                     <div className="text-center my-5">
                        <div className={`${styles.emptyState} py-5`}>
                            <i className="fas fa-comment-slash fa-4x text-muted mb-4"></i>
                            <h4 className="text-muted mb-3">暂无帖子</h4>
                            <p className="text-muted">还没有人发帖，快来分享你的想法吧！</p>
                        </div>
                    </div>
                )}

                <div className="row g-4">
                    {posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Wall;
