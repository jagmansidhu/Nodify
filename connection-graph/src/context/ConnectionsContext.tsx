'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Connection, ConnectionNode, ConnectionLink, FilterState, HeatStatus } from '@/types';
import { mockConnections } from '@/data/mockConnections';
import { getHeatStatus } from '@/utils/heatMap';

// Set to true to use Snowflake API, false for mock data only
const USE_SNOWFLAKE_API = process.env.NEXT_PUBLIC_USE_SNOWFLAKE === 'true';

interface ConnectionsContextType {
    // Data
    connections: ConnectionNode[];
    filteredConnections: ConnectionNode[];
    links: ConnectionLink[];
    selectedConnection: ConnectionNode | null;
    isLoading: boolean;

    // Filters
    filters: FilterState;
    setIndustryFilter: (industries: string[]) => void;
    setHeatFilter: (statuses: HeatStatus[]) => void;
    setSearchQuery: (query: string) => void;
    setMaxDegreeFilter: (maxDegree: 1 | 2 | 3 | null) => void;
    clearFilters: () => void;

    // Selection
    selectConnection: (connection: ConnectionNode | null) => void;

    // Add connections (for LinkedIn import)
    addConnections: (newConnections: Connection[]) => void;
    clearAllConnections: () => void;

    // Stats
    stats: {
        total: number;
        hot: number;
        warm: number;
        cold: number;
        industries: string[];
        degree1: number;
        degree2: number;
        degree3: number;
    };
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
    // Raw connections state
    const [rawConnections, setRawConnections] = useState<Connection[]>(mockConnections);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch connections from Snowflake API on mount
    useEffect(() => {
        if (!USE_SNOWFLAKE_API) return;

        async function fetchConnections() {
            setIsLoading(true);
            try {
                const response = await fetch('/api/connections');
                if (response.ok) {
                    const data = await response.json();
                    if (data.connections && data.connections.length > 0) {
                        // Convert date strings back to Date objects
                        const connections = data.connections.map((conn: Connection & { lastContactDate: string }) => ({
                            ...conn,
                            lastContactDate: new Date(conn.lastContactDate),
                        }));
                        setRawConnections(connections);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch connections from API:', error);
                // Fall back to mock data (already set)
            } finally {
                setIsLoading(false);
            }
        }

        fetchConnections();
    }, []);

    // Transform raw connections into nodes with heat status
    const connections: ConnectionNode[] = useMemo(() => {
        return rawConnections.map(conn => ({
            ...conn,
            heatStatus: getHeatStatus(conn.lastContactDate),
        }));
    }, [rawConnections]);

    // Generate links from connectedThrough relationships
    const allLinks: ConnectionLink[] = useMemo(() => {
        return connections
            .filter(conn => conn.connectedThrough)
            .map(conn => ({
                source: conn.connectedThrough!,
                target: conn.id,
            }));
    }, [connections]);

    // State
    const [selectedConnection, setSelectedConnection] = useState<ConnectionNode | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        industries: [],
        heatStatuses: [],
        searchQuery: '',
        maxDegree: null,
    });

