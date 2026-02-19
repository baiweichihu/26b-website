import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './IrisTransition.module.css';

const IrisTransitionContext = createContext(null);

export const useIrisTransition = () => {
  const context = useContext(IrisTransitionContext);
  return context || { triggerIris: null };
};

const IrisTransition = ({ children }) => {
  const overlayRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const resolveOrigin = (event) => {
    if (event?.clientX != null && event?.clientY != null) {
      return { x: event.clientX, y: event.clientY };
    }
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    if (rect) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const triggerIris = useCallback(
    (event, to, options) => {
      if (!to) return;

      if (
        event &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      ) {
        return;
      }

      if (event?.preventDefault) {
        event.preventDefault();
      }

      if (location.pathname === to) return;

      if (
        location.pathname === '/journal' ||
        to === '/journal' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        navigate(to, options);
        return;
      }

      if (isAnimatingRef.current) return;

      const gsap = window.gsap;
      const overlay = overlayRef.current;
      if (!gsap || !overlay) {
        navigate(to, options);
        return;
      }

      const { x, y } = resolveOrigin(event);

      isAnimatingRef.current = true;
      gsap.killTweensOf(overlay);

      gsap.set(overlay, {
        opacity: 0,
        scale: 0.96,
        transformOrigin: `${x}px ${y}px`,
      });

      gsap.to(overlay, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          navigate(to, options);
          window.setTimeout(() => {
            gsap.to(overlay, {
              opacity: 0,
              duration: 0.45,
              ease: 'power2.inOut',
              onComplete: () => {
                isAnimatingRef.current = false;
              },
            });
          }, 120);
        },
      });
    },
    [location.pathname, navigate]
  );

  return (
    <IrisTransitionContext.Provider value={{ triggerIris }}>
      {children}
      <div className={styles.irisOverlay} ref={overlayRef} aria-hidden="true" />
    </IrisTransitionContext.Provider>
  );
};

export default IrisTransition;
