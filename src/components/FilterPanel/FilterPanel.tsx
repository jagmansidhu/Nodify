'use client';

import React from 'react';
import { useConnections } from '@/context/ConnectionsContext';
import { HeatStatus } from '@/types';
import { getHeatColor } from '@/utils/heatMap';
import LinkedInImport from '@/components/LinkedInImport';
import AddConnection from '@/components/AddConnection';
import styles from './FilterPanel.module.css';

export default function FilterPanel() {
    const {
        filters,
        setIndustryFilter,
        setHeatFilter,
        setMaxDegreeFilter,
        setSearchQuery,
        clearFilters,
        stats,
    } = useConnections();

    const handleIndustryChange = (industry: string) => {
        const newIndustries = filters.industries.includes(industry)
            ? filters.industries.filter(i => i !== industry)
            : [...filters.industries, industry];
        setIndustryFilter(newIndustries);
    };

    const handleHeatChange = (status: HeatStatus) => {
        const newStatuses = filters.heatStatuses.includes(status)
            ? filters.heatStatuses.filter(s => s !== status)
            : [...filters.heatStatuses, status];
        setHeatFilter(newStatuses);
    };

    const handleDegreeChange = (degree: 1 | 2 | 3) => {
        // Toggle: if already selected, clear it (show all), otherwise select it
        if (filters.maxDegree === degree) {
            setMaxDegreeFilter(null);
        } else {
            setMaxDegreeFilter(degree);
        }
    };

    const hasActiveFilters =
        filters.industries.length > 0 ||
        filters.heatStatuses.length > 0 ||
        filters.maxDegree !== null ||
        filters.searchQuery.length > 0;

    return (
        <aside className={styles.panel}>
            <div className={styles.header}>
                <h2>Filters</h2>
                {hasActiveFilters && (
                    <button onClick={clearFilters} className={styles.clearBtn}>
                        Clear all
                    </button>
                )}
            </div>

            {/* Search */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Search</label>
                <input
                    type="text"
                    placeholder="Search by name, company..."
                    value={filters.searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Connection Degree Filter - Single Select */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Show Up To</label>
                <div className={styles.degreeFilters}>
                    {([1, 2, 3] as const).map(degree => (
                        <label key={degree} className={styles.degreeOption}>
                            <input
                                type="radio"
                                name="maxDegree"
                                checked={filters.maxDegree === degree}
                                onChange={() => handleDegreeChange(degree)}
                            />
                            <span className={`${styles.degreeBadge} ${filters.maxDegree === degree ? styles.active : ''}`}>
                                {degree === 1 && `1st° only`}
                                {degree === 2 && `Up to 2nd°`}
                                {degree === 3 && `All (3rd°)`}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Heat Status Filter */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Engagement (1st° only)</label>
                <div className={styles.heatFilters}>
                    {(['hot', 'warm', 'cold'] as HeatStatus[]).map(status => (
                        <label key={status} className={styles.heatOption}>
                            <input
                                type="checkbox"
                                checked={filters.heatStatuses.includes(status)}
                                onChange={() => handleHeatChange(status)}
                            />
                            <span
                                className={styles.heatBadge}
                                style={{
                                    backgroundColor: getHeatColor(status),
                                    opacity: filters.heatStatuses.length === 0 || filters.heatStatuses.includes(status) ? 1 : 0.4
                                }}
                            >
                                {status === 'hot' && `Hot (${stats.hot})`}
                                {status === 'warm' && `Warm (${stats.warm})`}
                                {status === 'cold' && `Cold (${stats.cold})`}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Industry Filter */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Industry</label>
                <div className={styles.industryFilters}>
                    {stats.industries.map(industry => (
                        <label key={industry} className={styles.industryOption}>
                            <input
                                type="checkbox"
                                checked={filters.industries.includes(industry)}
                                onChange={() => handleIndustryChange(industry)}
                            />
                            <span className={`${styles.industryTag} ${filters.industries.includes(industry) ? styles.active : ''}`}>
                                {industry}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Add Connection Form */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Add Contact</label>
                <AddConnection />
            </div>

            {/* LinkedIn Import */}
            <div className={styles.section}>
                <label className={styles.sectionTitle}>Import Data</label>
                <LinkedInImport />
            </div>

            {/* Stats */}
            <div className={styles.stats}>
                <p className={styles.statLabel}>Total Connections</p>
                <p className={styles.statValue}>{stats.total}</p>
            </div>
        </aside>
    );
}
