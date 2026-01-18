'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './EmailDashboard.module.css';
import { ParticleBackground } from '../ParticleBackground/ParticleBackground';
import { EmailCard } from '../EmailCard';
import { EmailSidebar } from '../EmailSidebar/EmailSidebar';
import { EmailNodeGraph } from '../EmailNodeGraph';
import type { AnalyzedEmail, Priority, ActionType } from '@/lib/gemini/service';

interface EmailStats {
    total: number;
    high: number;
    medium: number;
    low: number;
    needsResponse: number;
}

interface ConnectionStatus {
    connected: boolean;
    email?: string;
}

interface CachedEmailData {
    emails: AnalyzedEmail[];
    stats: EmailStats;
    timestamp: number;
    source: 'starred' | 'all';
}

type FilterType = 'all' | Priority | ActionType;

const CACHE_KEY = 'email_dashboard_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

export function EmailDashboard() {
    // Master list of all fetched emails (includes starred)
    const [allEmails, setAllEmails] = useState<AnalyzedEmail[]>([]);
    const [stats, setStats] = useState<EmailStats | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<FilterType>('all');

    const [source, setSource] = useState<'starred' | 'all'>('starred');
    const [error, setError] = useState<string | null>(null);
    const [usingCache, setUsingCache] = useState(false);
    const [hasLoadedAll, setHasLoadedAll] = useState(false);

    // Derive displayed emails based on source toggle (no API call needed!)
    const emails = source === 'starred'
        ? allEmails.filter(e => e.isStarred)
        : allEmails;

    // Recalculate stats based on current view
    const displayStats: EmailStats | null = emails.length > 0 ? {
        total: emails.length,
        high: emails.filter(e => e.analysis.priority === 'HIGH').length,
        medium: emails.filter(e => e.analysis.priority === 'MEDIUM').length,
        low: emails.filter(e => e.analysis.priority === 'LOW').length,
        needsResponse: emails.filter(e => e.analysis.action === 'RESPONSE_NEEDED').length,
    } : stats;

    // Load cached data from localStorage
    const loadFromCache = useCallback((): CachedEmailData | null => {
        if (typeof window === 'undefined') return null;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const data: CachedEmailData = JSON.parse(cached);

            // Check if cache is still valid (not expired)
            if (Date.now() - data.timestamp < CACHE_TTL) {
                return data;
            }
        } catch (e) {
            console.error('Error loading cache:', e);
        }
        return null;
    }, []);

    // Save data to localStorage (always save all emails as master)
    const saveToCache = useCallback((emailData: AnalyzedEmail[], statsData: EmailStats) => {
        if (typeof window === 'undefined') return;
        try {
            const cacheData: CachedEmailData = {
                emails: emailData,
                stats: statsData,
                timestamp: Date.now(),
                source: 'all', // Always store as 'all' since it's the master
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.error('Error saving cache:', e);
        }
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CACHE_KEY);
    }, []);

    const checkConnection = useCallback(async () => {
        try {
            const res = await fetch('/api/email/status');
            const data = await res.json();
            setStatus(data);
            return data.connected;
        } catch {
            setStatus({ connected: false });
            return false;
        }
    }, []);

    // Fetch emails based on current source
    const fetchEmails = useCallback(async (forceRefresh = false, fetchSource?: 'starred' | 'all') => {
        const targetSource = fetchSource || source;
        setError(null);

        // Try to load from cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = loadFromCache();
            if (cached && cached.source === targetSource) {
                const emailsWithDates = cached.emails.map((email: AnalyzedEmail) => ({
                    ...email,
                    date: new Date(email.date),
                }));
                setAllEmails(emailsWithDates);
                setStats(cached.stats);
                setUsingCache(true);
                return;
            }
        }

        setUsingCache(false);

        try {
            const res = await fetch(`/api/email/list?filter=${targetSource}`);
            if (!res.ok) {
                if (res.status === 401) {
                    setStatus({ connected: false });
                    clearCache();
                    return;
                }
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch');
            }
            const data = await res.json();

            const emailsWithDates = data.emails.map((email: AnalyzedEmail) => ({
                ...email,
                date: new Date(email.date),
            }));

            // When fetching 'all', merge with existing starred emails to preserve them
            if (targetSource === 'all' && allEmails.length > 0) {
                const existingStarred = allEmails.filter(e => e.isStarred);
                const newEmailIds = new Set(emailsWithDates.map((e: AnalyzedEmail) => e.id));
                // Add any starred emails that aren't in the new batch
                const mergedEmails = [
                    ...emailsWithDates,
                    ...existingStarred.filter(e => !newEmailIds.has(e.id))
                ];
                setAllEmails(mergedEmails);
            } else {
                setAllEmails(emailsWithDates);
            }

            setStats(data.stats);

            // Save to cache with source info
            if (typeof window !== 'undefined') {
                const cacheData: CachedEmailData = {
                    emails: emailsWithDates,
                    stats: data.stats,
                    timestamp: Date.now(),
                    source: targetSource,
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            }
        } catch (error: any) {
            console.error('Error fetching emails:', error);
            setError(error.message || 'An unexpected error occurred');
        }
    }, [source, loadFromCache, clearCache, allEmails]);

    const refresh = async () => {
        setRefreshing(true);
        await fetchEmails(true); // Force refresh, bypass cache
        setRefreshing(false);
    };

    const disconnect = async () => {
        try {
            await fetch('/api/email/status', { method: 'DELETE' });
            setStatus({ connected: false });
            setAllEmails([]);
            setStats(null);
            clearCache(); // Clear cache on disconnect
            setHasLoadedAll(false); // Reset so next login fetches fresh
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const connected = await checkConnection();
            if (connected) {
                await fetchEmails(false, 'starred'); // Start with starred
            } else {
                clearCache(); // Clear cache if not connected
            }
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Effect to handle source toggle - fetch new data when switching to 'all'
    useEffect(() => {
        if (!loading && status.connected && source === 'all' && !hasLoadedAll) {
            // User switched to 'all' for the first time, fetch 6 emails
            setRefreshing(true);
            fetchEmails(true, 'all').then(() => {
                setRefreshing(false);
                setHasLoadedAll(true);
            });
        }
    }, [source, loading, status.connected, hasLoadedAll, fetchEmails]);

    const filteredEmails = emails.filter((email: AnalyzedEmail) => {
        // Filter out emails with deadlines before today
        if (email.analysis.deadline) {
            const deadlineDate = new Date(email.analysis.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of day
            if (deadlineDate < today) {
                return false;
            }
        }

        if (filter === 'all') return true;
        if (['HIGH', 'MEDIUM', 'LOW'].includes(filter)) {
            return email.analysis.priority === filter;
        }
        return email.analysis.action === filter;
    });

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>Checking connection...</p>
                </div>
            </div>
        );
    }

    if (!status.connected) {
        return (
            <div className={styles.container}>
                <div className={styles.connectCard}>
                    <svg className={styles.connectIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <h2 className={styles.connectTitle}>Connect Your Gmail</h2>
                    <p className={styles.connectDescription}>
                        Connect your Gmail account to analyze starred emails and get AI-powered insights
                        on which messages need your attention.
                    </p>
                    <a href="/api/email/auth" className={styles.connectButton}>
                        <svg className={styles.googleIcon} viewBox="0 0 24 24">
                            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Connect with Google
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ParticleBackground />
            <header className={styles.header}>
                <div className={styles.navBar}>
                    <Link href="/" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Home
                    </Link>
                    <Link href="/connections" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Connections
                    </Link>
                    <h1 className={styles.brandTitle}>Nodeify</h1>
                </div>
                <div className={styles.headerRow}>
                    <div className={styles.headerRow}>
                        <div className={styles.sourceToggle}>
                            <button
                                className={`${styles.toggleOpt} ${source === 'starred' ? styles.active : ''}`}
                                onClick={() => setSource('starred')}
                            >
                                Starred
                            </button>
                            <button
                                className={`${styles.toggleOpt} ${source === 'all' ? styles.active : ''}`}
                                onClick={() => setSource('all')}
                            >
                                All Recent
                            </button>
                        </div>

                        <div className={styles.connectedEmail}>
                            <span className={styles.connectedDot} />
                            {status.email}
                        </div>
                        {usingCache && (
                            <span className={styles.cacheIndicator}>
                                ⚡ Cached
                            </span>
                        )}
                        <button
                            className={styles.refreshButton}
                            onClick={refresh}
                            disabled={refreshing}
                        >
                            {refreshing ? 'Refreshing...' : usingCache ? 'Refresh from Gmail' : 'Refresh'}
                        </button>
                        <button className={styles.disconnectButton} onClick={disconnect}>
                            Disconnect
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className={styles.errorBanner} style={{
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>
                    <strong>Error:</strong> {error}
                    <br />
                    <small>Check the browser console for details.</small>
                </div>
            )
            }

            <div className={styles.dashboardLayout}>
                <EmailSidebar emails={emails} />

                <main className={styles.mainContent}>
                    {displayStats && (
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>{displayStats.total}</div>
                                <div className={styles.statLabel}>Total Emails</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.high}`}>{displayStats.high}</div>
                                <div className={styles.statLabel}>High Priority</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.medium}`}>{displayStats.medium}</div>
                                <div className={styles.statLabel}>Medium Priority</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.low}`}>{displayStats.low}</div>
                                <div className={styles.statLabel}>Low Priority</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={`${styles.statValue} ${styles.response}`}>{displayStats.needsResponse}</div>
                                <div className={styles.statLabel}>Needs Response</div>
                            </div>
                        </div>
                    )}

                    {/* Sender Category Graph - Click to drill down */}
                    {emails.length > 0 && (
                        <EmailNodeGraph emails={emails} />
                    )}

                    <div className={styles.filterBar}>
                        <button
                            className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`${styles.filterButton} ${filter === 'HIGH' ? styles.active : ''}`}
                            onClick={() => setFilter('HIGH')}
                        >
                            🔴 High Priority
                        </button>
                        <button
                            className={`${styles.filterButton} ${filter === 'MEDIUM' ? styles.active : ''}`}
                            onClick={() => setFilter('MEDIUM')}
                        >
                            🟡 Medium
                        </button>
                        <button
                            className={`${styles.filterButton} ${filter === 'RESPONSE_NEEDED' ? styles.active : ''}`}
                            onClick={() => setFilter('RESPONSE_NEEDED')}
                        >
                            ✉️ Needs Response
                        </button>
                        <button
                            className={`${styles.filterButton} ${filter === 'DEADLINE' ? styles.active : ''}`}
                            onClick={() => setFilter('DEADLINE')}
                        >
                            ⏰ Has Deadline
                        </button>
                    </div>

                    {filteredEmails.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 6H4l8 5 8-5zm0 2l-8 5-8-5v10h16V8z" />
                            </svg>
                            <h3 className={styles.emptyTitle}>
                                {emails.length === 0
                                    ? `No ${source === 'starred' ? 'starred' : 'recent'} emails found`
                                    : 'No emails match this filter'}
                            </h3>
                            <p>
                                {emails.length === 0
                                    ? (source === 'starred'
                                        ? 'Star some emails in Gmail to see them analyzed here.'
                                        : 'Your inbox seems empty or we couldn\'t fetch messages.')
                                    : 'Try a different filter to see more emails.'}
                            </p>
                        </div>
                    ) : (
                        <div className={styles.emailGrid}>
                            {filteredEmails.map(email => (
                                <EmailCard key={email.id} email={email} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div >
    );
}
