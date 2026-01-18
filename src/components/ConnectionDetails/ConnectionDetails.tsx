'use client';

import React from 'react';
import { useConnections } from '@/context/ConnectionsContext';
import { getHeatColor, getHeatLabel, formatLastContact } from '@/utils/heatMap';
import styles from './ConnectionDetails.module.css';

export default function ConnectionDetails() {
    const { selectedConnection, selectConnection } = useConnections();

    // Don't render anything if no connection is selected
    if (!selectedConnection) {
        return null;
    }

    const conn = selectedConnection;

    return (
        <aside className={styles.panel}>
            <button
                className={styles.closeBtn}
                onClick={() => selectConnection(null)}
                aria-label="Close details"
            >
                ✕
            </button>

            {/* Header with avatar and name */}
            <div className={styles.header}>
                <div
                    className={styles.avatar}
                    style={{ backgroundColor: getHeatColor(conn.heatStatus) }}
                >
                    {conn.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <h2 className={styles.name}>{conn.name}</h2>
                <p className={styles.title}>{conn.title}</p>
                <p className={styles.company}>{conn.company}</p>
            </div>

            {/* Heat Status Badge */}
            <div
                className={styles.heatBadge}
                style={{ backgroundColor: getHeatColor(conn.heatStatus) }}
            >
                {getHeatLabel(conn.heatStatus)}
            </div>

            {/* Last Contact */}
            <div className={styles.section}>
                <label className={styles.sectionLabel}>Last Contact</label>
                <p className={styles.sectionValue}>{formatLastContact(conn.lastContactDate)}</p>
                <p className={styles.sectionSubtext}>
                    {conn.lastContactDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </p>
            </div>

            {/* Industry */}
            <div className={styles.section}>
                <label className={styles.sectionLabel}>Industry</label>
                <span className={styles.industryTag}>{conn.industry}</span>
            </div>

            {/* Contact Info */}
            <div className={styles.section}>
                <label className={styles.sectionLabel}>Contact</label>
                <div className={styles.contactLinks}>
                    {conn.email && (
                        <a href={`mailto:${conn.email}`} className={styles.contactLink}>
                            <span className={styles.contactIcon}>✉️</span>
                            {conn.email}
                        </a>
                    )}
                    {conn.phone && (
                        <a href={`tel:${conn.phone}`} className={styles.contactLink}>
                            <span className={styles.contactIcon}>📱</span>
                            {conn.phone}
                        </a>
                    )}
                    {conn.linkedIn && (
                        <a
                            href={`https://${conn.linkedIn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.contactLink}
                        >
                            <span className={styles.contactIcon}>🔗</span>
                            LinkedIn
                        </a>
                    )}
                </div>
            </div>

            {/* Notes */}
            {conn.notes && (
                <div className={styles.section}>
                    <label className={styles.sectionLabel}>Notes</label>
                    <p className={styles.notes}>{conn.notes}</p>
                </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
                <button className={styles.primaryBtn}>
                    📧 Reach Out
                </button>
                <button className={styles.secondaryBtn}>
                    📝 Add Note
                </button>
            </div>
        </aside>
    );
}
