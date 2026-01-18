'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useRouter } from 'next/navigation';
import styles from './HomeGraph.module.css';

interface HomeNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    href?: string;
    isUser?: boolean;
    color: string;
}

interface HomeLink extends d3.SimulationLinkDatum<HomeNode> {
    source: HomeNode | string;
    target: HomeNode | string;
}

export default function HomeGraph() {
    const router = useRouter();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

        const nodes: HomeNode[] = [
            { id: 'user', label: 'YOU', isUser: true, color: '#a855f7', x: centerX, y: centerY, fx: centerX, fy: centerY },
            { id: 'connections', label: 'Connections', href: '/connections', color: '#3b82f6', x: centerX - 100, y: centerY },
            { id: 'email', label: 'Email', href: '/email', color: '#10b981', x: centerX + 100, y: centerY },
        ];

        const links: HomeLink[] = [
            { source: 'user', target: 'connections' },
            { source: 'user', target: 'email' },
        ];

        // Define filters for glows
        const defs = svg.append('defs');
        const colors = { user: '#a855f7', connections: '#3b82f6', email: '#10b981' };

        Object.entries(colors).forEach(([key, color]) => {
            const filter = defs.append('filter')
                .attr('id', `glow-${key}`)
                .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');

            filter.append('feGaussianBlur')
                .attr('stdDeviation', '4')
                .attr('result', 'coloredBlur');

            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        const container = svg.append('g');

        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink<HomeNode, HomeLink>(links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(centerX, centerY));

        const linkElements = container.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', 'rgba(168, 85, 247, 0.4)')
            .attr('stroke-width', 2);

        const nodeGroups = container.selectAll<SVGGElement, HomeNode>('g.node')
            .data(nodes)
            .join('g')
            .style('cursor', d => d.isUser ? 'default' : 'pointer')
            .call(d3.drag<SVGGElement, HomeNode>()
                .on('start', (event, d) => {
                    if (d.isUser) return;
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    if (d.isUser) return;
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (d.isUser) return;
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));

        nodeGroups.append('circle')
            .attr('r', d => d.isUser ? 35 : 25)
            .attr('fill', d => d.color)
            .attr('filter', d => `url(#glow-${d.id})`)
            .attr('stroke', d => d.isUser ? 'rgba(255,255,255,0.5)' : 'transparent')
            .attr('stroke-width', d => d.isUser ? 3 : 2)
            .attr('stroke-opacity', d => d.isUser ? 1 : 0);

        nodeGroups.append('text')
            .text(d => d.label)
            .attr('dy', d => d.isUser ? 55 : 45)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('pointer-events', 'none');

        // Hover effects
        nodeGroups
            .on('mouseenter', function (event, d) {
                if (d.isUser) return;
                const r = d.isUser ? 35 : 25;
                d3.select(this).select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', r * 1.3);
            })
            .on('mouseleave', function (event, d) {
                if (d.isUser) return;
                const r = d.isUser ? 35 : 25;
                d3.select(this).select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', r);
            });

        // Click to navigate
        nodeGroups.on('click', (event, d) => {
            if (d.href) {
                router.push(d.href);
            }
        });

        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as HomeNode).x!)
                .attr('y1', d => (d.source as HomeNode).y!)
                .attr('x2', d => (d.target as HomeNode).x!)
                .attr('y2', d => (d.target as HomeNode).y!);

            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [dimensions, router]);

    return (
        <div ref={containerRef} className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Nodely</h1>
            </header>
            <svg ref={svgRef} className={styles.svg} />
        </div>
    );
}
