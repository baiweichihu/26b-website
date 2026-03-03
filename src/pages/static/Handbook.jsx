import React from 'react';

const Handbook = () => {
  return (
    <div className="page-content scene-page">
      <section className="scene-panel scene-hero">
        <div>
          <p className="scene-kicker">成长手册</p>
          <h1 className="scene-title">成长相册即将上线</h1>
          <p className="scene-subtitle">这里将记录同学们的成长足迹，敬请期待。</p>
        </div>
        <div className="scene-orb" aria-hidden="true">
          <span className="scene-orb-core"></span>
          <span className="scene-orb-ring"></span>
        </div>
      </section>
    </div>
  );
};

export default Handbook;
