import type { AnalyzedEmail } from '@/lib/gemini/service';

export type EmailHeatStatus = 'critical' | 'urgent' | 'normal' | 'low';

interface EmailHeatConfig {
    // Days thresholds for email age
    criticalDays: number;  // Starred for this long = critical
    urgentDays: number;    // Starred for this long = urgent
}

const DEFAULT_CONFIG: EmailHeatConfig = {
    criticalDays: 7,   // 7+ days old = critical
    urgentDays: 3,     // 3-7 days = urgent
};

/**
 * Calculate heat status based on email age and deadline proximity
 */
export function getEmailHeatStatus(
    email: AnalyzedEmail,
    config: EmailHeatConfig = DEFAULT_CONFIG
): EmailHeatStatus {
    const now = new Date();
    const emailDate = new Date(email.date);
    const daysSinceEmail = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 60 * 60 * 24));

    // Check for upcoming deadline in analysis
    if (email.analysis.deadline) {
        const deadlineHeat = getDeadlineHeat(email.analysis.deadline);
        if (deadlineHeat) return deadlineHeat;
    }

    // Use AI-assigned priority as a factor
    if (email.analysis.priority === 'HIGH') {
        if (daysSinceEmail >= config.urgentDays) return 'critical';
        return 'urgent';
    }

    // Age-based heat
    if (daysSinceEmail >= config.criticalDays) return 'critical';
    if (daysSinceEmail >= config.urgentDays) return 'urgent';
    if (daysSinceEmail >= 1) return 'normal';

    return 'low';
}

/**
 * Parse deadline string and determine heat level
 */
function getDeadlineHeat(deadlineStr: string): EmailHeatStatus | null {
    const now = new Date();

    // Try to extract date from common formats
    const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/,           // MM/DD/YYYY
        /(\d{4}-\d{2}-\d{2})/,                    // YYYY-MM-DD
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
        /(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)/i,
    ];

    const lowerDeadline = deadlineStr.toLowerCase();

    // Immediate/today deadlines
    if (lowerDeadline.includes('today') || lowerDeadline.includes('asap') || lowerDeadline.includes('immediately')) {
        return 'critical';
    }

    // Tomorrow
    if (lowerDeadline.includes('tomorrow')) {
        return 'critical';
    }

    // This week/end of week
    if (lowerDeadline.includes('this week') || lowerDeadline.includes('end of week') || lowerDeadline.includes('eow')) {
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
        if (daysUntilFriday <= 2) return 'critical';
        return 'urgent';
    }

    // Next week
    if (lowerDeadline.includes('next week')) {
        return 'normal';
    }

    // Try to parse actual date
    for (const pattern of datePatterns) {
        const match = deadlineStr.match(pattern);
        if (match) {
            try {
                const parsed = new Date(match[1]);
                if (!isNaN(parsed.getTime())) {
                    const daysUntil = Math.floor((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysUntil <= 0) return 'critical';
                    if (daysUntil <= 2) return 'critical';
                    if (daysUntil <= 7) return 'urgent';
                    return 'normal';
                }
            } catch {
                // Continue to next pattern
            }
        }
    }

    return null;
}

/**
 * Get color for email heat status
 */
export function getEmailHeatColor(status: EmailHeatStatus): string {
    switch (status) {
        case 'critical': return '#ff3333';  // Bright red
        case 'urgent': return '#ff8c00';    // Orange
        case 'normal': return '#ffd700';    // Gold/Yellow
        case 'low': return '#32cd32';       // Green
    }
}

/**
 * Get glow color for email heat
 */
export function getEmailHeatGlow(status: EmailHeatStatus): string {
    switch (status) {
        case 'critical': return 'rgba(255, 51, 51, 0.7)';
        case 'urgent': return 'rgba(255, 140, 0, 0.6)';
        case 'normal': return 'rgba(255, 215, 0, 0.5)';
        case 'low': return 'rgba(50, 205, 50, 0.4)';
    }
}

/**
 * Get human-readable heat label
 */
export function getEmailHeatLabel(status: EmailHeatStatus): string {
    switch (status) {
        case 'critical': return '🔴 Critical - Needs immediate attention';
        case 'urgent': return '🟠 Urgent - Respond soon';
        case 'normal': return '🟡 Normal - Handle this week';
        case 'low': return '🟢 Low - Can wait';
    }
}

/**
 * Calculate a heat score (0-100) for sorting/visualization
 */
export function getEmailHeatScore(email: AnalyzedEmail): number {
    const heatStatus = getEmailHeatStatus(email);
    const baseScore = {
        critical: 90,
        urgent: 70,
        normal: 40,
        low: 20,
    }[heatStatus];

    // Add age factor
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - new Date(email.date).getTime()) / (1000 * 60 * 60 * 24));
    const ageFactor = Math.min(daysSince, 10); // Cap at 10 days

    // Add priority factor
    const priorityFactor = {
        HIGH: 10,
        MEDIUM: 5,
        LOW: 0,
    }[email.analysis.priority];

    // Add action factor
    const actionFactor = email.analysis.action === 'RESPONSE_NEEDED' ? 5 :
        email.analysis.action === 'DEADLINE' ? 8 : 0;

    return Math.min(100, baseScore + ageFactor + priorityFactor + actionFactor);
}

/**
 * Format relative time for email
 */
export function formatEmailAge(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
}
