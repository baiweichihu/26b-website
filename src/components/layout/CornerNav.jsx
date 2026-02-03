import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import styles from './CornerNav.module.css';

const NAV_LINKS = [
  { to: '/', label: '大厅', icon: 'fa-compass' },
  { to: '/introduction', label: '人物', icon: 'fa-users' },
  { to: '/activities', label: '大事纪', icon: 'fa-images' },
  { to: '/journal', label: '班日志', icon: 'fa-book-open' },
  { to: '/wall', label: '班级墙', icon: 'fa-pen-square' },
  { to: '/contact', label: '联系我们', icon: 'fa-envelope' },
];

const CornerNav = () => {
  const [open, setOpen] = useState(false);
  const itemsRef = useRef([]);
  const closeNav = () => setOpen(false);

  useEffect(() => {
    const gsap = window.gsap;
    if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const items = itemsRef.current.filter(Boolean);
    if (!items.length) return;

    if (open) {
      gsap.fromTo(
        items,
        { x: -20, opacity: 0, rotateY: -18 },
        {
          x: 0,
          opacity: 1,
          rotateY: 0,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.05,
        }
      );
    } else {
      gsap.to(items, {
        x: -10,
        opacity: 0,
        rotateY: -12,
        duration: 0.25,
        ease: 'power2.inOut',
      });
    }
  }, [open]);

  return (
    <div className={styles.cornerNav} data-open={open}>
      <div className={styles.orbStack}>
        <button
          type="button"
          className={styles.orb}
          aria-label={open ? '关闭导航' : '打开导航'}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className={styles.orbCore} />
          <span className={styles.orbText}>NAV</span>
        </button>
        <NavLink
          to="/home"
          className={({ isActive }) =>
            `${styles.homeQuick} ${isActive ? styles.homeQuickActive : ''}`
          }
          onClick={closeNav}
        >
          <i className="fas fa-home" aria-hidden="true"></i>
          <span>首页</span>
        </NavLink>
      </div>

      <div className={styles.trail}>
        {NAV_LINKS.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            className={({ isActive }) => `${styles.trailItem} ${isActive ? styles.active : ''}`}
            onClick={closeNav}
          >
            <i className={`fas ${item.icon}`} aria-hidden="true"></i>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className={styles.toggleWrap}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default CornerNav;
