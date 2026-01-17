import React, { useState, useEffect } from 'react';
import styles from './IntroScreen.module.css';

const IntroScreen = ({ onEnter }) => {
    const [schoolOpacity, setSchoolOpacity] = useState(1);
    const [classOpacity, setClassOpacity] = useState(0);
    const [exiting, setExiting] = useState(false);

    const triggerExit = React.useCallback(() => {
        if (exiting) return;
        setExiting(true);

        // 等动画结束再进入主页
        setTimeout(onEnter, 600);
    }, [exiting, onEnter]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        const handleKeydown = () => triggerExit();
        window.addEventListener('keydown', handleKeydown, { once: true });

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [triggerExit]);

    const handleMouseMove = (e) => {
        if (exiting) return;

        const progress = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1);
        setSchoolOpacity(1 - progress);
        setClassOpacity(progress);
    };

    return (
        <div
            className={`${styles.introScreen} ${exiting ? styles.fadeOut : ''}`}
            onMouseMove={handleMouseMove}
            onClick={triggerExit}
            onTouchStart={triggerExit}
        >
            <div className={styles.introIcon}>
                <div className={styles.iconMorph}>
                    <img
                        src={`${import.meta.env.BASE_URL}bjbz_icon.webp`}
                        className={styles.icon}
                        alt="校徽"
                        style={{ opacity: schoolOpacity }}
                    />
                    <img
                        src={`${import.meta.env.BASE_URL}shao26b_icon.jpg`}
                        className={styles.icon}
                        alt="班徽"
                        style={{ opacity: classOpacity }}
                    />
                </div>
                <p className={styles.introHint}>
                    按任意键进入班级主页
                </p>
            </div>
        </div>
    );
};

export default IntroScreen;
