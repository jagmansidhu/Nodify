import styles from './terms.module.css';
import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service - Nodeify',
    description: 'Terms of Service for Nodeify',
};

export default function TermsOfServicePage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>Nodeify</Link>
            </header>

            <main className={styles.main}>
                <h1 className={styles.title}>Terms of Service</h1>
                <p className={styles.lastUpdated}>Last updated: January 18, 2026</p>

                <section className={styles.section}>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Nodeify ("the Service"), you agree to be bound by these
                        Terms of Service. If you do not agree to these terms, please do not use our Service.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>2. Description of Service</h2>
                    <p>
                        Nodeify provides a visual graph tool for visualizing your professional connections
                        with engagement heat mapping. The Service is provided "as is" and we reserve the
                        right to modify, suspend, or discontinue any aspect of the Service at any time.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>3. User Accounts</h2>
                    <p>
                        To access certain features, you may need to create an account. You are responsible
                        for maintaining the confidentiality of your account credentials and for all activities
                        under your account.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>4. Data and Privacy</h2>
                    <p>
                        We respect your privacy. <strong>We do not store, sell, or share your personal data
                            with third parties.</strong> Any data you provide is used solely to provide the Service
                        and is processed in accordance with our <Link href="/privacy" className={styles.link}>Privacy Policy</Link>.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>5. User Conduct</h2>
                    <p>You agree not to:</p>
                    <ul className={styles.list}>
                        <li>Use the Service for any unlawful purpose</li>
                        <li>Attempt to gain unauthorized access to any part of the Service</li>
                        <li>Interfere with or disrupt the Service or servers</li>
                        <li>Reverse engineer or attempt to extract the source code of the Service</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>6. Intellectual Property</h2>
                    <p>
                        All content, features, and functionality of the Service are owned by Nodeify and
                        are protected by copyright, trademark, and other intellectual property laws.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>7. Disclaimer of Warranties</h2>
                    <p>
                        The Service is provided "as is" without warranties of any kind, either express or
                        implied. We do not warrant that the Service will be uninterrupted, error-free, or
                        free of harmful components.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>8. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, Nodeify shall not be liable for any indirect,
                        incidental, special, consequential, or punitive damages arising from your use of
                        the Service.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>9. Changes to Terms</h2>
                    <p>
                        We may update these Terms of Service from time to time. We will notify you of any
                        changes by posting the new Terms on this page with an updated "Last updated" date.
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>10. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms of Service, please contact us.
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
