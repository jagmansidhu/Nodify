'use client';

import React, { useRef, useState } from 'react';
import { Connection } from '@/types';
import { useConnections } from '@/context/ConnectionsContext';
import styles from './LinkedInImport.module.css';

// LinkedIn CSV export typically has these columns
// First Name, Last Name, URL, Email Address, Company, Position, Connected On

interface LinkedInRow {
    'First Name': string;
    'Last Name': string;
    'URL'?: string;
    'Email Address'?: string;
    'Company': string;
    'Position': string;
    'Connected On': string;
}

function parseCSV(text: string): LinkedInRow[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: LinkedInRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim().replace(/^"|"$/g, '') || '';
            });
            rows.push(row as unknown as LinkedInRow);
        }
    }

    return rows;
}

// Handle CSV values that may contain commas within quotes
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Map industry based on company name or position (basic heuristic)
function guessIndustry(company: string, position: string): string {
    const text = `${company} ${position}`.toLowerCase();

    if (text.includes('software') || text.includes('tech') || text.includes('developer') || text.includes('engineer')) {
        return 'Technology';
    }
    if (text.includes('bank') || text.includes('finance') || text.includes('investment') || text.includes('capital')) {
        return 'Finance';
    }
    if (text.includes('marketing') || text.includes('brand') || text.includes('advertising')) {
        return 'Marketing';
    }
    if (text.includes('sales') || text.includes('business development')) {
        return 'Sales';
    }
    if (text.includes('design') || text.includes('creative') || text.includes('ux') || text.includes('ui')) {
        return 'Design';
    }
    if (text.includes('health') || text.includes('medical') || text.includes('hospital') || text.includes('pharma')) {
        return 'Healthcare';
    }
    if (text.includes('consult')) {
        return 'Consulting';
    }
    if (text.includes('legal') || text.includes('law') || text.includes('attorney')) {
        return 'Legal';
    }
    if (text.includes('real estate') || text.includes('property')) {
        return 'Real Estate';
    }
    if (text.includes('university') || text.includes('school') || text.includes('education') || text.includes('professor')) {
        return 'Education';
    }

    return 'Other';
}

function linkedInRowToConnection(row: LinkedInRow, index: number): Connection {
    // Parse the "Connected On" date (format: "DD Mon YYYY" e.g., "15 Jan 2024")
    let lastContactDate = new Date();
    if (row['Connected On']) {
        const parsed = new Date(row['Connected On']);
        if (!isNaN(parsed.getTime())) {
            lastContactDate = parsed;
        }
    }

    return {
        id: `linkedin-${index}-${Date.now()}`,
        name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || 'Unknown',
        title: row['Position'] || 'Unknown Position',
        company: row['Company'] || 'Unknown Company',
        industry: guessIndustry(row['Company'] || '', row['Position'] || ''),
        email: row['Email Address'] || undefined,
        linkedIn: row['URL'] || undefined,
        lastContactDate,
        degree: 1, // LinkedIn exports are direct (1st degree) connections
    };
}

export default function LinkedInImport() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addConnections, connections } = useConnections();
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setResult(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            // Convert to connections
            const newConnections = rows
                .map((row, index) => linkedInRowToConnection(row, index))
                .filter(conn => conn.name !== 'Unknown');

            // Filter out duplicates based on name
            const existingNames = new Set(connections.map(c => c.name.toLowerCase()));
            const uniqueConnections = newConnections.filter(
                conn => !existingNames.has(conn.name.toLowerCase())
            );

            addConnections(uniqueConnections);

            setResult({
                success: uniqueConnections.length,
                skipped: newConnections.length - uniqueConnections.length,
            });
        } catch (error) {
            console.error('Error parsing CSV:', error);
            setResult({ success: 0, skipped: 0 });
        }

        setImporting(false);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className={styles.hiddenInput}
                id="linkedin-import"
            />
            <label htmlFor="linkedin-import" className={styles.importButton}>
                {importing ? (
                    <span>Importing...</span>
                ) : (
                    <>
                        <span className={styles.icon}>📥</span>
                        <span>Import LinkedIn</span>
                    </>
                )}
            </label>

            {result && (
                <div className={styles.result}>
                    {result.success > 0 ? (
                        <span className={styles.success}>
                            ✓ Added {result.success} connections
                            {result.skipped > 0 && ` (${result.skipped} duplicates skipped)`}
                        </span>
                    ) : (
                        <span className={styles.error}>
                            No new connections found
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
