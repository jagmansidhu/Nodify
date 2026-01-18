'use client';

import { useState } from 'react';
import styles from './EmailCard.module.css';
import type { AnalyzedEmail } from '@/lib/gemini';

interface EmailCardProps {
    email: AnalyzedEmail;
    onOpen?: () => void;
}

export function EmailCard({ email }: EmailCardProps) {
    const [expanded, setExpanded] = useState(false);
    const priorityClass = email.analysis.priority.toLowerCase();
    const { analysis } = email;

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(date);
    };

    const handleCardClick = () => {
        // Open the email thread in a new tab
        window.open(`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`, '_blank');
    };

    const handleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <div
            className={`${styles.card} ${styles[priorityClass]} ${expanded ? styles.expanded : ''}`}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
        >
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.priorityBadge}>
                        <span className={styles.priorityDot} />
                        {email.analysis.priority} Priority
                    </div>
                    <span className={styles.date}>{formatDate(email.date)}</span>
                </div>

                <h3 className={styles.subject}>{email.subject}</h3>

                <div className={styles.sender}>
                    <span className={styles.fromName}>{email.from}</span>
                    <span className={styles.fromEmail}>&lt;{email.fromEmail}&gt;</span>
                </div>
            </div>

            <div className={styles.summary}>
                <p>{email.analysis.summary}</p>
            </div>

            {expanded && analysis.keyPoints && analysis.keyPoints.length > 0 && (
                <div className={styles.details}>
                    <h4>Key Points:</h4>
                    <ul className={styles.keyPoints}>
                        {analysis.keyPoints.map((point: string, idx: number) => (
                            <li key={idx}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={styles.footer}>
                <div className={styles.actionBadge}>
                    <span>{analysis.action}</span>
                </div>

                <button
                    className={styles.expandButton}
                    onClick={handleExpand}
                >
                    {expanded ? 'Show Less' : 'Show Details'}
                </button>
            </div>
        </div>
    );
}
