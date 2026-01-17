
import React from 'react';

const Home = () => {
    return (
        <div className="page-content active">
            <div className="text-center">
                <h2 className="mb-4">欢迎来到少26B班网站</h2>
                <p className="lead">这里是北京八中少26B班网站，记录我们的学习、生活和成长点滴。</p>
                
                <div className="alert alert-info mt-4">
                    <i className="fas fa-info-circle me-2"></i>
                    网站正在建设中，敬请期待。
                </div>
                
                <div className="row mt-5">
                    <div className="col-md-3 mb-3">
                        <div className="card border-info h-100">
                            <div className="card-body text-center">
                                <i className="fas fa-users fa-3x text-info mb-3"></i>
                                <h5 className="card-title">班级介绍</h5>
                                <p className="card-text">展示少26B班的特色和风采</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card border-warning h-100">
                            <div className="card-body text-center">
                                <i className="fas fa-chalkboard-teacher fa-3x text-warning mb-3"></i>
                                <h5 className="card-title">教师介绍</h5>
                                <p className="card-text">认识我们的优秀教师团队</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card border-success h-100">
                            <div className="card-body text-center">
                                <i className="fas fa-camera fa-3x text-success mb-3"></i>
                                <h5 className="card-title">活动记录</h5>
                                <p className="card-text">记录精彩的班级活动瞬间</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 mb-3">
                        <div className="card border-danger h-100">
                            <div className="card-body text-center">
                                <i className="fas fa-book-open fa-3x text-danger mb-3"></i>
                                <h5 className="card-title">班级日志</h5>
                                <p className="card-text">分享日常学习和生活点滴</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
