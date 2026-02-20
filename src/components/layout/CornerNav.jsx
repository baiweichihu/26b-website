import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { useIrisTransition } from '../ui/IrisTransition';
import styles from './CornerNav.module.css';

const NAV_LINKS = [
  { to: '/lobby', label: '大厅', icon: 'fa-compass' },
  { to: '/journal', label: '班日志', icon: 'fa-book-open' },
  { to: '/introduction', label: '人物志', icon: 'fa-users' },
  { to: '/activities', label: '大事记', icon: 'fa-images' },
  { to: '/wall', label: '班级墙', icon: 'fa-pen-square' },
  { to: '/contact', label: '联系我们', icon: 'fa-envelope' },
];

const CornerNav = () => {
  const [open, setOpen] = useState(false);
  const itemsRef = useRef([]);
  const navRef = useRef(null);
  const closeNav = () => setOpen(false);
  const { triggerIris } = useIrisTransition();

  const handleNavClick = (event, to) => {
    triggerIris?.(event, to);
    closeNav();
  };

  // hover 打开/延迟关闭，避免在 orb 与菜单之间快速移动时误关闭
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const timerRef = { current: null };

    const handleMouseEnter = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setOpen(true);
    };

    const handleMouseLeave = () => {
      // 延迟关闭，给用户一点时间移动到菜单
      timerRef.current = setTimeout(() => {
        setOpen(false);
        timerRef.current = null;
      }, 200);
    };

    navElement.addEventListener('mouseenter', handleMouseEnter);
    navElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      navElement.removeEventListener('mouseenter', handleMouseEnter);
      navElement.removeEventListener('mouseleave', handleMouseLeave);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
    <div className={styles.cornerNav} data-open={open} ref={navRef}>
      <div className={styles.orbStack}>
        <button
          type="button"
          className={styles.orb}
          aria-label={open ? '导航已打开' : '导航已打开'}
          aria-expanded={open}
        >
          <span className={styles.orbCore} />
          <span className={styles.orbText}>NAV</span>
        </button>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${styles.homeQuick} ${isActive ? styles.homeQuickActive : ''}`
          }
          onClick={(event) => handleNavClick(event, '/')}
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
            onClick={(event) => handleNavClick(event, item.to)}
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
