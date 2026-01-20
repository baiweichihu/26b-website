import React, { useState, useEffect } from 'react';

const THEMES = ['light', 'dark', 'system'];

const ThemeToggle = () => {
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('theme') || 'system';
    });

    // 应用主题
    const applyTheme = (theme) => {
        const root = document.documentElement;
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', theme);
        }
    };

    // 初始化时应用主题
    useEffect(() => {
        applyTheme(currentTheme);
    }, [currentTheme]);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (currentTheme === 'system') {
                applyTheme('system');
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [currentTheme]);

    // 切换主题
    const handleToggle = () => {
        const index = THEMES.indexOf(currentTheme);
        const nextTheme = THEMES[(index + 1) % THEMES.length];
        setCurrentTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    // 获取图标
    const getIcon = () => {
        switch (currentTheme) {
            case 'light':
                return 'fa-sun';
            case 'dark':
                return 'fa-moon';
            case 'system':
            default:
                return 'fa-circle-half-stroke';
        }
    };

    return (
        <button 
            id="themeToggle" 
            className="btn btn-outline-secondary btn-sm"
            onClick={handleToggle}
            aria-label="切换主题"
        >
            <i id="themeIcon" className={`fas ${getIcon()}`}></i>
        </button>
    );
};

export default ThemeToggle;
