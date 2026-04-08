'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import styles from './EmailNodeGraph.module.css';
import { EmailPreview } from '../EmailPreview';
import type { AnalyzedEmail } from '@/lib/gemini/service';

interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    isCenter?: boolean;
    email?: AnalyzedEmail;
    category?: string;
    count?: number;
    color?: string;
    emails?: AnalyzedEmail[];
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    source: SimNode | string;
    target: SimNode | string;
}

interface EmailNodeGraphProps {
    emails: AnalyzedEmail[];
    connectedEmail?: string;
    onEmailSelect?: (email: AnalyzedEmail | null) => void;
}

// Extract sender category from email
function extractCategory(from: string): string {
    const emailMatch = from.match(/<([^>]+)>/);
    const email = emailMatch ? emailMatch[1] : from;
    const domainMatch = email.match(/@([^.]+)/);
    if (domainMatch) {
        const domain = domainMatch[1].toLowerCase();
        if (['gmail', 'yahoo', 'outlook', 'hotmail'].includes(domain)) {
            const nameMatch = from.match(/^([^<]+)/);
            if (nameMatch) return nameMatch[1].trim().split(' ')[0];
            return 'Personal';
        }
        return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    const nameMatch = from.match(/^([^\s<]+)/);
    return nameMatch ? nameMatch[1] : 'Unknown';
}

// Category colors
const CATEGORY_COLORS = [
    '#bf5af2', '#ff6b6b', '#ffc078', '#74c0fc',
    '#63e6be', '#ffd43b', '#ff922b', '#da77f2',
];

function getCategoryColor(index: number): string {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

// Priority colors
function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'HIGH': return '#ff6b6b';
        case 'MEDIUM': return '#ffc078';
        case 'LOW': return '#74c0fc';
        default: return '#86868b';
    }
}

const CENTER_COLOR = '#a855f7';

