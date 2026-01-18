'use client';

import Navbar from '@/components/Navbar';
import FilterPanel from '@/components/FilterPanel';
import GraphCanvas from '@/components/GraphCanvas';
import ConnectionDetails from '@/components/ConnectionDetails';
import { ConnectionsProvider } from '@/context/ConnectionsContext';
import styles from './page.module.css';

export default function ConnectionsPage() {
    return (
        <ConnectionsProvider>
            <div className={styles.app}>
                <Navbar />
                <main className={styles.main}>
                    <FilterPanel />
                    <GraphCanvas />
                    <ConnectionDetails />
                </main>
            </div>
        </ConnectionsProvider>
    );
}
