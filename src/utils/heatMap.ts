import { HeatStatus } from '@/types';

/**
 * Calculate the heat status based on the last contact date
 * Hot: within 2 weeks
 * Warm: 2 weeks to 3 months
 * Cold: 3+ months
 */
export function getHeatStatus(lastContactDate: Date): HeatStatus {
    const now = new Date();
    const diffTime = now.getTime() - lastContactDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays <= 14) return 'hot';
    if (diffDays <= 90) return 'warm';
    return 'cold';
}

/**
 * Get the color for a heat status
 */
export function getHeatColor(status: HeatStatus): string {
    switch (status) {
        case 'hot':
            return '#ff4d4d'; // Vibrant red-orange
        case 'warm':
            return '#ffb84d'; // Amber/yellow
        case 'cold':
            return '#4d9fff'; // Cool blue
    }
}

/**
 * Get the glow color for a heat status (for node effects)
 */
export function getHeatGlowColor(status: HeatStatus): string {
    switch (status) {
        case 'hot':
            return 'rgba(255, 77, 77, 0.6)';
        case 'warm':
            return 'rgba(255, 184, 77, 0.5)';
        case 'cold':
            return 'rgba(77, 159, 255, 0.4)';
    }
}

/**
 * Get a human-readable label for heat status
 */
export function getHeatLabel(status: HeatStatus): string {
    switch (status) {
        case 'hot':
            return '🔥 Hot (< 2 weeks)';
        case 'warm':
            return '🟡 Warm (2 weeks - 3 months)';
        case 'cold':
            return '🔵 Cold (3+ months)';
    }
}

/**
 * Format a date to a relative time string
 */
export function formatLastContact(date: Date): string {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}
