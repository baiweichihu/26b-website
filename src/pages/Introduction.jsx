import React from 'react';

const Introduction = () => {
  return (
    <div className="page-content scene-page">
      <section className="scene-panel scene-hero">
        <div>
          <p className="scene-kicker">人物中心</p>
          <h1 className="scene-title">永远鲜活烂漫的生命</h1>
          <p className="scene-subtitle">珍惜每一次来之不易的相遇</p>
        </div>
        <div className="scene-orb" aria-hidden="true">
          <span className="scene-orb-core"></span>
          <span className="scene-orb-ring"></span>
        </div>
      </section>
    </div>
  );
};

export default Introduction;
