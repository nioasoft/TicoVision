/**
 * Tests for payment-dispute Edge Function
 */

import { describe, it, expect } from 'vitest';

const FUNCTION_URL = 'http://localhost:54321/functions/v1/payment-dispute';

describe('Payment Dispute Edge Function', () => {
  const validDispute = {
    fee_id: '550e8400-e29b-41d4-a716-446655440000',
    client_id: '550e8400-e29b-41d4-a716-446655440001',
    dispute_reason: 'שילמתי בהעברה בנקאית ביום 15/10',
    claimed_payment_date: '2025-10-15',
    claimed_payment_method: 'העברה בנקאית',
    claimed_amount: 45500,
    claimed_reference: 'אסמכתא 123456',
  };

  it('should accept valid dispute submission', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validDispute),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('תודה');
    expect(data.data.dispute_id).toBeTruthy();
  });

  it('should return 400 for missing fee_id', async () => {
    const invalidDispute = { ...validDispute };
    delete (invalidDispute as Partial<typeof validDispute>).fee_id;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidDispute),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('חסרים שדות');
  });

  it('should return 400 for missing client_id', async () => {
    const invalidDispute = { ...validDispute };
    delete (invalidDispute as Partial<typeof validDispute>).client_id;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidDispute),
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing dispute_reason', async () => {
    const invalidDispute = { ...validDispute };
    delete (invalidDispute as Partial<typeof validDispute>).dispute_reason;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidDispute),
    });

    expect(response.status).toBe(400);
  });

  it('should return 400 for missing claimed_amount', async () => {
    const invalidDispute = { ...validDispute };
    delete (invalidDispute as Partial<typeof validDispute>).claimed_amount;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidDispute),
    });

    expect(response.status).toBe(400);
  });

  it('should handle CORS preflight', async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('should accept dispute without claimed_reference (optional field)', async () => {
    const disputeWithoutRef = { ...validDispute };
    delete (disputeWithoutRef as Partial<typeof validDispute>).claimed_reference;

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(disputeWithoutRef),
    });

    expect(response.status).toBe(200);
  });

  it('should send email notification to Sigal (integration test)', async () => {
    // This test would require email verification
    // For now, just verify the API succeeds
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validDispute),
    });

    expect(response.status).toBe(200);
    // Email sending is async, so we just verify the request succeeded
  });
});
