'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { Connection, ConnectionNode, ConnectionLink, FilterState, HeatStatus } from '@/types';
import { mockConnections } from '@/data/mockConnections';
import { getHeatStatus } from '@/utils/heatMap';

const USE_SNOWFLAKE_API = process.env.NEXT_PUBLIC_USE_SNOWFLAKE === 'true';
const CACHE_KEY = 'nodify_connections_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface CachedData {
    connections: Connection[];
    timestamp: number;
}

interface ConnectionsContextType {
    connections: ConnectionNode[];
    filteredConnections: ConnectionNode[];
    links: ConnectionLink[];
    selectedConnection: ConnectionNode | null;
    isLoading: boolean;
    filters: FilterState;
    setIndustryFilter: (industries: string[]) => void;
    setHeatFilter: (statuses: HeatStatus[]) => void;
    setSearchQuery: (query: string) => void;
    setMaxDegreeFilter: (maxDegree: 1 | 2 | 3 | null) => void;
    clearFilters: () => void;
    selectConnection: (connection: ConnectionNode | null) => void;
    addConnections: (newConnections: Connection[]) => void;
    deleteConnection: (id: string) => Promise<void>;
    clearAllConnections: () => void;
    refreshConnections: () => Promise<void>;
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

function getCachedConnections(): Connection[] | null {
    if (typeof window === 'undefined') return null;

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data: CachedData = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > CACHE_DURATION;

        if (isExpired) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data.connections.map(conn => ({
            ...conn,
            lastContactDate: new Date(conn.lastContactDate),
        }));
    } catch {
        return null;
    }
}

function setCachedConnections(connections: Connection[]): void {
    if (typeof window === 'undefined') return;

    try {
        const data: CachedData = {
            connections,
            timestamp: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to cache connections:', error);
    }
}

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
    const [rawConnections, setRawConnections] = useState<Connection[]>(() => {
        if (!USE_SNOWFLAKE_API) return mockConnections;
        const cached = getCachedConnections();
        return cached || [];
    });

    const [isLoading, setIsLoading] = useState(() => {
        if (!USE_SNOWFLAKE_API) return false;
        return getCachedConnections() === null;
    });

    const fetchConnections = useCallback(async (force = false) => {
        if (!USE_SNOWFLAKE_API) return;

        if (!force) {
            const cached = getCachedConnections();
            if (cached && cached.length > 0) {
                setRawConnections(cached);
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/connections');
            if (response.ok) {
                const data = await response.json();
                if (data.connections && data.connections.length > 0) {
                    const connections = data.connections.map((conn: Connection & { lastContactDate: string }) => ({
                        ...conn,
                        lastContactDate: new Date(conn.lastContactDate),
                    }));
                    setRawConnections(connections);
                    setCachedConnections(connections);
                }
            }
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const connections: ConnectionNode[] = useMemo(() => {
        return rawConnections.map(conn => ({
            ...conn,
            heatStatus: getHeatStatus(conn.lastContactDate),
        }));
    }, [rawConnections]);

    const allLinks: ConnectionLink[] = useMemo(() => {
        return connections
            .filter(conn => conn.connectedThrough)
            .map(conn => ({
                source: conn.connectedThrough!,
                target: conn.id,
            }));
    }, [connections]);

    const [selectedConnection, setSelectedConnection] = useState<ConnectionNode | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        industries: [],
        heatStatuses: [],
        searchQuery: '',
        maxDegree: null,
    });

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

    const links: ConnectionLink[] = useMemo(() => {
        const visibleIds = new Set(filteredConnections.map(c => c.id));
        return allLinks.filter(link => visibleIds.has(link.source) && visibleIds.has(link.target));
    }, [allLinks, filteredConnections]);

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

    const addConnections = useCallback(async (newConnections: Connection[]) => {
        const updated = [...rawConnections, ...newConnections];
        setRawConnections(updated);
        setCachedConnections(updated);

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
    }, [rawConnections]);

    const deleteConnection = useCallback(async (id: string) => {
        const updated = rawConnections.filter(c => c.id !== id);
        setRawConnections(updated);
        setCachedConnections(updated);
        setSelectedConnection(null);

        if (USE_SNOWFLAKE_API) {
            try {
                await fetch(`/api/connections?id=${encodeURIComponent(id)}`, {
                    method: 'DELETE',
                });
            } catch (error) {
                console.error('Failed to delete from Snowflake:', error);
            }
        }
    }, [rawConnections]);

    const clearAllConnections = useCallback(() => {
        setRawConnections([]);
        setCachedConnections([]);
        setSelectedConnection(null);
    }, []);

    const refreshConnections = useCallback(async () => {
        await fetchConnections(true);
    }, [fetchConnections]);

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
        deleteConnection,
        clearAllConnections,
        refreshConnections,
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
