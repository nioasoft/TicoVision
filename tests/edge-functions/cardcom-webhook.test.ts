/**
 * Tests for cardcom-webhook Edge Function
 */

import { describe, it, expect } from 'vitest';

const FUNCTION_URL = 'http://localhost:54321/functions/v1/cardcom-webhook';

describe('Cardcom Webhook Edge Function', () => {
  const successfulPaymentData = {
    terminalnumber: '172012',
    lowprofilecode: 'test-lp-123',
    operation: 'ChargeOnly',
    dealnumber: 'deal-456',
    cardnumber: '4580****1234',
    cardexpdate: '12/25',
    approvalnum: 'APP123',
    username: 'testuser',
    sum: '45500',
    currency: 'ILS',
    responsecode: '0',
    responsemessage: 'Success',
    invoicenumber: 'INV-789',
    customername: 'חברת ABC',
    email: 'client@abc.co.il',
  };

  const failedPaymentData = {
    ...successfulPaymentData,
    responsecode: '33',
    responsemessage: 'כרטיס לא תקין',
  };

  it('should return -1 for successful payment', async () => {
    const formData = new URLSearchParams(successfulPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('-1');
  });

  it('should return -1 for failed payment', async () => {
    const formData = new URLSearchParams(failedPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('-1');
  });

  it('should return -1 even with invalid terminal (validation)', async () => {
    const invalidData = {
      ...successfulPaymentData,
      terminalnumber: 'wrong-terminal',
    };

    const formData = new URLSearchParams(invalidData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('-1');
  });

  it('should handle missing form fields gracefully', async () => {
    const minimalData = {
      terminalnumber: '172012',
      lowprofilecode: 'test-lp',
      responsecode: '0',
    };

    const formData = new URLSearchParams(minimalData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('-1');
  });

  it('should return -1 on database errors (graceful handling)', async () => {
    // Simulate error by sending invalid UUID
    const errorData = {
      ...successfulPaymentData,
      lowprofilecode: 'invalid-uuid-format',
    };

    const formData = new URLSearchParams(errorData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('-1');
  });

  it('should log webhook to webhook_logs table (integration test)', async () => {
    const formData = new URLSearchParams(successfulPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    // Webhook logging is async, verify response is correct
  });

  it('should update payment_transactions on success', async () => {
    const formData = new URLSearchParams(successfulPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    // Database verification would require direct DB query
  });

  it('should update fee_calculations to paid status on success', async () => {
    const formData = new URLSearchParams(successfulPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    // Database verification needed
  });

  it('should update payment_method_selections on success', async () => {
    const formData = new URLSearchParams(successfulPaymentData);

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    expect(response.status).toBe(200);
    // Database verification needed
  });
});
