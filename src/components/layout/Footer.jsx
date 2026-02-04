import React, { useLayoutEffect, useRef } from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  const footerRef = useRef(null);
  const swipeRef = useRef(null);
  const blobRef = useRef(null);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const footer = footerRef.current;
    if (!gsap || !footer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (swipeRef.current) {
        gsap.fromTo(
          swipeRef.current,
          { xPercent: 120, opacity: 0 },
          { xPercent: -120, opacity: 0.75, duration: 1.8, ease: 'power3.out' }
        );
      }

      if (blobRef.current) {
        gsap.to(blobRef.current, {
          borderRadius: '60% 40% 50% 50% / 55% 45% 60% 40%',
          duration: 6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
        gsap.to(blobRef.current, {
          x: -18,
          y: 10,
          duration: 9,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }
    }, footer);

    return () => ctx.revert();
  }, []);

  return (
    <footer className={styles.footer} ref={footerRef}>
      <div className={styles.footerSwipe} ref={swipeRef} aria-hidden="true" />
      <div className={styles.footerBlob} ref={blobRef} aria-hidden="true" />
      <div className={styles.inner}>
        <div>
          <h5 className={styles.title}>少26B班</h5>
          <p className={styles.subtitle}>2019-2024</p>
        </div>
        <div className={styles.meta}>
          <p>(c) 2026 北京八中少26B班 All Rights Reserved</p>
          <p>维护者：白尾赤狐和TA的朋友们</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
