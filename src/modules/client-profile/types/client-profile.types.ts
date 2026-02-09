/**
 * Types for the Unified Client Profile page
 */

import type { Client, ClientContact, ClientPhone } from '@/services';
import type { AnnualBalanceSheet } from '@/modules/annual-balance/types/annual-balance.types';

export interface ClientProfileData {
  client: Client | null;
  contacts: ClientContact[];
  phones: ClientPhone[];
  balanceSheets: AnnualBalanceSheet[];
  loading: boolean;
  error: string | null;
}
