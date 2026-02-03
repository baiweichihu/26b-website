import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import { useIrisTransition } from './IrisTransition';

const Header = () => {
  const headerRef = useRef(null);
  const swipeRef = useRef(null);
  const blobRef = useRef(null);
  const { triggerIris } = useIrisTransition();

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const header = headerRef.current;
    if (!gsap || !header || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (swipeRef.current) {
        gsap.fromTo(
          swipeRef.current,
          { xPercent: -120, opacity: 0 },
          { xPercent: 120, opacity: 0.85, duration: 1.6, ease: 'power3.out' }
        );
      }

      if (blobRef.current) {
        gsap.to(blobRef.current, {
          borderRadius: '40% 60% 55% 45% / 45% 40% 60% 55%',
          duration: 5.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
        gsap.to(blobRef.current, {
          x: 24,
          y: -12,
          duration: 8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }
    }, header);

    return () => ctx.revert();
  }, []);

  return (
    <header className={styles.pageHeader} ref={headerRef}>
      <div className={styles.headerSwipe} ref={swipeRef} aria-hidden="true" />
      <div className={styles.headerBlob} ref={blobRef} aria-hidden="true" />
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-2 text-center">
            <div className="d-flex justify-content-center">
              <div className={`${styles.iconCircle} me-2`}>
                <img src={`${import.meta.env.BASE_URL}bjbz_icon.png`} alt="校徽" />
              </div>
              <div className={`${styles.iconCircle} ms-2`}>
                <img src={`${import.meta.env.BASE_URL}shao26b_icon.png`} alt="班徽" />
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <h1 className="display-4 mb-2">
              <span className={styles.schoolName}>北京八中</span>
              <span className={styles.className}>少26B班</span>
            </h1>
          </div>
          <div className="col-md-2 text-end">
            <Link
              to="/contact"
              className={styles.contactBtn}
              onClick={(event) => triggerIris?.(event, '/contact')}
            >
              <i className={`fas fa-envelope ${styles.contactIcon}`}></i>
              <span className={styles.contactText}>联系我们</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
