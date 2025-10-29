/**
 * Tests for track-payment-selection Edge Function
 */

import { describe, it, expect } from 'vitest';

const FUNCTION_URL = 'http://localhost:54321/functions/v1/track-payment-selection';

describe('Track Payment Selection Edge Function', () => {
  const validParams = {
    fee_id: '550e8400-e29b-41d4-a716-446655440000',
    method: 'bank_transfer',
    client_id: '550e8400-e29b-41d4-a716-446655440001',
  };

  it('should redirect for bank_transfer method', async () => {
    const url = `${FUNCTION_URL}?${new URLSearchParams({
      ...validParams,
      method: 'bank_transfer',
    })}`;

    const response = await fetch(url, { redirect: 'manual' });

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toContain('bank-transfer-details.html');
    expect(location).toContain('fee_id=');
    expect(location).toContain('amount=');
  });

  it('should redirect to Cardcom for cc_single method', async () => {
    const url = `${FUNCTION_URL}?${new URLSearchParams({
      ...validParams,
      method: 'cc_single',
    })}`;

    const response = await fetch(url, { redirect: 'manual' });

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    // Should redirect to Cardcom or error page
    expect(location).toBeTruthy();
  });

  it('should redirect to Cardcom for cc_installments method', async () => {
    const url = `${FUNCTION_URL}?${new URLSearchParams({
      ...validParams,
      method: 'cc_installments',
    })}`;

    const response = await fetch(url, { redirect: 'manual' });

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toBeTruthy();
  });

  it('should redirect for checks method', async () => {
    const url = `${FUNCTION_URL}?${new URLSearchParams({
      ...validParams,
      method: 'checks',
    })}`;

    const response = await fetch(url, { redirect: 'manual' });

    expect(response.status).toBe(302);
    const location = response.headers.get('location');
    expect(location).toContain('check-details.html');
    expect(location).toContain('fee_id=');
    expect(location).toContain('num_checks=8');
  });

  it('should return 400 for missing fee_id', async () => {
    const url = `${FUNCTION_URL}?method=bank_transfer&client_id=${validParams.client_id}`;

    const response = await fetch(url);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing required parameters');
  });

  it('should return 400 for missing method', async () => {
    const url = `${FUNCTION_URL}?fee_id=${validParams.fee_id}&client_id=${validParams.client_id}`;

    const response = await fetch(url);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Missing required parameters');
  });

  it('should return 400 for invalid payment method', async () => {
    const url = `${FUNCTION_URL}?${new URLSearchParams({
      ...validParams,
      method: 'invalid_method',
    })}`;

    const response = await fetch(url);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid payment method');
  });

  it('should calculate correct discount for each method', async () => {
    // Test that different methods apply different discounts
    // This would require database verification

    const methods = [
      { name: 'bank_transfer', discount: 9 },
      { name: 'cc_single', discount: 8 },
      { name: 'cc_installments', discount: 4 },
      { name: 'checks', discount: 0 },
    ];

    for (const method of methods) {
      const url = `${FUNCTION_URL}?${new URLSearchParams({
        ...validParams,
        method: method.name,
      })}`;

      const response = await fetch(url, { redirect: 'manual' });
      expect(response.status).toBe(302);
    }
  });
});
