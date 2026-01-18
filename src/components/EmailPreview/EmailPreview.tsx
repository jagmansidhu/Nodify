'use client';

import React from 'react';
import styles from './EmailPreview.module.css';
import type { AnalyzedEmail } from '@/lib/gemini/service';

interface EmailPreviewProps {
    email: AnalyzedEmail;
    onClose: () => void;
    onOpenInGmail: () => void;
}

export function EmailPreview({ email, onClose, onOpenInGmail }: EmailPreviewProps) {
    const priorityColors: Record<string, string> = {
        HIGH: '#ff6b6b',
        MEDIUM: '#ffb84d',
        LOW: '#5bc0be',
    };

    const priorityLabels: Record<string, string> = {
        HIGH: 'Important',
        MEDIUM: 'Normal',
        LOW: 'Low Priority',
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <span
                            className={styles.priorityBadge}
                            style={{ background: priorityColors[email.analysis.priority] }}
                        >
                            {priorityLabels[email.analysis.priority]}
                        </span>
                        <span className={styles.actionBadge}>
                            {email.analysis.action.replace('_', ' ')}
                        </span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Subject */}
                <h2 className={styles.subject}>{email.subject}</h2>

                {/* Meta */}
                <div className={styles.meta}>
                    <div className={styles.sender}>
                        <span className={styles.senderName}>{email.from}</span>
                        <span className={styles.senderEmail}>&lt;{email.fromEmail}&gt;</span>
                    </div>
                    <span className={styles.date}>{formatDate(email.date)}</span>
                </div>

                {/* AI Summary */}
                <div className={styles.aiSection}>
                    <div className={styles.aiLabel}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                            <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" />
                        </svg>
                        Quick Overview
                    </div>
                    <p className={styles.summary}>{email.analysis.summary}</p>

                    {email.analysis.keyPoints && email.analysis.keyPoints.length > 0 && (
                        <ul className={styles.keyPoints}>
                            {email.analysis.keyPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                            ))}
                        </ul>
                    )}

                    {email.analysis.deadline && (
                        <div className={styles.deadline}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Deadline: {email.analysis.deadline}
                        </div>
                    )}

                    <div className={styles.responseTime}>
                        Suggested response: <strong>{email.analysis.suggestedResponseTime}</strong>
                    </div>
                </div>

                {/* Email Body Preview */}
                <div className={styles.bodySection}>
                    <div className={styles.bodyLabel}>Email Preview</div>
                    <div className={styles.body}>
                        {email.snippet || email.body?.substring(0, 500) || 'No preview available'}
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.gmailBtn} onClick={onOpenInGmail}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        Open in Gmail
                    </button>
                </div>
            </div>
        </div>
    );
}
