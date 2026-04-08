import styles from './privacy.module.css';
import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy - Nodeify',
    description: 'Privacy Policy for Nodeify',
};

export default function PrivacyPolicyPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>Nodeify</Link>
            </header>

            <main className={styles.main}>
                <h1 className={styles.title}>Privacy Policy</h1>
                <p className={styles.lastUpdated}>Last updated: January 18, 2026</p>

                <div className={styles.highlight}>
                    <p>
                        <strong>Your privacy is important to us.</strong> We are committed to protecting
                        your personal information. This policy explains what data we collect, how we use it,
                        and your rights regarding your data.
                    </p>
                </div>

                <section className={styles.section}>
                    <h2>Our Core Commitment</h2>
                    <p>
                        <strong>We do not store your personal data.</strong> Nodeify is designed with privacy
                        as a fundamental principle. Any information processed by our Service is handled
                        transiently and is not retained on our servers.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Information We Do Not Collect</h2>
                    <p>Unlike many services, we do not:</p>
                    <ul className={styles.list}>
                        <li>Store your personal data on our servers</li>
                        <li>Sell or share your information with third parties</li>
                        <li>Track your browsing behavior across other websites</li>
                        <li>Use your data for advertising purposes</li>
                        <li>Create user profiles for marketing purposes</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>Information That May Be Processed</h2>
                    <p>
                        When you use our Service, the following information may be processed temporarily
                        to provide functionality:
                    </p>
                    <ul className={styles.list}>
                        <li><strong>Account Information:</strong> Email address for authentication purposes only</li>
                        <li><strong>Connection Data:</strong> Data you choose to visualize, processed locally or transiently</li>
                        <li><strong>Technical Data:</strong> Basic server logs for security and debugging (not linked to your identity)</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>Third-Party Services</h2>
                    <p>
                        If you choose to connect third-party services (such as email or calendar integrations),
                        we access only the data necessary to provide the requested functionality. This data
                        is processed in real-time and is not stored on our servers.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Cookies</h2>
                    <p>
                        We use only essential cookies required for the basic functionality of the Service,
                        such as session management and authentication. We do not use tracking or advertising cookies.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Data Security</h2>
                    <p>
                        We implement appropriate technical and organizational measures to protect any
                        information processed by our Service. All data transmission is encrypted using
                        industry-standard protocols (TLS/SSL).
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul className={styles.list}>
                        <li>Request information about how your data is processed</li>
                        <li>Request deletion of any data associated with your account</li>
                        <li>Opt out of any optional data processing</li>
                        <li>Revoke access to connected third-party services at any time</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>Children's Privacy</h2>
                    <p>
                        Our Service is not intended for children under 13 years of age. We do not knowingly
                        collect or process personal information from children under 13.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of any
                        changes by posting the new policy on this page with an updated "Last updated" date.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy or your data, please contact us.
                    </p>
                </section>
            </main>

            <footer className={styles.footer}>
                <p>&copy; {new Date().getFullYear()} Nodeify. All rights reserved.</p>
                <nav className={styles.footerNav}>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/terms">Terms of Service</Link>
                </nav>
            </footer>
        </div>
    );
}