export function EmailNodeGraph({ emails, connectedEmail }: EmailNodeGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
    const [previewEmail, setPreviewEmail] = useState<AnalyzedEmail | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Group emails by category
    const categories = useMemo(() => {
        const categoryMap = new Map<string, AnalyzedEmail[]>();
        emails.forEach(email => {
            const category = extractCategory(email.from);
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(email);
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 8)
            .map(([label, emailList], index) => ({
                id: label.toLowerCase().replace(/\s+/g, '-'),
                label,
                emails: emailList,
                count: emailList.length,
                color: getCategoryColor(index),
            }));
    }, [emails]);

    // Get emails for selected category
    const categoryEmails = useMemo(() => {
        if (!selectedCategory) return [];
        const cat = categories.find(c => c.label === selectedCategory);
        return cat?.emails || [];
    }, [selectedCategory, categories]);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };
        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // CATEGORY VIEW
    useEffect(() => {
        if (!svgRef.current || categories.length === 0 || selectedCategory) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;

        // Center node
        const centerNode: SimNode = {
            id: 'CENTER',
            isCenter: true,
            x: centerX,
            y: centerY,
            fx: centerX,
            fy: centerY,
        };

        // Category nodes
        const categoryNodes: SimNode[] = categories.map((cat, i) => {
            const angle = (i / categories.length) * Math.PI * 2;
            const radius = 120;
            return {
                id: cat.id,
                category: cat.label,
                count: cat.count,
                emails: cat.emails,
                color: cat.color,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            };
        });

        const nodes: SimNode[] = [centerNode, ...categoryNodes];
        const simLinks: SimLink[] = categoryNodes.map(node => ({
            source: centerNode,
            target: node,
        }));

        // Defs
        const defs = svg.append('defs');
        const centerGlow = defs.append('filter')
            .attr('id', 'center-glow')
            .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        centerGlow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
        const centerMerge = centerGlow.append('feMerge');
        centerMerge.append('feMergeNode').attr('in', 'blur');
        centerMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        categories.forEach(cat => {
            const filter = defs.append('filter')
                .attr('id', `glow-${cat.id}`)
                .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'blur');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 3])
            .on('zoom', (event) => container.attr('transform', event.transform));
        svg.call(zoom);

        const container = svg.append('g');

        // Links
        const linkElements = container.append('g')
            .selectAll<SVGLineElement, SimLink>('line')
            .data(simLinks)
            .join('line')
            .attr('stroke', 'rgba(168, 85, 247, 0.3)')
            .attr('stroke-width', 1.5);

        // Force simulation
        const orbitRadius = Math.min(width, height) * 0.3;
        const simulation = d3.forceSimulation(nodes)
            .alphaDecay(0.05)
            .velocityDecay(0.5)
            .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
                .id(d => d.id)
                .distance(orbitRadius)
                .strength(0.2))
            .force('charge', d3.forceManyBody()
                .strength(d => (d as SimNode).isCenter ? -400 : -80))
            .force('collision', d3.forceCollide<SimNode>()
                .radius(d => d.isCenter ? 45 : 30 + Math.min((d.count || 0) * 2, 12))
                .strength(1))
            .force('radial', d3.forceRadial<SimNode>(
                d => d.isCenter ? 0 : orbitRadius,
                centerX, centerY
            ).strength(0.5))
            .alpha(0.4);

        // Pre-run
        for (let i = 0; i < 50; i++) simulation.tick();
        simulation.alpha(0.1);

        // Node groups
        const nodeGroups = container.selectAll<SVGGElement, SimNode>('g.node')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .style('cursor', d => d.isCenter ? 'default' : 'pointer');

        // Circles
        nodeGroups.append('circle')
            .attr('r', d => {
                if (d.isCenter) return 40;
                return 25 + Math.min((d.count || 0) * 2, 10);
            })
            .attr('fill', d => d.isCenter ? CENTER_COLOR : d.color || '#6b7280')
            .attr('filter', d => d.isCenter ? 'url(#center-glow)' : `url(#glow-${d.id})`)
            .attr('stroke', d => d.isCenter ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', d => d.isCenter ? 2.5 : 1.5);

        // Labels
        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', d => d.isCenter ? '0.35em' : '-0.1em')
            .attr('fill', '#fff')
            .attr('font-size', d => d.isCenter ? '13px' : '10px')
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .text(d => {
                if (d.isCenter) return 'INBOX';
                const label = d.category || '';
                return label.length > 7 ? label.slice(0, 6) + '…' : label;
            });

        // Count labels
        nodeGroups.filter(d => !d.isCenter)
            .append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1em')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .attr('font-size', '9px')
            .attr('font-weight', '500')
            .attr('pointer-events', 'none')
            .text(d => `${d.count}`);

        // Click to drill down
        nodeGroups.on('click', (event, d) => {
            if (d.isCenter) return;
            event.stopPropagation();
            setSelectedCategory(d.category || null);
        });

        // Hover
        nodeGroups
            .on('mouseenter', function (event, d) {
                if (d.isCenter) return;
                const r = 25 + Math.min((d.count || 0) * 2, 10);
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', r * 1.15)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
            })
            .on('mouseleave', function (event, d) {
                if (d.isCenter) return;
                const r = 25 + Math.min((d.count || 0) * 2, 10);
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', r)
                    .attr('stroke', 'rgba(255,255,255,0.2)')
                    .attr('stroke-width', 1.5);
            });

        // Drag
        const drag = d3.drag<SVGGElement, SimNode>()
            .on('start', (event, d) => {
                if (d.isCenter) return;
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                if (d.isCenter) return;
                d.fx = event.x; d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (d.isCenter) return;
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            });
        nodeGroups.call(drag);

        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as SimNode).x!)
                .attr('y1', d => (d.source as SimNode).y!)
                .attr('x2', d => (d.target as SimNode).x!)
                .attr('y2', d => (d.target as SimNode).y!);
            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [categories, dimensions, selectedCategory]);

    // EMAIL VIEW
    useEffect(() => {
        if (!svgRef.current || !selectedCategory || categoryEmails.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;

        const cat = categories.find(c => c.label === selectedCategory);
        const catColor = cat?.color || CENTER_COLOR;

        // Center node
        const centerNode: SimNode = {
            id: 'CENTER',
            isCenter: true,
            category: selectedCategory,
            x: centerX,
            y: centerY,
            fx: centerX,
            fy: centerY,
        };

        // Email nodes
        const emailNodes: SimNode[] = categoryEmails.map((email, i) => {
            const angle = (i / categoryEmails.length) * Math.PI * 2;
            const radius = 100 + Math.random() * 20;
            return {
                id: email.id,
                email,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
            };
        });

        const nodes: SimNode[] = [centerNode, ...emailNodes];
        const simLinks: SimLink[] = emailNodes.map(node => ({
            source: centerNode,
            target: node,
        }));

        // Defs
        const defs = svg.append('defs');
        const centerGlow = defs.append('filter')
            .attr('id', 'cat-glow')
            .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        centerGlow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
        const centerMerge = centerGlow.append('feMerge');
        centerMerge.append('feMergeNode').attr('in', 'blur');
        centerMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        ['HIGH', 'MEDIUM', 'LOW'].forEach(p => {
            const filter = defs.append('filter')
                .attr('id', `glow-${p}`)
                .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
            filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'blur');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.4, 4])
            .on('zoom', (event) => container.attr('transform', event.transform));
        svg.call(zoom);

        const container = svg.append('g');

        // Dynamic sizing
        const baseRadius = Math.min(16, Math.max(10, 150 / Math.sqrt(categoryEmails.length)));

        // Links
        const linkElements = container.append('g')
            .selectAll<SVGLineElement, SimLink>('line')
            .data(simLinks)
            .join('line')
            .attr('stroke', `${catColor}40`)
            .attr('stroke-width', 1);

        // Force
        const orbitRadius = Math.min(width, height) * 0.32;
        const simulation = d3.forceSimulation(nodes)
            .alphaDecay(0.05)
            .velocityDecay(0.4)
            .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
                .id(d => d.id)
                .distance(orbitRadius)
                .strength(0.1))
            .force('charge', d3.forceManyBody()
                .strength(d => (d as SimNode).isCenter ? -300 : -20))
            .force('collision', d3.forceCollide<SimNode>()
                .radius(d => d.isCenter ? 45 : baseRadius * 2)
                .strength(1))
            .force('radial', d3.forceRadial<SimNode>(
                d => d.isCenter ? 0 : orbitRadius,
                centerX, centerY
            ).strength(0.4))
            .alpha(0.4);

        for (let i = 0; i < 50; i++) simulation.tick();
        simulation.alpha(0.1);

        // Nodes
        const nodeGroups = container.selectAll<SVGGElement, SimNode>('g.node')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .style('cursor', d => d.isCenter ? 'default' : 'pointer');

        nodeGroups.append('circle')
            .attr('r', d => d.isCenter ? 45 : baseRadius)
            .attr('fill', d => d.isCenter ? catColor : getPriorityColor(d.email?.analysis.priority || 'LOW'))
            .attr('filter', d => d.isCenter ? 'url(#cat-glow)' : `url(#glow-${d.email?.analysis.priority || 'LOW'})`)
            .attr('stroke', d => d.isCenter ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', d => d.isCenter ? 2.5 : 1.5);

        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#fff')
            .attr('font-size', d => d.isCenter ? '12px' : `${Math.max(8, baseRadius * 0.6)}px`)
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .text(d => {
                if (d.isCenter) {
                    const label = selectedCategory;
                    return label.length > 9 ? label.slice(0, 8) + '…' : label;
                }
                return d.email?.subject.charAt(0).toUpperCase() || '?';
            });

        // Tooltips
        nodeGroups.filter(d => !d.isCenter)
            .append('title')
            .text(d => `${d.email?.subject}\n${d.email?.analysis.priority} Priority`);

        // Click
        nodeGroups.on('click', (event, d) => {
            if (d.isCenter) return;
            event.stopPropagation();
            setPreviewEmail(d.email || null);
        });

        // Hover
        nodeGroups
            .on('mouseenter', function (event, d) {
                if (d.isCenter) return;
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', baseRadius * 1.4)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
                linkElements
                    .attr('stroke-opacity', link => (link.target as SimNode).id === d.id ? 1 : 0.2)
                    .attr('stroke-width', link => (link.target as SimNode).id === d.id ? 2 : 1);
            })
            .on('mouseleave', function (event, d) {
                if (d.isCenter) return;
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', baseRadius)
                    .attr('stroke', 'rgba(255,255,255,0.2)')
                    .attr('stroke-width', 1.5);
                linkElements.attr('stroke-opacity', 1).attr('stroke-width', 1);
            });

        // Drag
        const drag = d3.drag<SVGGElement, SimNode>()
            .on('start', (event, d) => {
                if (d.isCenter) return;
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on('drag', (event, d) => {
                if (d.isCenter) return;
                d.fx = event.x; d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (d.isCenter) return;
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            });
        nodeGroups.call(drag);

        svg.on('click', () => setPreviewEmail(null));

        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as SimNode).x!)
                .attr('y1', d => (d.source as SimNode).y!)
                .attr('x2', d => (d.target as SimNode).x!)
                .attr('y2', d => (d.target as SimNode).y!);
            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [selectedCategory, categoryEmails, dimensions, categories]);

    const handleBack = useCallback(() => {
        setSelectedCategory(null);
        setPreviewEmail(null);
    }, []);

    if (emails.length === 0) return null;

    return (
        <div ref={containerRef} className={`${styles.container} ${selectedCategory ? styles.expanded : ''}`}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    {selectedCategory ? `${selectedCategory} Emails` : 'Email Network'}
                </h3>
                {selectedCategory ? (
                    <button className={styles.backBtn} onClick={handleBack}>
                        ← Back
                    </button>
                ) : (
                    <span className={styles.count}>{categories.length} senders</span>
                )}
            </div>
            <svg ref={svgRef} className={styles.svg} />
            <p className={styles.hint}>
                {selectedCategory
                    ? 'Drag • Scroll to zoom • Click for details'
                    : 'Click a sender to see emails'}
            </p>

            {previewEmail && (
                <EmailPreview
                    email={previewEmail}
                    onClose={() => setPreviewEmail(null)}
                    onOpenInGmail={() => {
                        const authParam = connectedEmail ? `?authuser=${encodeURIComponent(connectedEmail)}` : '/u/0';
                        const gmailUrl = connectedEmail
                            ? `https://mail.google.com/mail${authParam}#inbox/${previewEmail.threadId}`
                            : `https://mail.google.com/mail/u/0/#inbox/${previewEmail.threadId}`;
                        window.open(gmailUrl, '_blank');
                    }}
                />
            )}
        </div>
    );
}
