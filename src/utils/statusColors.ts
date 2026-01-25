/**
 * @file statusColors.ts
 * @description Utility for generating deterministic colors for application statuses.
 * Provides specific colors for default statuses and procedurally generates
 * aesthetic colors for custom statuses based on string hashing.
 */

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface StatusColorStyles {
    background: string; // low opacity
    border: string;     // medium opacity
    text: string;       // high opacity
    base: string;       // raw rgb/rgba for charts
}

/**
 * Predefined colors for default or known statuses.
 * Using the RGB values from the existing dashboard to maintain consistency.
 */
const PREDEFINED_COLORS: Record<string, RGB> = {
    'Applied': { r: 54, g: 162, b: 235 },           // Blue
    'Online Assessment': { r: 6, g: 182, b: 212 },  // Cyan
    'Screening': { r: 75, g: 192, b: 192 },         // Green/Teal
    'Interview': { r: 153, g: 102, b: 255 },        // Purple
    'Offer': { r: 255, g: 206, b: 86 },             // Yellow
    'Rejected': { r: 255, g: 99, b: 132 },          // Red
    'Withdrawn': { r: 201, g: 203, b: 207 },        // Grey
    'Accepted': { r: 34, g: 197, b: 94 },           // Green
};

/**
 * Palette of pleasant colors to pick from for unknown statuses.
 * These are tailored to look good in both light and dark modes when used with the
 * opacity strategies defined below.
 */
const COLOR_PALETTE: RGB[] = [
    { r: 236, g: 72, b: 153 },  // Pink
    { r: 168, g: 85, b: 247 },  // Violet
    { r: 99, g: 102, b: 241 },  // Indigo
    { r: 14, g: 165, b: 233 },  // Sky
    { r: 234, g: 179, b: 8 },   // Yellow
    { r: 249, g: 115, b: 22 },  // Orange
    { r: 239, g: 68, b: 68 },   // Red
    { r: 20, g: 184, b: 166 },  // Teal
    { r: 244, g: 63, b: 94 },   // Rose
];

/**
 * Generates a simple hash from a string.
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

/**
 * Returns the RGB base color for a given status.
 * If status is known, returns predefined color.
 * If unknown, deterministically picks a color from the palette.
 */
export function getStatusBaseColor(status: string): RGB {
    if (PREDEFINED_COLORS[status]) {
        return PREDEFINED_COLORS[status];
    }
    const hash = Math.abs(hashString(status));
    const index = hash % COLOR_PALETTE.length;
    return COLOR_PALETTE[index];
}

/**
 * Returns a complete style object for rendering a status badge or indicator.
 */
export function getStatusColorStyles(status: string): StatusColorStyles {
    const { r, g, b } = getStatusBaseColor(status);

    return {
        // Light background for badges (approx 20% opacity)
        background: `rgba(${r}, ${g}, ${b}, 0.2)`,
        // Border slightly more opaque (approx 30% opacity)
        border: `rgba(${r}, ${g}, ${b}, 0.3)`,
        // Text/Icon color fully opaque or highly visible
        text: `rgb(${r}, ${g}, ${b})`, // Using solid RGB often reads better than RGBA for text
        // Base color for charts that might need their own alpha handling
        base: `rgb(${r}, ${g}, ${b})`
    };
}
