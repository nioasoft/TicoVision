/**
 * Types for the Group Profile page
 */

import type { ClientGroup, Client } from '@/services';
import type { AssignedGroupContact } from '@/types/tenant-contact.types';
import type { LetterSummary } from '@/modules/client-profile/types/client-profile.types';
import type { Database } from '@/types/database.types';

export type GroupFeeCalculationRow = Database['public']['Tables']['group_fee_calculations']['Row'];

export interface GroupProfileData {
  group: ClientGroup | null;
  members: Client[];
  contacts: AssignedGroupContact[];
  feeCalculations: GroupFeeCalculationRow[];
  letters: LetterSummary[];
  loading: boolean;
  error: string | null;
}
