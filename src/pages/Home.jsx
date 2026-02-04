import React from 'react';
import { Link } from 'react-router-dom';
import { useIrisTransition } from '../components/ui/IrisTransition';

const Home = () => {
  const { triggerIris } = useIrisTransition();
  return (
    <div className="page-content scene-page">
      <section className="scene-hero scene-surface">
        <div>
          <p className="scene-kicker">少26B班班级网站</p>
          <h1 className="scene-title">光阴似箭，日月如梭</h1>
          <p className="scene-subtitle">人物，故事，记忆...</p>
          <div className="scene-actions">
            <Link
              to="/lobby"
              className="scene-button primary"
              onClick={(event) => triggerIris?.(event, '/lobby')}
            >
              <i className="fas fa-compass"></i>
              26B，启动！
            </Link>
            <Link
              to="/journal"
              className="scene-button ghost"
              onClick={(event) => triggerIris?.(event, '/journal')}
            >
              <i className="fas fa-book-open"></i>
              班级日志
            </Link>
          </div>
        </div>
        <div className="scene-orb" aria-hidden="true">
          <span className="scene-orb-core"></span>
          <span className="scene-orb-ring"></span>
        </div>
      </section>

      <section className="scene-grid">
        <div className="scene-card">
          <i className="fas fa-users scene-icon"></i>
          <h3>人物志</h3>
          <p>认识我们优秀的教师团队，展示少26B班风采</p>
        </div>
        <div className="scene-card">
          <i className="fas fa-camera scene-icon"></i>
          <h3>大事纪</h3>
          <p>记录精彩的班级活动瞬间</p>
        </div>
        <div className="scene-card">
          <i className="fas fa-pen scene-icon"></i>
          <h3>班级墙</h3>
          <p>畅谈往事近况</p>
        </div>
        <div className="scene-card">
          <i className="fas fa-envelope scene-icon"></i>
          <h3>联系我们</h3>
          <p>欢迎联系我们！</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
