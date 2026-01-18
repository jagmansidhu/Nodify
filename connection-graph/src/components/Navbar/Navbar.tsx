'use client';

import React from 'react';
import { useConnections } from '@/context/ConnectionsContext';
import styles from './Navbar.module.css';

export default function Navbar() {
    const { filteredConnections, stats } = useConnections();

    return (
        <nav className={styles.navbar}>
            <div className={styles.brand}>
                <h1 className={styles.title}>Nodely</h1>
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
