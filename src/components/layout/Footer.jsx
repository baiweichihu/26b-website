import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
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
