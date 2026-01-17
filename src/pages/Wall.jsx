
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
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

    const PostCard = ({ post }) => {
         const date = new Date(post.created_at);
            const formattedDate = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const authorName = post.author_name || '匿名';
            const avatarText = authorName.charAt(0);

            return (
                <div className="col-12 col-md-6 col-lg-4">
                    <div className={styles.postCard}>
                        <div className="d-flex align-items-center mb-3">
                            <div className="me-3">
                                <div className={styles.avatarCircle}>
                                    <span>{avatarText}</span>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className={styles.postAuthorName}>{authorName}</span>
                                    <span className={`${styles.postDate} text-muted small`}>{formattedDate}</span>
                                </div>
                            </div>
                        </div>
                        
                        <h5 className={`${styles.postTitle} fw-bold mb-2`}>{post.title || '无标题'}</h5>
                        
                        <div className={`${styles.postContent} mb-3`}>
                            {post.content}
                        </div>
                        
                        <div className="d-flex justify-content-end">
                            <div className={styles.postLikes}>
                                <i className="fas fa-heart me-1"></i>
                                <span className="likes-count">{post.likes || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
    }

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