    // Helper: check if connection matches basic filters
    const matchesBasicFilters = useCallback((conn: ConnectionNode) => {
        if (filters.industries.length > 0 && !filters.industries.includes(conn.industry)) {
            return false;
        }
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const searchFields = [conn.name, conn.title, conn.company, conn.industry].map(f => f.toLowerCase());
            if (!searchFields.some(field => field.includes(query))) {
                return false;
            }
        }
        return true;
    }, [filters.industries, filters.searchQuery]);

    // Filtered connections with cascading logic
    const filteredConnections = useMemo(() => {
        const { maxDegree, heatStatuses } = filters;

        const firstDegreeFiltered = connections.filter(conn => {
            if (conn.degree !== 1) return false;
            if (!matchesBasicFilters(conn)) return false;
            if (heatStatuses.length > 0 && !heatStatuses.includes(conn.heatStatus)) return false;
            return true;
        });

        if (maxDegree === 1) return firstDegreeFiltered;

        const visible1stIds = new Set(firstDegreeFiltered.map(c => c.id));

        const secondDegreeFiltered = connections.filter(conn => {
            if (conn.degree !== 2) return false;
            if (!conn.connectedThrough || !visible1stIds.has(conn.connectedThrough)) return false;
            if (!matchesBasicFilters(conn)) return false;
            return true;
        });

        if (maxDegree === 2) return [...firstDegreeFiltered, ...secondDegreeFiltered];

        const visible2ndIds = new Set(secondDegreeFiltered.map(c => c.id));

        const thirdDegreeFiltered = connections.filter(conn => {
            if (conn.degree !== 3) return false;
            if (!conn.connectedThrough || !visible2ndIds.has(conn.connectedThrough)) return false;
            if (!matchesBasicFilters(conn)) return false;
            return true;
        });

        return [...firstDegreeFiltered, ...secondDegreeFiltered, ...thirdDegreeFiltered];
    }, [connections, filters, matchesBasicFilters]);

    // Filter links
    const links: ConnectionLink[] = useMemo(() => {
        const visibleIds = new Set(filteredConnections.map(c => c.id));
        return allLinks.filter(link => visibleIds.has(link.source) && visibleIds.has(link.target));
    }, [allLinks, filteredConnections]);

    // Stats
    const stats = useMemo(() => {
        const industriesSet = new Set(connections.map(c => c.industry));
        return {
            total: connections.length,
            hot: connections.filter(c => c.heatStatus === 'hot').length,
            warm: connections.filter(c => c.heatStatus === 'warm').length,
            cold: connections.filter(c => c.heatStatus === 'cold').length,
            industries: Array.from(industriesSet).sort(),
            degree1: connections.filter(c => c.degree === 1).length,
            degree2: connections.filter(c => c.degree === 2).length,
            degree3: connections.filter(c => c.degree === 3).length,
        };
    }, [connections]);

    // Actions
    const setIndustryFilter = useCallback((industries: string[]) => {
        setFilters(prev => ({ ...prev, industries }));
    }, []);

    const setHeatFilter = useCallback((heatStatuses: HeatStatus[]) => {
        setFilters(prev => ({ ...prev, heatStatuses }));
    }, []);

    const setMaxDegreeFilter = useCallback((maxDegree: 1 | 2 | 3 | null) => {
        setFilters(prev => ({ ...prev, maxDegree }));
    }, []);

    const setSearchQuery = useCallback((searchQuery: string) => {
        setFilters(prev => ({ ...prev, searchQuery }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ industries: [], heatStatuses: [], searchQuery: '', maxDegree: null });
    }, []);

    const selectConnection = useCallback((connection: ConnectionNode | null) => {
        setSelectedConnection(connection);
    }, []);

    // Add new connections (saves to Snowflake if enabled)
    const addConnections = useCallback(async (newConnections: Connection[]) => {
        // Add to local state immediately
        setRawConnections(prev => [...prev, ...newConnections]);

        // Save to Snowflake API if enabled
        if (USE_SNOWFLAKE_API) {
            try {
                await fetch('/api/connections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newConnections),
                });
            } catch (error) {
                console.error('Failed to save to Snowflake:', error);
            }
        }
    }, []);

    const clearAllConnections = useCallback(() => {
        setRawConnections([]);
        setSelectedConnection(null);
    }, []);

    const value: ConnectionsContextType = {
        connections,
        filteredConnections,
        links,
        selectedConnection,
        isLoading,
        filters,
        setIndustryFilter,
        setHeatFilter,
        setMaxDegreeFilter,
        setSearchQuery,
        clearFilters,
        selectConnection,
        addConnections,
        clearAllConnections,
        stats,
    };

    return (
        <ConnectionsContext.Provider value={value}>
            {children}
        </ConnectionsContext.Provider>
    );
}

export function useConnections() {
    const context = useContext(ConnectionsContext);
    if (context === undefined) {
        throw new Error('useConnections must be used within a ConnectionsProvider');
    }
    return context;
}
