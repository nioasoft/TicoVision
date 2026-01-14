/**
 * Broadcast Module - Distribution Lists Management
 *
 * This module manages distribution lists for mass mailing to groups of clients.
 * Route: /broadcast (רשימות תפוצה)
 *
 * ============================================================================
 * TODO: INTEGRATION WITH LETTER MODULES
 * ============================================================================
 *
 * Distribution lists need to be integrated into the letter sending modules:
 *
 * 1. מכתבים אוטומטיים (Auto Letters): src/modules/auto-letters/
 * 2. מכתבים מילוליים (Universal Letters): src/modules/letters/
 *
 * HOW TO INTEGRATE:
 * -----------------
 *
 * ```typescript
 * // 1. Import from this module
 * import { useBroadcastStore, distributionListService } from '@/modules/broadcast';
 *
 * // 2. In your component, get lists
 * const { lists, fetchLists } = useBroadcastStore();
 * useEffect(() => { fetchLists(); }, [fetchLists]);
 *
 * // 3. Add UI for choosing between single client or distribution list:
 * //    - Radio: "לקוח בודד" (current behavior) / "רשימת תפוצה" (new)
 * //    - If "רשימת תפוצה" selected, show dropdown with lists
 *
 * // 4. When sending to a distribution list:
 * const { data: listWithMembers } = await distributionListService.getListWithMembers(listId);
 *
 * for (const member of listWithMembers.members) {
 *   // member.client_id - fetch full client data
 *   // member.company_name, member.company_name_hebrew, member.tax_id - available
 *   // member.contact_count, member.email_count - stats
 *
 *   // For each client:
 *   // 1. Fetch client data (for template variables like {{company_name}})
 *   // 2. Generate letter with that client's data
 *   // 3. Send to all contacts of that client (with email_preference != 'none')
 * }
 * ```
 *
 * IMPORTANT BUSINESS RULES:
 * -------------------------
 *
 * 1. "כל הלקוחות במערכת" (All Clients list):
 *    - Contains ONLY clients with receives_letters=true AND status='active'
 *    - This respects the client's preference to not receive general mailings
 *
 * 2. Custom distribution lists:
 *    - Can contain ANY active client, regardless of receives_letters setting
 *    - If admin manually adds a client to a custom list, they WILL receive mailings
 *    - This allows targeted mailings even to clients who opted out of general ones
 *
 * 3. EMAIL DEDUPLICATION RULES:
 *    - Personal letters (with {{company_name}}, {{tax_id}} etc.):
 *      → NO deduplication - each client gets their own personalized letter
 *      → If Moshe is a contact for 10 clients, he receives 10 different letters
 *
 *    - General announcements (same content for everyone):
 *      → WITH deduplication by email address
 *      → If Moshe appears in 10 clients, he receives only 1 email
 *
 *    Implementation: When sending, check if template has variables.
 *    If no variables → dedupe emails. If has variables → send to all.
 *
 * AVAILABLE EXPORTS:
 * ------------------
 * - useBroadcastStore: Zustand store with lists, allActiveClients, actions
 * - distributionListService: CRUD operations for lists
 * - broadcastService: (Future) For actual broadcast sending
 * - Types: DistributionList, EligibleClient, etc.
 *
 * ============================================================================
 */

// Pages
export { BroadcastPage } from './pages/BroadcastPage';

// Services
export { broadcastService } from './services/broadcast.service';
export { distributionListService } from './services/distribution-list.service';

// Store
export { useBroadcastStore } from './store/broadcastStore';

// Types
export * from './types/broadcast.types';
