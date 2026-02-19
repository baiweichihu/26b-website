import React from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useIrisTransition } from '../ui/IrisTransition';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  {
    to: '/introduction',
    label: '介绍',
    subtitle: '人物与故事',
    icon: 'fa-users',
  },
  {
    to: '/activities',
    label: '大事纪',
    subtitle: '影像与瞬间',
    icon: 'fa-images',
  },
  {
    to: '/journal',
    label: '班日志',
    subtitle: '分享学习与生活点滴',
    icon: 'fa-book-open',
  },
  {
    to: '/wall',
    label: '班级墙',
    subtitle: '留言与回响',
    icon: 'fa-pen-square',
  },
  {
    to: '/contact',
    label: '联系我们',
    subtitle: '给可爱的白尾赤狐发送邮件吧',
    icon: 'fa-envelope',
  },
];

const Navbar = () => {
  const { triggerIris } = useIrisTransition();
  return (
    <nav className={styles.lobbyNav} aria-label="主导航">
      <div className={styles.lobbyShell}>
        <div className={styles.lobbyContent}>
          <div className={styles.lobbyHeader}>
            <div>
              <p className={styles.kicker}>旅程的起点...</p>
              <h2 className={styles.title}>开启26B班的时间胶囊</h2>
              <p className={styles.subtitle}>请确保系好安全带，收起小桌板...</p>
            </div>
            <div className={styles.tools}>
              <ThemeToggle />
            </div>
          </div>

          <ul className={styles.lobbyGrid}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to} className={styles.gridItem}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.lobbyCard} ${isActive ? styles.active : ''}`
                  }
                  end={item.to === '/'}
                  draggable={false}
                  onClick={(event) => triggerIris?.(event, item.to)}
                >
                  <span className={styles.cardHalo} aria-hidden="true" />
                  <span className={styles.cardInner}>
                    <i className={`fas ${item.icon} ${styles.cardIcon}`} aria-hidden="true"></i>
                    <span className={styles.cardText}>
                      <span className={styles.cardLabel}>{item.label}</span>
                      <span className={styles.cardSub}>{item.subtitle}</span>
                    </span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
