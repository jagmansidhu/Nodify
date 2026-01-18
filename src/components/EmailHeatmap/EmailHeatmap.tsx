'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import styles from './EmailHeatmap.module.css';
import type { AnalyzedEmail } from '@/lib/gemini/service';
import {
    getEmailHeatStatus,
    getEmailHeatColor,
    getEmailHeatScore,
    formatEmailAge,
    type EmailHeatStatus
} from '@/utils/emailHeatMap';

interface EmailNode extends d3.SimulationNodeDatum {
    id: string;
    email: AnalyzedEmail;
    heatStatus: EmailHeatStatus;
    heatScore: number;
}

interface EmailHeatmapProps {
    emails: AnalyzedEmail[];
    onEmailClick?: (email: AnalyzedEmail) => void;
    height?: number;
}

type ViewMode = 'cluster' | 'radial';

export function EmailHeatmap({ emails, onEmailClick, height = 400 }: EmailHeatmapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height });
    const [viewMode, setViewMode] = useState<ViewMode>('cluster');
    const [hoveredEmail, setHoveredEmail] = useState<AnalyzedEmail | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [height]);

    // Build D3 visualization
    useEffect(() => {
        if (!svgRef.current || emails.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;

        // Create nodes with heat data
        const nodes: EmailNode[] = emails.map(email => ({
            id: email.id,
            email,
            heatStatus: getEmailHeatStatus(email),
            heatScore: getEmailHeatScore(email),
        }));

        // Sort by heat score for layout
        nodes.sort((a, b) => b.heatScore - a.heatScore);

        // Create glow filters
        const defs = svg.append('defs');

        (['critical', 'urgent', 'normal', 'low'] as EmailHeatStatus[]).forEach(status => {
            const color = getEmailHeatColor(status);
            const filter = defs.append('filter')
                .attr('id', `email-glow-${status}`)
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');

            filter.append('feGaussianBlur')
                .attr('stdDeviation', status === 'critical' ? '5' : status === 'urgent' ? '4' : '2.5')
                .attr('result', 'coloredBlur');

            filter.append('feFlood')
                .attr('flood-color', color)
                .attr('flood-opacity', '0.5');

            filter.append('feComposite')
                .attr('in2', 'coloredBlur')
                .attr('operator', 'in');

            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Enable zoom/pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        const container = svg.append('g');

        // Base radius based on node count
        const baseRadius = Math.min(20, Math.max(10, 250 / Math.sqrt(nodes.length)));

        // Get node size based on heat score
        const getNodeSize = (node: EmailNode) => {
            const scoreFactor = node.heatScore / 100;
            return baseRadius * (0.7 + scoreFactor * 0.6);
        };

        // Create simulation
        const simulation = d3.forceSimulation(nodes)
            .alphaDecay(0.03)
            .velocityDecay(0.4);

        if (viewMode === 'radial') {
            // Radial layout: hotter emails closer to center
            simulation
                .force('radial', d3.forceRadial<EmailNode>(
                    d => {
                        // Higher heat = closer to center
                        const maxRadius = Math.min(width, height) / 2 - 50;
                        return maxRadius * (1 - d.heatScore / 100);
                    },
                    centerX,
                    centerY
                ).strength(0.8))
                .force('collision', d3.forceCollide<EmailNode>()
                    .radius(d => getNodeSize(d) + 3)
                    .strength(0.9));
        } else {
            // Cluster by heat status
            const clusterCenters: Record<EmailHeatStatus, { x: number; y: number }> = {
                critical: { x: centerX - width * 0.2, y: centerY - height * 0.15 },
                urgent: { x: centerX + width * 0.2, y: centerY - height * 0.15 },
                normal: { x: centerX - width * 0.15, y: centerY + height * 0.2 },
                low: { x: centerX + width * 0.15, y: centerY + height * 0.2 },
            };

            simulation
                .force('x', d3.forceX<EmailNode>(d => clusterCenters[d.heatStatus].x).strength(0.15))
                .force('y', d3.forceY<EmailNode>(d => clusterCenters[d.heatStatus].y).strength(0.15))
                .force('collision', d3.forceCollide<EmailNode>()
                    .radius(d => getNodeSize(d) + 4)
                    .strength(1))
                .force('charge', d3.forceManyBody().strength(-30).distanceMax(150));
        }

        // Pre-run simulation
        for (let i = 0; i < 120; i++) {
            simulation.tick();
        }
        simulation.alpha(0.1);

        // Draw nodes
        const nodeGroups = container.selectAll<SVGGElement, EmailNode>('g.email-node')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'email-node')
            .style('cursor', 'pointer');

        // Outer glow circle
        nodeGroups.append('circle')
            .attr('r', d => getNodeSize(d))
            .attr('fill', d => getEmailHeatColor(d.heatStatus))
            .attr('filter', d => `url(#email-glow-${d.heatStatus})`)
            .attr('opacity', d => 0.6 + (d.heatScore / 100) * 0.4);

        // Inner circle with initials
        nodeGroups.append('circle')
            .attr('r', d => getNodeSize(d) * 0.85)
            .attr('fill', d => getEmailHeatColor(d.heatStatus))
            .attr('stroke', 'rgba(255,255,255,0.3)')
            .attr('stroke-width', 1);

        // Initials text
        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#fff')
            .attr('font-size', d => getNodeSize(d) * 0.55)
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .text(d => {
                const names = d.email.from.split(' ');
                return names.map(n => n[0] || '').join('').toUpperCase().slice(0, 2) || '?';
            });

        // Interaction handlers
        nodeGroups
            .on('mouseenter', (event, d) => {
                setHoveredEmail(d.email);
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    setTooltipPos({
                        x: event.clientX - rect.left + 10,
                        y: event.clientY - rect.top - 10,
                    });
                }

                d3.select(event.currentTarget)
                    .select('circle:first-child')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d) * 1.3);
            })
            .on('mousemove', (event) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    setTooltipPos({
                        x: event.clientX - rect.left + 10,
                        y: event.clientY - rect.top - 10,
                    });
                }
            })
            .on('mouseleave', (event, d) => {
                setHoveredEmail(null);
                d3.select(event.currentTarget)
                    .select('circle:first-child')
                    .transition()
                    .duration(150)
                    .attr('r', getNodeSize(d));
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                if (onEmailClick) onEmailClick(d.email);
            });

        // Update positions on tick
        simulation.on('tick', () => {
            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => {
            simulation.stop();
        };
    }, [emails, dimensions, viewMode, onEmailClick]);

    if (emails.length === 0) {
        return (
            <div className={styles.container} style={{ height }}>
                <div className={styles.emptyState}>
                    <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <p>No emails to visualize</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={styles.container} style={{ height }}>
            <div className={styles.header}>
                <h3 className={styles.title}>Email Urgency Heatmap</h3>
                <p className={styles.subtitle}>
                    {emails.length} emails • Larger/brighter = more urgent
                </p>
            </div>

            <div className={styles.controls}>
                <button
                    className={`${styles.controlBtn} ${viewMode === 'cluster' ? styles.active : ''}`}
                    onClick={() => setViewMode('cluster')}
                >
                    Cluster
                </button>
                <button
                    className={`${styles.controlBtn} ${viewMode === 'radial' ? styles.active : ''}`}
                    onClick={() => setViewMode('radial')}
                >
                    Radial
                </button>
            </div>

            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className={styles.svg}
            />

            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.critical}`} />
                    <span>Critical</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.urgent}`} />
                    <span>Urgent</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.normal}`} />
                    <span>Normal</span>
                </div>
                <div className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.low}`} />
                    <span>Low</span>
                </div>
            </div>

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                className={`${styles.tooltip} ${hoveredEmail ? styles.visible : ''}`}
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
                {hoveredEmail && (
                    <>
                        <div className={styles.tooltipHeader}>
                            <span
                                className={styles.tooltipHeat}
                                style={{ backgroundColor: getEmailHeatColor(getEmailHeatStatus(hoveredEmail)) }}
                            />
                            <span className={styles.tooltipSubject}>{hoveredEmail.subject}</span>
                        </div>
                        <p className={styles.tooltipFrom}>From: {hoveredEmail.from}</p>
                        <div className={styles.tooltipMeta}>
                            <span>{formatEmailAge(hoveredEmail.date)}</span>
                            <span className={`${styles.tooltipBadge} ${styles[hoveredEmail.analysis.priority.toLowerCase()]}`}>
                                {hoveredEmail.analysis.priority}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
