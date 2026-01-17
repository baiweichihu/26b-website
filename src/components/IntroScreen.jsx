import React, { useState, useEffect } from 'react';
import styles from './IntroScreen.module.css';

const IntroScreen = ({ onEnter }) => {
    const [schoolOpacity, setSchoolOpacity] = useState(1);
    const [classOpacity, setClassOpacity] = useState(0);

    useEffect(() => {
        // 锁定页面滚动
        document.body.style.overflow = 'hidden';

        // 任意键进入
        const handleKeydown = () => onEnter();
        window.addEventListener('keydown', handleKeydown, { once: true });

        return () => {
            // 清理：恢复滚动
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [onEnter]);

    const handleMouseMove = (e) => {
        const width = window.innerWidth;
        const progress = Math.min(Math.max(e.clientX / width, 0), 1);
        setSchoolOpacity(1 - progress);
        setClassOpacity(progress);
    };

    return (
        <div 
            className={styles.introScreen}
            onMouseMove={handleMouseMove}
            onClick={onEnter}
            onTouchStart={onEnter}
        >
            <div className={styles.introIcon}>
                <div className={styles.iconMorph}>
                    <img 
                        src="/bjbz_icon.webp" 
                        className={styles.icon}
                        alt="校徽"
                        style={{ opacity: schoolOpacity }}
                    />
                    <img 
                        src="/shao26b_icon.jpg" 
                        className={styles.icon}
                        alt="班徽"
                        style={{ opacity: classOpacity }}
                    />
                </div>
                <p className={styles.introHint}>点击进入班级主页</p>
            </div>
        </div>
    );
};

export default IntroScreen;
