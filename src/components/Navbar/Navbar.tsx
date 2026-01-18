'use client';

import React from 'react';
import Link from 'next/link';
import { useConnections } from '@/context/ConnectionsContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { filteredConnections, stats } = useConnections();

    return (
        <nav className={styles.navbar}>
            <div className={styles.brand}>
                <div className={styles.navLinks}>
                    <Link href="/" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Home
                    </Link>
                    <Link href="/emails" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Emails
                    </Link>
                </div>
                <h1 className={styles.title}>Nodeify</h1>
            </div>

            <div className={styles.stats}>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{filteredConnections.length}</span>
                    <span className={styles.statLabel}>Showing</span>
                </div>
                <div className={styles.statDivider}>/</div>
                <div className={styles.statItem}>
                    <span className={styles.statValue}>{stats.total}</span>
                    <span className={styles.statLabel}>Total</span>
                </div>
            </div>

            <div className={styles.legend}>
                <span className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: '#ff4d4d' }} />
                    Hot
                </span>
                <span className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: '#ffb84d' }} />
                    Warm
                </span>
                <span className={styles.legendItem}>
                    <span className={styles.dot} style={{ background: '#4d9fff' }} />
                    Cold
                </span>
            </div>
        </nav>
    );
}
