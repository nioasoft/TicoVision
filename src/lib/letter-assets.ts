/**
 * Letter Assets - Base64 encoded images for letter templates
 *
 * These assets are used in both email and PDF generation.
 * They are embedded as data URIs to ensure they work across all platforms.
 */

/**
 * Diamond bullet SVG path - used for all colored bullets
 * Based on public/brand/bullet-star.svg
 */
const DIAMOND_PATH = 'M9 4.5C6.92578 4.5 4.5 6.92102 4.5 9C4.5 6.92603 2.07924 4.5 0 4.5C2.07422 4.5 4.5 2.07898 4.5 0C4.5 2.07397 6.92076 4.5 9 4.5Z';

/**
 * Creates an SVG data URI for a diamond bullet with the specified color
 */
export const createBulletSvg = (color: string): string => {
  const svg = `<svg width="11" height="11" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${DIAMOND_PATH}" fill="${color}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Blue bullet diamond (11x11 SVG)
 * Color: #395BF7 (blue)
 */
export const BULLET_BLUE_BASE64 = createBulletSvg('#395BF7');

/**
 * Dark red bullet diamond (11x11 SVG)
 * Color: #8B0000 (dark red)
 */
export const BULLET_DARKRED_BASE64 = createBulletSvg('#8B0000');

/**
 * Black bullet diamond (11x11 SVG)
 * Color: #000000 (black)
 */
export const BULLET_BLACK_BASE64 = createBulletSvg('#000000');

// Keep the old PNG for backwards compatibility (used in existing templates)
export const BULLET_BLUE_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAMAAABhEH5lAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAFRQTFRFAAAAOlr6OFz3Olv3Olr1OGD3OVv3OVv4QGD/OVv3OVv2Olz5Olr3OVv4PFz3OVz2NVr0OVv1OFz3OFj3OVr2QFD/OFr1OVz2Olv5QGDvOVv2Olz3tc/6fgAAABx0Uk5TADBAn4Ag3+8Q/49/f49A7zCggCCQEICQnxDvgFp76j0AAACFSURBVHicZdBRC4IwFAXge7wowTDDHiL6//9NKiEkLazdxVxOd70vGx/s7GygzSBuIJoYX0U5gHdKXBCGhIwP4ueKTIgO5mmXz8lj9vG0Fx5jJ2vFgQ7oOVLBD/EHj/K/ngxuc3z9mpbyuioxWZBY9dRR1aTtz7iXrXr2xTb6JzLnNC3zA46lIxMaysxbAAAAAElFTkSuQmCC';
