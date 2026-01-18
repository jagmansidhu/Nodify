'use client';

import styles from './EmailSidebar.module.css';
import type { AnalyzedEmail } from '@/lib/gemini';

interface EmailSidebarProps {
    emails: AnalyzedEmail[];
}

export function EmailSidebar({ emails }: EmailSidebarProps) {
    // 1. Daily Focus: High priority items (limit 3)
    const focusItems = emails
        .filter(e => e.analysis.priority === 'HIGH')
        .slice(0, 3);

    // 2. Quick Wins: Non-high priority emails that aren't in Daily Focus
    // Show MEDIUM with RESPONSE_NEEDED first, then any other MEDIUM emails
    const focusIds = new Set(focusItems.map(e => e.id));
    const quickWins = emails
        .filter(e => !focusIds.has(e.id) && e.analysis.priority !== 'HIGH')
        .sort((a, b) => {
            // Prioritize RESPONSE_NEEDED
            if (a.analysis.action === 'RESPONSE_NEEDED' && b.analysis.action !== 'RESPONSE_NEEDED') return -1;
            if (b.analysis.action === 'RESPONSE_NEEDED' && a.analysis.action !== 'RESPONSE_NEEDED') return 1;
            // Then MEDIUM over LOW
            if (a.analysis.priority === 'MEDIUM' && b.analysis.priority === 'LOW') return -1;
            if (b.analysis.priority === 'MEDIUM' && a.analysis.priority === 'LOW') return 1;
            return 0;
        })
        .slice(0, 3);

    const handleItemClick = (threadId: string) => {
        window.open(`https://mail.google.com/mail/u/0/#inbox/${threadId}`, '_blank');
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>🎯 Daily Focus</h3>
                {focusItems.length > 0 ? (
                    focusItems.map(email => (
                        <div
                            key={email.id}
                            className={`${styles.card} ${styles.focusCard}`}
                            onClick={() => handleItemClick(email.threadId)}
                        >
                            <div className={styles.cardTitle}>{email.subject}</div>
                            <div className={styles.cardMeta}>
                                <span>{email.from}</span>
                                <span>High Priority</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={styles.emptyText}>You're all caught up on high-priority items!</p>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>⚡ Quick Wins</h3>
                {quickWins.length > 0 ? (
                    quickWins.map(email => (
                        <div
                            key={email.id}
                            className={`${styles.card} ${styles.winCard}`}
                            onClick={() => handleItemClick(email.threadId)}
                        >
                            <div className={styles.cardTitle}>{email.subject}</div>
                            <div className={styles.cardMeta}>
                                <span>{email.from}</span>
                                <span>{email.analysis.action === 'RESPONSE_NEEDED' ? 'Reply Needed' : email.analysis.priority}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className={styles.emptyText}>No quick reply suggestions.</p>
                )}
            </div>
        </aside>
    );
}
