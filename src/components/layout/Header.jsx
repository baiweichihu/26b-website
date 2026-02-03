import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';

const Header = () => {
  return (
    <header className={styles.pageHeader}>
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-2 text-center">
            <div className="d-flex justify-content-center">
              <div className={`${styles.iconCircle} me-2`}>
                <img src={`${import.meta.env.BASE_URL}bjbz_icon.webp`} alt="校徽" />
              </div>
              <div className={`${styles.iconCircle} ms-2`}>
                <img src={`${import.meta.env.BASE_URL}shao26b_icon.jpg`} alt="班徽" />
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
            <Link to="/contact" className={styles.contactBtn}>
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
