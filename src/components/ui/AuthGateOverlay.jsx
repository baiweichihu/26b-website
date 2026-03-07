import React, { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useIrisTransition } from './useIrisTransition';
import styles from './AuthGateOverlay.module.css';

const AuthGateOverlay = ({ title, message }) => {
  const cardRef = useRef(null);
  const { triggerIris } = useIrisTransition();
  const location = useLocation();
  const fromPath = `${location.pathname}${location.search || ''}${location.hash || ''}`;

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const card = cardRef.current;
    if (!gsap || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        card,
        { y: 16, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }, card);

    return () => ctx.revert();
  }, []);

  const fallbackTitle = 'Sign in required';
  const fallbackMessage = 'Please sign in to access this area.';

  return (
    <div className={styles.gateOverlay} role="presentation">
      <div className={styles.gateCard} ref={cardRef}>
        <p className={styles.gateKicker}>Members only</p>
        <h2 className={styles.gateTitle}>{title || fallbackTitle}</h2>
        <p className={styles.gateText}>{message || fallbackMessage}</p>
        <div className={styles.gateActions}>
          <>
            <Link
              to="/login"
              className="scene-button primary"
              state={{ from: fromPath }}
              onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
            >
              登录
            </Link>
            <Link
              to="/register"
              className="scene-button ghost"
              state={{ from: fromPath }}
              onClick={(event) =>
                triggerIris?.(event, '/register', { state: { from: fromPath } })
              }
            >
              注册
            </Link>
          </>
        </div>
      </div>
    </div>
  );
};

export default AuthGateOverlay;
