import React, { useEffect } from 'react';

const Contact = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="page-content scene-page">
      <section className="scene-panel scene-hero">
        <div>
          <p className="scene-kicker">联系入口</p>
          <h1 className="scene-title">你是我们前行的动力</h1>
          <p className="scene-subtitle">
            对网站内容，UI的改进建议，或想参与网站开发，都可以留言哦QwQ
          </p>
          <div className="scene-actions">
            <a className="scene-button primary" href="mailto:lilinfeng200801@gmail.com">
              <i className="fas fa-envelope"></i>
              发送邮件
            </a>
          </div>
        </div>
        <div className="scene-orb" aria-hidden="true">
          <span className="scene-orb-core"></span>
          <span className="scene-orb-ring"></span>
        </div>
      </section>
    </div>
  );
};

export default Contact;
