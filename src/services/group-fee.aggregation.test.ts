
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupFeeService } from './group-fee.service';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
}));

describe('Group Fee Aggregation Logic', () => {
  const mockTenantId = 'tenant-123';
  const mockGroupId = 'group-abc';
  const mockYear = 2025;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getTenantId to return a static ID
    vi.spyOn(groupFeeService as any, 'getTenantId').mockResolvedValue(mockTenantId);
  });

  it('should calculate weighted discount correctly from individual clients with mixed discounts', async () => {
    // 1. Mock finding clients
    const mockClients = [{ id: 'client-1' }, { id: 'client-2' }];
    const selectClients = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockClients, error: null })
      })
    });

    // 2. Mock finding fees
    const mockFees = [
      {
        // Client 1: 1000 base, 10% discount
        base_amount: 1000,
        discount_percentage: 10,
        discount_amount: 100, // Explicit amount
        final_amount: 900,
        vat_amount: 162,
        total_amount: 1062,
        previous_year_discount: 10
      },
      {
        // Client 2: 2000 base, 5% discount
        base_amount: 2000,
        discount_percentage: 5,
        discount_amount: 0, // Amount missing, should calculate from %
        final_amount: 1900,
        vat_amount: 342,
        total_amount: 2242,
        previous_year_discount: 5
      }
    ];

    const selectFees = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockFees, error: null })
        })
      })
    });

    // Setup mock chain
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clients') return { select: selectClients };
      if (table === 'fee_calculations') return { select: selectFees };
      return { select: vi.fn() };
    });

    // Execute
    const result = await groupFeeService.getAggregatedGroupData(mockGroupId, mockYear);

    // Assertions
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();

    // Expected Totals:
    // Base: 1000 + 2000 = 3000
    // Discount 1: 100
    // Discount 2: 2000 * 5% = 100 (Calculated by logic)
    // Total Discount: 200
    // Total With Vat: 1062 + 2242 = 3304

    expect(result.data?.base_amount).toBe(3000);
    expect(result.data?.total_with_vat).toBe(3304);
    expect(result.data?.discount_amount).toBe(200);
  });

  it('should fallback to previous_year_discount if discount_percentage is missing', async () => {
    // 1. Mock finding clients
    const mockClients = [{ id: 'client-1' }];
    const selectClients = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockClients, error: null })
      })
    });

    // 2. Mock finding fees
    const mockFees = [
      {
        // Client 1: 1000 base, no current discount data, but has prev year discount
        base_amount: 1000,
        discount_percentage: 0,
        discount_amount: 0,
        final_amount: 1000,
        vat_amount: 180,
        total_amount: 1180,
        previous_year_discount: 20 // The fallback
      }
    ];

    const selectFees = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: mockFees, error: null })
        })
      })
    });

    // Setup mock chain
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'clients') return { select: selectClients };
      if (table === 'fee_calculations') return { select: selectFees };
      return { select: vi.fn() };
    });

    // Execute
    const result = await groupFeeService.getAggregatedGroupData(mockGroupId, mockYear);

    // Assertions
    expect(result.data?.base_amount).toBe(1000);
    // Calculated discount: 1000 * 20% = 200
    expect(result.data?.discount_amount).toBe(200);
  });
});
