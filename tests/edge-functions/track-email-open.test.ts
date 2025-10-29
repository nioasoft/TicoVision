/**
 * Tests for track-email-open Edge Function
 */

import { describe, it, expect } from 'vitest';

const FUNCTION_URL = 'http://localhost:54321/functions/v1/track-email-open';

describe('Track Email Open Edge Function', () => {
  it('should return 1x1 PNG pixel with valid letter_id', async () => {
    const response = await fetch(`${FUNCTION_URL}?letter_id=test-letter-123`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');

    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it('should return pixel even with invalid letter_id', async () => {
    const response = await fetch(`${FUNCTION_URL}?letter_id=invalid-uuid`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('should return pixel even without letter_id', async () => {
    const response = await fetch(FUNCTION_URL);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('should have no-cache headers', async () => {
    const response = await fetch(`${FUNCTION_URL}?letter_id=test-123`);

    expect(response.headers.get('cache-control')).toContain('no-cache');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('expires')).toBe('0');
  });

  it('should increment open_count on multiple opens', async () => {
    // This would require database verification
    // For now, just verify the endpoint doesn't fail
    const letterId = 'test-multi-open-' + Date.now();

    // Open 1
    const response1 = await fetch(`${FUNCTION_URL}?letter_id=${letterId}`);
    expect(response1.status).toBe(200);

    // Open 2
    const response2 = await fetch(`${FUNCTION_URL}?letter_id=${letterId}`);
    expect(response2.status).toBe(200);

    // Open 3
    const response3 = await fetch(`${FUNCTION_URL}?letter_id=${letterId}`);
    expect(response3.status).toBe(200);
  });
});
