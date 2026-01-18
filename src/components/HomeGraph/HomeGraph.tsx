'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './HomeGraph.module.css';

interface OrbitNode {
    id: string;
    label: string;
    href?: string;
    isUser?: boolean;
    color: string;
    orbitRadius?: number;
    orbitSpeed?: number;
    angle?: number;
    size: number;
}

export default function HomeGraph() {
    const router = useRouter();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const animationRef = useRef<number>();

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const centerX = width / 2;
        const centerY = height / 2;

        // Nodes with orbit properties
        const nodes: OrbitNode[] = [
            { id: 'user', label: 'YOU', isUser: true, color: '#a855f7', size: 50 },
            { id: 'connections', label: 'Connections', href: '/connections', color: '#3b82f6', orbitRadius: 150, orbitSpeed: 0.0008, angle: 0, size: 35 },
            { id: 'email', label: 'Emails', href: '/emails', color: '#10b981', orbitRadius: 150, orbitSpeed: 0.0008, angle: Math.PI, size: 35 },
        ];

        // Define glow filters
        const defs = svg.append('defs');

        // Orbit path gradient
        const orbitGradient = defs.append('radialGradient')
            .attr('id', 'orbit-glow')
            .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
        orbitGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(168, 85, 247, 0.3)');
        orbitGradient.append('stop').attr('offset', '100%').attr('stop-color', 'transparent');

        // Node glows
        nodes.forEach(node => {
            const filter = defs.append('filter')
                .attr('id', `glow-${node.id}`)
                .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');

            filter.append('feGaussianBlur')
                .attr('stdDeviation', node.isUser ? '8' : '5')
                .attr('result', 'coloredBlur');

            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        const container = svg.append('g');

        // Draw orbit ring
        container.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', 150)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(168, 85, 247, 0.15)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '8,8');

        // Draw orbit glow ring
        container.append('circle')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', 150)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(168, 85, 247, 0.08)')
            .attr('stroke-width', 20);

        // Create node groups
        const nodeGroups = container.selectAll<SVGGElement, OrbitNode>('g.node')
            .data(nodes)
            .join('g')
            .attr('class', 'node')
            .style('cursor', d => d.isUser ? 'default' : 'pointer');

        // Add circles
        nodeGroups.append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color)
            .attr('filter', d => `url(#glow-${d.id})`)
            .attr('stroke', d => d.isUser ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 2);

        // Add inner glow for center
        nodeGroups.filter(d => d.isUser)
            .append('circle')
            .attr('r', 35)
            .attr('fill', 'rgba(168, 85, 247, 0.3)');

        // Add labels
        nodeGroups.append('text')
            .text(d => d.label)
            .attr('dy', d => d.size + 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', d => d.isUser ? '16px' : '14px')
            .style('font-weight', '600')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 2px 10px rgba(0,0,0,0.5)');

        // Hover effects
        nodeGroups
            .on('mouseenter', function (event, d) {
                if (d.isUser) return;
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.size * 1.2);
            })
            .on('mouseleave', function (event, d) {
                if (d.isUser) return;
                d3.select(this).select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.size);
            });

        // Click to navigate
        nodeGroups.on('click', (event, d) => {
            if (d.href) {
                router.push(d.href);
            }
        });

        // Animation loop
        const animate = () => {
            nodes.forEach(node => {
                if (node.orbitRadius && node.orbitSpeed !== undefined && node.angle !== undefined) {
                    node.angle += node.orbitSpeed;
                }
            });

            nodeGroups.attr('transform', d => {
                if (d.isUser) {
                    return `translate(${centerX}, ${centerY})`;
                }
                const x = centerX + (d.orbitRadius || 0) * Math.cos(d.angle || 0);
                const y = centerY + (d.orbitRadius || 0) * Math.sin(d.angle || 0);
                return `translate(${x}, ${y})`;
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [dimensions, router]);

    return (
        <div ref={containerRef} className={styles.container}>
            <header className={styles.header}>
                <div className={styles.navLinks}>
                    <Link href="/connections" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Connections
                    </Link>
                    <Link href="/emails" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Emails
                    </Link>
                </div>
                <h1 className={styles.title}>Nodeify</h1>
            </header>
            <svg ref={svgRef} className={styles.svg} />
        </div>
    );
}
