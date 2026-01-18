'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ConnectionNode, HeatStatus } from '@/types';
import { useConnections } from '@/context/ConnectionsContext';
import { getHeatColor } from '@/utils/heatMap';
import styles from './GraphCanvas.module.css';

interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    isUser?: boolean;
    connection?: ConnectionNode;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    source: SimNode | string;
    target: SimNode | string;
}

const USER_COLOR = '#a855f7';
const NEUTRAL_COLOR = '#6b7280';

function getNodeColor(node: SimNode): string {
    if (node.isUser) return USER_COLOR;
    if (!node.connection) return NEUTRAL_COLOR;

    if (node.connection.degree === 1) {
        return getHeatColor(node.connection.heatStatus);
    }
    return NEUTRAL_COLOR;
}

function getNodeSize(node: SimNode, baseRadius: number): number {
    if (node.isUser) return baseRadius * 1.8;
    if (!node.connection) return baseRadius;

    switch (node.connection.degree) {
        case 1: return baseRadius * 1.1;
        case 2: return baseRadius * 0.85;
        case 3: return baseRadius * 0.65;
    }
}

export default function GraphCanvas() {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { filteredConnections, links, selectConnection, selectedConnection, deleteConnection } = useConnections();
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    // Store node positions to persist across updatess
    const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

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

        const userNode: SimNode = {
            id: 'USER',
            isUser: true,
            x: centerX,
            y: centerY,
            fx: centerX,
            fy: centerY,
        };

        // First pass: create node map to find parent positions
        const connById = new Map(filteredConnections.map(c => [c.id, c]));

        // Calculate angles for 1st degree connections (spread evenly)
        const firstDegree = filteredConnections.filter(c => c.degree === 1);
        const angleByFirstDegree = new Map<string, number>();
        firstDegree.forEach((conn, i) => {
            angleByFirstDegree.set(conn.id, (i / firstDegree.length) * Math.PI * 2);
        });

        const connectionNodes: SimNode[] = filteredConnections.map((conn) => {
            // Use saved position or calculate a new one based on degree
            const savedPos = nodePositionsRef.current.get(conn.id);

            let angle: number;
            if (conn.degree === 1) {
                angle = angleByFirstDegree.get(conn.id) || Math.random() * Math.PI * 2;
            } else if (conn.connectedThrough) {
                // Find parent's angle and add small variation
                const parent = connById.get(conn.connectedThrough);
                if (parent && parent.degree === 1) {
                    angle = (angleByFirstDegree.get(parent.id) || 0) + (Math.random() - 0.5) * 0.5;
                } else if (parent?.connectedThrough) {
                    // 3rd degree - find grandparent
                    const grandparent = connById.get(parent.connectedThrough);
                    angle = (angleByFirstDegree.get(grandparent?.id || '') || 0) + (Math.random() - 0.5) * 0.7;
                } else {
                    angle = Math.random() * Math.PI * 2;
                }
            } else {
                angle = Math.random() * Math.PI * 2;
            }

            const degreeRadius = {
                1: 120,
                2: 220,
                3: 320,
            };
            const radius = degreeRadius[conn.degree] || 150;

            return {
                id: conn.id,
                connection: conn,
                x: savedPos?.x ?? centerX + Math.cos(angle) * radius,
                y: savedPos?.y ?? centerY + Math.sin(angle) * radius,
            };
        });

        const nodes: SimNode[] = [userNode, ...connectionNodes];
        const nodeById = new Map(nodes.map(n => [n.id, n]));

        const simLinks: SimLink[] = [];
        connectionNodes.forEach(node => {
            if (node.connection?.degree === 1) {
                simLinks.push({
                    source: userNode,
                    target: node,
                });
            }
        });

        links.forEach(link => {
            const source = nodeById.get(link.source);
            const target = nodeById.get(link.target);
            if (source && target) {
                simLinks.push({ source, target });
            }
        });

        const defs = svg.append('defs');

        ['hot', 'warm', 'cold', 'user'].forEach(status => {
            const filter = defs.append('filter')
                .attr('id', `glow-${status}`)
                .attr('x', '-50%')
                .attr('y', '-50%')
                .attr('width', '200%')
                .attr('height', '200%');

            filter.append('feGaussianBlur')
                .attr('stdDeviation', status === 'user' ? '6' : '3')
                .attr('result', 'coloredBlur');

            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
        });

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svg.call(zoom);

        const container = svg.append('g');

        const baseRadius = Math.min(14, Math.max(8, 180 / Math.sqrt(nodes.length)));

        const linkElements = container.append('g')
            .attr('class', 'links')
            .selectAll<SVGLineElement, SimLink>('line')
            .data(simLinks)
            .join('line')
            .attr('stroke', d => {
                const source = d.source as SimNode;
                if (source.isUser) return 'rgba(168, 85, 247, 0.4)'; // Purple for user links
                return 'rgba(99, 102, 241, 0.25)';
            })
            .attr('stroke-width', d => {
                const source = d.source as SimNode;
                return source.isUser ? 1.5 : 1;
            });

        // Calculate ring radii for each degree
        const maxRadius = Math.min(width, height) / 2 - 60;
        const degreeRadius = {
            1: maxRadius * 0.3,   // 1st degree ring
            2: maxRadius * 0.6,   // 2nd degree ring
            3: maxRadius * 0.9,   // 3rd degree ring
        };

        // Custom radial force for degree-based positioning
        const radialForce = (alpha: number) => {
            connectionNodes.forEach(node => {
                if (!node.connection || node.x === undefined || node.y === undefined) return;

                const degree = node.connection.degree;
                const targetRadius = degreeRadius[degree];

                // Calculate current distance from center
                const dx = node.x - centerX;
                const dy = node.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                // Calculate force to push toward target radius
                const diff = targetRadius - dist;
                const strength = alpha * 0.15; // Radial force strength

                node.vx = (node.vx || 0) + (dx / dist) * diff * strength;
                node.vy = (node.vy || 0) + (dy / dist) * diff * strength;
            });
        };

        const simulation = d3.forceSimulation(nodes)
            .alphaDecay(0.03) // Faster settling (default is 0.0228)
            .velocityDecay(0.4) // More friction to reduce shaking
            .force('radial', radialForce)
            .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
                .id(d => d.id)
                .distance(d => {
                    const source = d.source as SimNode;
                    if (source.isUser) {
                        return degreeRadius[1];
                    }
                    return 80; // Slightly more distance between parent-child
                })
                .strength(d => {
                    const source = d.source as SimNode;
                    return source.isUser ? 0.2 : 0.5;
                }))
            .force('charge', d3.forceManyBody()
                .strength(d => (d as SimNode).isUser ? -500 : -80)
                .distanceMax(400))
            .force('collision', d3.forceCollide<SimNode>()
                .radius(d => getNodeSize(d, baseRadius) * 3)
                .strength(1))
            .alpha(0.3) // Start with lower energy
            .alphaTarget(0);

        // Pre-run simulation to settle positions before rendering (no shaking)
        for (let i = 0; i < 100; i++) {
            simulation.tick();
        }
        simulation.alpha(0.1); // Very low energy after pre-simulation

        const nodeGroups = container.selectAll<SVGGElement, SimNode>('g.node')
            .data(nodes, d => d.id)
            .join('g')
            .attr('class', 'node')
            .style('cursor', d => d.isUser ? 'default' : 'pointer');

        nodeGroups.append('circle')
            .attr('r', d => getNodeSize(d, baseRadius))
            .attr('fill', d => getNodeColor(d))
            .attr('filter', d => {
                if (d.isUser) return 'url(#glow-user)';
                if (d.connection?.degree === 1) {
                    return `url(#glow-${d.connection.heatStatus})`;
                }
                return 'none';
            })
            .attr('stroke', d => {
                if (d.isUser) return 'rgba(255,255,255,0.5)';
                if (selectedConnection?.id === d.id) return '#fff';
                return 'transparent';
            })
            .attr('stroke-width', d => d.isUser ? 3 : 2)
            .attr('opacity', d => {
                if (d.isUser) return 1;
                if (d.connection?.degree === 1) return 1;
                if (d.connection?.degree === 2) return 0.85;
                return 0.7;
            })
            .style('transition', 'all 0.15s ease');

        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', '#fff')
            .attr('font-size', d => d.isUser ? baseRadius * 0.9 : getNodeSize(d, baseRadius) * 0.6)
            .attr('font-weight', d => d.isUser ? '700' : '600')
            .attr('pointer-events', 'none')
            .text(d => {
                if (d.isUser) return 'YOU';
                const names = d.connection!.name.split(' ');
                return names.map(n => n[0]).join('').toUpperCase().slice(0, 2);
            });

        nodeGroups.filter(d => !d.isUser)
            .append('title')
            .text(d => `${d.connection!.name}\n${d.connection!.title}\n${d.connection!.company}\n(${d.connection!.degree}° connection)`);
        nodeGroups.on('click', (event, d) => {
            if (d.isUser) return;
            event.stopPropagation();
            selectConnection(d.connection!);
        });

        // Hover effects
        nodeGroups
            .on('mouseenter', function (event, d) {
                if (d.isUser) return;

                const size = getNodeSize(d, baseRadius);
                d3.select(this).select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', size * 1.3);

                linkElements
                    .attr('stroke-opacity', link => {
                        const source = link.source as SimNode;
                        const target = link.target as SimNode;
                        return (source.id === d.id || target.id === d.id) ? 1 : 0.3;
                    })
                    .attr('stroke-width', link => {
                        const source = link.source as SimNode;
                        const target = link.target as SimNode;
                        return (source.id === d.id || target.id === d.id) ? 2.5 : 1;
                    });
            })
            .on('mouseleave', function (event, d) {
                if (d.isUser) return;

                const size = getNodeSize(d, baseRadius);
                d3.select(this).select('circle')
                    .transition()
                    .duration(150)
                    .attr('r', size);

                // Reset links
                linkElements
                    .attr('stroke-opacity', 1)
                    .attr('stroke-width', link => {
                        const source = link.source as SimNode;
                        return source.isUser ? 1.5 : 1;
                    });
            });

        // Drag behavior (not for user node)
        const drag = d3.drag<SVGGElement, SimNode>()
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
            });

        nodeGroups.call(drag);

        // Click background to deselect
        svg.on('click', () => {
            selectConnection(null);
        });

        // Update on tick
        simulation.on('tick', () => {
            linkElements
                .attr('x1', d => (d.source as SimNode).x!)
                .attr('y1', d => (d.source as SimNode).y!)
                .attr('x2', d => (d.target as SimNode).x!)
                .attr('y2', d => (d.target as SimNode).y!);

            nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);

            // Save positions for persistence
            nodes.forEach(node => {
                if (!node.isUser && node.x !== undefined && node.y !== undefined) {
                    nodePositionsRef.current.set(node.id, { x: node.x, y: node.y });
                }
            });
        });

        return () => {
            simulation.stop();
        };
    }, [filteredConnections, links, dimensions, selectConnection]);

    // Update selection highlight
    useEffect(() => {
        if (!svgRef.current) return;

        d3.select(svgRef.current)
            .selectAll<SVGCircleElement, SimNode>('g.node circle')
            .attr('stroke', d => {
                if (d?.isUser) return 'rgba(255,255,255,0.5)';
                if (selectedConnection?.id === d?.id) return '#fff';
                return 'transparent';
            });
    }, [selectedConnection]);

    return (
        <div ref={containerRef} className={styles.container}>
            <svg
                ref={svgRef}
                width={dimensions.width}
                height={dimensions.height}
                className={styles.svg}
            />
            {filteredConnections.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No connections match your filters</p>
                </div>
            )}
            {selectedConnection && (
                <div className={styles.selectedPanel}>
                    <div className={styles.selectedInfo}>
                        <strong>{selectedConnection.name}</strong>
                        <span>{selectedConnection.title} at {selectedConnection.company}</span>
                    </div>
                    <button
                        className={styles.deleteBtn}
                        onClick={() => deleteConnection(selectedConnection.id)}
                    >
                        🗑️ Delete
                    </button>
                </div>
            )}
        </div>
    );
}
