
import React, { useEffect } from 'react';
import styles from './Contact.module.css';

const Contact = () => {
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
        <div className={`${styles.pageContent} active`}>
            <div className="text-center">            
                <div className="alert alert-info mt-4">
                    <i className="fas fa-info-circle me-2"></i>
                    网站正在建设中，敬请期待。
                </div>
                {/* 新增联系邮箱部分 */}
                <div className={`${styles.contactEmail} mt-4 p-3 rounded`}>
                    <h5 className="mb-3">如有疑问请联系：</h5>
                    <div className="d-inline-block">
                        <a href="mailto:lilinfeng200801@gmail.com" className="btn btn-outline-primary btn-lg">
                            <i className="fas fa-envelope me-2"></i>lilinfeng200801@gmail.com
                        </a>
                    </div>
                    <p className="text-muted mt-2">点击邮箱地址可直接发送邮件</p>
                </div>
            </div>
        </div>
    );
};

export default Contact;
