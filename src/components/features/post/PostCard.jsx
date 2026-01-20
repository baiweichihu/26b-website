import React from 'react';
import styles from './PostCard.module.css';

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
};

export default PostCard;
