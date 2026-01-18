'use client';

import styles from './page.module.css';

export default function EmailPage() {
    return (
        <div className={styles.container}>
            <nav className={styles.nav}>
                <a href="/" className={styles.backLink}>← Back to Home</a>
                <h1 className={styles.title}>Email Tracker</h1>
            </nav>

            <main className={styles.main}>
                <div className={styles.comingSoon}>
                    <div className={styles.icon}>📧</div>
                    <h2>Email Tracking Coming Soon</h2>
                    <p>Track and manage your email communications with your network.</p>
                    <ul className={styles.features}>
                        <li>📊 Email analytics and response tracking</li>
                        <li>⏰ Follow-up reminders</li>
                        <li>🔗 Link emails to connections</li>
                        <li>📈 Engagement insights</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
