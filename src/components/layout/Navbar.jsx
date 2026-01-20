
import React from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import styles from './Navbar.module.css';

const Navbar = () => {
    return (
        <nav className={`navbar navbar-expand-lg navbar-light ${styles.customNavbar} sticky-top`}>
            <div className="container">
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                
                <div className="ms-3">
                    <ThemeToggle />
                </div>
                
                <div className="collapse navbar-collapse justify-content-center" id="navbarNav">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <NavLink to="/" className={({ isActive }) => `nav-link ${styles.navCustomBtn} ${isActive ? 'active' : ''}`} end>
                                <i className="fas fa-home me-2"></i>首页
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/introduction" className={({ isActive }) => `nav-link ${styles.navCustomBtn} ${isActive ? 'active' : ''}`}>
                                <i className="fas fa-users me-2"></i>师生介绍
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/activities" className={({ isActive }) => `nav-link ${styles.navCustomBtn} ${isActive ? 'active' : ''}`}>
                                <i className="fas fa-images me-2"></i>活动相册
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/journal" className={({ isActive }) => `nav-link ${styles.navCustomBtn} ${isActive ? 'active' : ''}`}>
                                <i className="fas fa-envelope me-2"></i>班级日志
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/wall" className={({ isActive }) => `nav-link ${styles.navCustomBtn} ${isActive ? 'active' : ''}`}>
                                <i className="fas fa-pen-square me-2"></i>班级墙
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
