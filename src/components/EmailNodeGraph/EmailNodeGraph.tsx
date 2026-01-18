'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import styles from './EmailNodeGraph.module.css';
import type { AnalyzedEmail } from '@/lib/gemini/service';

interface CategoryNode {
    id: string;
    label: string;
    count: number;
    color: string;
    angle: number;
    orbitRadius: number;
    emails: AnalyzedEmail[];
}

interface EmailNodeGraphProps {
    emails: AnalyzedEmail[];
    onEmailSelect?: (email: AnalyzedEmail | null) => void;
}

// Extract domain/sender name from email
function extractSenderCategory(from: string): string {
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

// Generate colors for categories
function getCategoryColor(index: number): string {
    const colors = [
        '#bf5af2', '#ff6b6b', '#ffc078', '#74c0fc',
        '#63e6be', '#ffd43b', '#ff922b', '#da77f2',
    ];
    return colors[index % colors.length];
}

// Priority colors for email nodes
function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'HIGH': return '#ff6b6b';
        case 'MEDIUM': return '#ffc078';
        case 'LOW': return '#74c0fc';
        default: return '#86868b';
    }
}

export function EmailNodeGraph({ emails, onEmailSelect }: EmailNodeGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
    const animationRef = useRef<number | undefined>(undefined);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [zoomedIn, setZoomedIn] = useState(false);

    // Group emails by category
    const categories = React.useMemo(() => {
        const categoryMap = new Map<string, AnalyzedEmail[]>();

        emails.forEach(email => {
            const category = extractSenderCategory(email.from);
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(email);
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 6)
            .map(([label, emailList], index): CategoryNode => ({
                id: label.toLowerCase().replace(/\s+/g, '-'),
                label,
                count: emailList.length,
                emails: emailList,
                color: getCategoryColor(index),
                angle: (index / 6) * Math.PI * 2,
                orbitRadius: 100,
            }));
    }, [emails]);

    const handleBack = useCallback(() => {
        setSelectedCategory(null);
        setZoomedIn(false);
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (svgRef.current) {
                const { width, height } = svgRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        // Use ResizeObserver for more robust resizing
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        window.addEventListener('resize', updateDimensions);
        return () => {
            window.removeEventListener('resize', updateDimensions);
            resizeObserver.disconnect();
        };
    }, []);

    // Main categories view
    useEffect(() => {
        if (!svgRef.current || categories.length === 0 || zoomedIn) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const orbitRadius = Math.min(width, height) * 0.32;

        // Defs for glows
        const defs = svg.append('defs');

        const centerGlow = defs.append('filter')
            .attr('id', 'center-glow')
            .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
        centerGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
        const centerMerge = centerGlow.append('feMerge');
        centerMerge.append('feMergeNode').attr('in', 'blur');
        centerMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        categories.forEach(cat => {
            const filter = defs.append('filter')
                .attr('id', `glow-${cat.id}`)
                .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
            filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
            const merge = filter.append('feMerge');
            merge.append('feMergeNode').attr('in', 'blur');
            merge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        const container = svg.append('g');

        // Orbit ring
        container.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', orbitRadius)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(191, 90, 242, 0.12)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,6');

        // Center node
        const centerGroup = container.append('g')
            .attr('transform', `translate(${centerX}, ${centerY})`);

        centerGroup.append('circle')
            .attr('r', 40)
            .attr('fill', '#bf5af2')
            .attr('filter', 'url(#center-glow)')
            .attr('stroke', 'rgba(255,255,255,0.3)')
            .attr('stroke-width', 2);

        centerGroup.append('text')
            .text('INBOX')
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '12px')
            .style('font-weight', '600');

        // Category nodes
        const nodeData = categories.map(cat => ({
            ...cat,
            orbitRadius,
        }));

        const nodeGroups = container.selectAll<SVGGElement, CategoryNode>('g.category-node')
            .data(nodeData)
            .join('g')
            .attr('class', 'category-node')
            .style('cursor', 'pointer');

        nodeGroups.append('circle')
            .attr('r', d => 22 + Math.min(d.count * 3, 14))
            .attr('fill', d => d.color)
            .attr('filter', d => `url(#glow-${d.id})`)
            .attr('stroke', 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 1.5);

        nodeGroups.append('text')
            .text(d => d.count)
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .style('font-weight', '700');

        nodeGroups.append('text')
            .text(d => d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label)
            .attr('dy', d => 32 + Math.min(d.count * 3, 14))
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .style('font-size', '11px')
            .style('font-weight', '500');

        // Click to zoom in
        nodeGroups.on('click', (event, d) => {
            event.stopPropagation();
            setSelectedCategory(d.label);
            setZoomedIn(true);
        });

        // Hover effects
        nodeGroups
            .on('mouseenter', function (event, d) {
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', (22 + Math.min(d.count * 3, 14)) * 1.15)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
            })
            .on('mouseleave', function (event, d) {
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', 22 + Math.min(d.count * 3, 14))
                    .attr('stroke', 'rgba(255,255,255,0.2)')
                    .attr('stroke-width', 1.5);
            });

        // Slow rotation
        const animate = () => {
            nodeData.forEach(node => {
                node.angle += 0.0004;
            });

            nodeGroups.attr('transform', d => {
                const x = centerX + d.orbitRadius * Math.cos(d.angle);
                const y = centerY + d.orbitRadius * Math.sin(d.angle);
                return `translate(${x}, ${y})`;
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [dimensions, categories, zoomedIn]);

    // Zoomed-in view showing individual emails
    useEffect(() => {
        if (!svgRef.current || !zoomedIn || !selectedCategory) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const category = categories.find(c => c.label === selectedCategory);
        if (!category) return;

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;

        // Defs
        const defs = svg.append('defs');

        const centerGlow = defs.append('filter')
            .attr('id', 'category-glow')
            .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
        centerGlow.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
        const centerMerge = centerGlow.append('feMerge');
        centerMerge.append('feMergeNode').attr('in', 'blur');
        centerMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        const container = svg.append('g');

        // Orbit ring
        const orbitRadius = Math.min(width, height) * 0.35;
        container.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', orbitRadius)
            .attr('fill', 'none')
            .attr('stroke', `${category.color}30`)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,6');

        // Center category node
        const centerGroup = container.append('g')
            .attr('transform', `translate(${centerX}, ${centerY})`);

        centerGroup.append('circle')
            .attr('r', 50)
            .attr('fill', category.color)
            .attr('filter', 'url(#category-glow)')
            .attr('stroke', 'rgba(255,255,255,0.4)')
            .attr('stroke-width', 2);

        centerGroup.append('text')
            .text(category.label)
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .style('font-weight', '600');

        // Email nodes
        const emailNodes = category.emails.map((email, i) => ({
            ...email,
            angle: (i / category.emails.length) * Math.PI * 2 - Math.PI / 2,
            orbitRadius,
        }));

        const emailGroups = container.selectAll<SVGGElement, typeof emailNodes[0]>('g.email-node')
            .data(emailNodes)
            .join('g')
            .attr('class', 'email-node')
            .style('cursor', 'pointer')
            .attr('transform', d => {
                const x = centerX + d.orbitRadius * Math.cos(d.angle);
                const y = centerY + d.orbitRadius * Math.sin(d.angle);
                return `translate(${x}, ${y})`;
            });

        emailGroups.append('circle')
            .attr('r', 24)
            .attr('fill', d => getPriorityColor(d.analysis.priority))
            .attr('stroke', 'rgba(255,255,255,0.3)')
            .attr('stroke-width', 1.5);

        // Email icon or first letter
        emailGroups.append('text')
            .text(d => d.subject.charAt(0).toUpperCase())
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '12px')
            .style('font-weight', '600');

        // Subject label (truncated)
        emailGroups.append('text')
            .text(d => d.subject.length > 12 ? d.subject.slice(0, 11) + '…' : d.subject)
            .attr('dy', 42)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .style('font-size', '10px')
            .style('font-weight', '500');

        // Connection lines
        emailGroups.each(function (d) {
            container.insert('line', ':first-child')
                .attr('x1', centerX)
                .attr('y1', centerY)
                .attr('x2', centerX + d.orbitRadius * Math.cos(d.angle))
                .attr('y2', centerY + d.orbitRadius * Math.sin(d.angle))
                .attr('stroke', `${category.color}40`)
                .attr('stroke-width', 1);
        });

        // Click to open email
        emailGroups.on('click', (event, d) => {
            window.open(`https://mail.google.com/mail/u/0/#inbox/${d.threadId}`, '_blank');
        });

        // Hover effects
        emailGroups
            .on('mouseenter', function () {
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', 30)
                    .attr('stroke', 'white')
                    .attr('stroke-width', 2);
            })
            .on('mouseleave', function () {
                d3.select(this).select('circle')
                    .transition().duration(150)
                    .attr('r', 24)
                    .attr('stroke', 'rgba(255,255,255,0.3)')
                    .attr('stroke-width', 1.5);
            });

    }, [dimensions, categories, selectedCategory, zoomedIn, onEmailSelect]);

    if (categories.length === 0) return null;

    return (
        <div ref={containerRef} className={styles.container + (zoomedIn ? ' ' + styles.expanded : '')}>
            <div className={styles.header}>
                <h3 className={styles.title}>
                    {zoomedIn ? `${selectedCategory} Emails` : 'Filter by Sender'}
                </h3>
                {zoomedIn && (
                    <button className={styles.backBtn} onClick={handleBack}>
                        ← Back to All
                    </button>
                )}
            </div>
            <svg ref={svgRef} className={styles.svg} />
            {!zoomedIn && (
                <p className={styles.hint}>Click a category to see emails</p>
            )}
        </div>
    );
}
