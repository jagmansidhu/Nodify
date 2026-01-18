// ============================================================
// Application-wide constants
// ============================================================

// --------------------------------------
// API & Fetching
// --------------------------------------
export const EMAIL_FETCH_LIMIT = 25;
export const EMAIL_BATCH_SIZE = 25;
export const DEFAULT_EMAIL_LIMIT = 50;
export const GEMINI_MAX_OUTPUT_TOKENS = 2048;

// --------------------------------------
// Caching
// --------------------------------------
export const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

// --------------------------------------
// Time Calculations
// --------------------------------------
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// Heat Map Thresholds (days)
export const HEAT_HOT_THRESHOLD_DAYS = 14;
export const HEAT_WARM_THRESHOLD_DAYS = 90;
export const DAYS_IN_WEEK = 7;
export const DAYS_IN_MONTH = 30;
export const DAYS_IN_YEAR = 365;

// --------------------------------------
// Heat Scores
// --------------------------------------
export const HEAT_SCORE_MAX = 100;
export const HEAT_SCORE_CRITICAL = 90;
export const HEAT_SCORE_URGENT = 70;
export const HEAT_SCORE_NORMAL = 40;
export const HEAT_SCORE_LOW = 20;
export const AGE_FACTOR_CAP_DAYS = 10;

// Priority Factors for Heat Score
export const PRIORITY_FACTOR_HIGH = 10;
export const PRIORITY_FACTOR_MEDIUM = 5;
export const PRIORITY_FACTOR_LOW = 0;

// Action Factors
export const ACTION_FACTOR_RESPONSE = 5;
export const ACTION_FACTOR_DEADLINE = 5;

// Urgency Scores
export const URGENCY_SCORE_HIGH_STARRED = 10;
export const URGENCY_SCORE_HIGH = 8;

// --------------------------------------
// Graph Visualization
// --------------------------------------
export const GRAPH_CENTER_NODE_RADIUS = 40;
export const GRAPH_CATEGORY_NODE_BASE_RADIUS = 22;
export const GRAPH_CATEGORY_NODE_MAX_BONUS = 14;
export const GRAPH_CATEGORY_LABEL_OFFSET = 32;
export const GRAPH_EMAIL_NODE_RADIUS = 24;
export const GRAPH_EMAIL_NODE_HOVER_RADIUS = 30;
export const GRAPH_ORBIT_RADIUS_FACTOR = 0.32;
export const GRAPH_ZOOM_ORBIT_RADIUS_FACTOR = 0.35;
export const GRAPH_ANIMATION_SPEED = 0.0004;
export const GRAPH_HOVER_TRANSITION_MS = 150;
export const GRAPH_MAX_CATEGORIES = 6;
export const GRAPH_GLOW_BLUR = 8;
export const GRAPH_CATEGORY_GLOW_BLUR = 5;
export const GRAPH_SUBJECT_TRUNCATE_LENGTH = 12;
export const GRAPH_LABEL_TRUNCATE_LENGTH = 8;
export const GRAPH_ZOOMED_CENTER_RADIUS = 50;
export const GRAPH_ZOOMED_LABEL_OFFSET = 42;

// --------------------------------------
// Colors
// --------------------------------------
export const COLORS = {
    priority: {
        high: '#ff6b6b',
        medium: '#ffc078',
        low: '#74c0fc',
        default: '#86868b',
    },
    categories: [
        '#bf5af2', '#ff6b6b', '#ffc078', '#74c0fc',
        '#63e6be', '#ffd43b', '#ff922b', '#da77f2',
    ],
    orbit: 'rgba(191, 90, 242, 0.12)',
    centerNode: '#bf5af2',
    stroke: {
        default: 'rgba(255,255,255,0.2)',
        hover: 'white',
        center: 'rgba(255,255,255,0.3)',
        zoomed: 'rgba(255,255,255,0.4)',
    },
    heat: {
        hot: 'rgba(255, 77, 77, 0.6)',
        warm: 'rgba(255, 184, 77, 0.5)',
        cold: 'rgba(77, 159, 255, 0.4)',
        critical: 'rgba(255, 51, 51, 0.7)',
        urgent: 'rgba(255, 140, 0, 0.6)',
        normal: 'rgba(255, 215, 0, 0.5)',
        low: 'rgba(50, 205, 50, 0.4)',
    },
};

// --------------------------------------
// Text Truncation
// --------------------------------------
export const SUMMARY_TRUNCATE_LENGTH = 100;
export const SUBJECT_PREVIEW_LENGTH = 50;
