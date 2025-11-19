/**
 * Test script to verify payment section selection logic
 * Tests audit, bookkeeping, and retainer template types
 */

import { TemplateService } from '../src/modules/letters/services/template.service';
import type { LetterVariables } from '../src/modules/letters/types/letter.types';

const templateService = new TemplateService();

async function testPaymentSections() {
  console.log('🧪 Testing Payment Section Selection...\n');

  // Test data
  const testVariables: Partial<LetterVariables> = {
    company_name: 'חברת הבדיקה בע"מ',
    group_name: 'קבוצת בדיקה',
    amount_original: 120000,
    inflation_rate: 4,
    tax_year: 2026,
  };

  const testClientId = '550e8400-e29b-41d4-a716-446655440000'; // Fake UUID for testing

  // Test 1: Audit template (external_index_only)
  console.log('📊 Test 1: Audit Template (external_index_only)');
  console.log('Expected: payment-section-audit.html');
  console.log('Expected: service_description = "שירותי ראיית החשבון"');
  console.log('Expected: Annual amount only\n');

  try {
    const auditLetter = await templateService.previewLetterFromFiles(
      'external_index_only',
      testVariables
    );

    // Check if correct payment section is used
    if (auditLetter.includes('payment-section-audit')) {
      console.log('✅ Correct payment section file loaded');
    } else {
      console.log('❌ Wrong payment section file');
    }

    // Check service description
    if (auditLetter.includes('שירותי ראיית החשבון')) {
      console.log('✅ Service description correct');
    } else {
      console.log('❌ Service description missing or wrong');
    }

    // Check monthly amount NOT present (audit shows annual only)
    if (!auditLetter.includes('לחודש')) {
      console.log('✅ Monthly amount NOT shown (correct for audit)');
    } else {
      console.log('❌ Monthly amount shown (wrong for audit)');
    }

    console.log('\n---\n');
  } catch (error) {
    console.error('❌ Audit test failed:', error);
  }

  // Test 2: Bookkeeping template (internal_bookkeeping_index)
  console.log('📊 Test 2: Bookkeeping Template (internal_bookkeeping_index)');
  console.log('Expected: payment-section-bookkeeping.html');
  console.log('Expected: service_description = "שירותי הנהלת החשבונות"');
  console.log('Expected: Monthly amount + annual note\n');

  try {
    const bookkeepingLetter = await templateService.previewLetterFromFiles(
      'internal_bookkeeping_index',
      testVariables
    );

    // Check if correct payment section is used
    if (bookkeepingLetter.includes('payment-section-bookkeeping')) {
      console.log('✅ Correct payment section file loaded');
    } else {
      console.log('❌ Wrong payment section file');
    }

    // Check service description
    if (bookkeepingLetter.includes('שירותי הנהלת החשבונות')) {
      console.log('✅ Service description correct');
    } else {
      console.log('❌ Service description missing or wrong');
    }

    // Check monthly amount present
    if (bookkeepingLetter.includes('לחודש')) {
      console.log('✅ Monthly amount shown');
    } else {
      console.log('❌ Monthly amount NOT shown');
    }

    // Check annual note present
    if (bookkeepingLetter.includes('סה״כ שנתי')) {
      console.log('✅ Annual total note shown');
    } else {
      console.log('❌ Annual total note NOT shown');
    }

    // Verify monthly calculation (120000 / 12 = 10000)
    if (bookkeepingLetter.includes('₪10,000')) {
      console.log('✅ Monthly amount calculated correctly (120000/12 = 10000)');
    } else {
      console.log('❌ Monthly amount calculation wrong');
    }

    console.log('\n---\n');
  } catch (error) {
    console.error('❌ Bookkeeping test failed:', error);
  }

  // Test 3: Retainer template (retainer_index)
  console.log('📊 Test 3: Retainer Template (retainer_index)');
  console.log('Expected: payment-section-retainer.html');
  console.log('Expected: service_description = "שירותי ראיית החשבון, הנהלת החשבונות וחשבות השכר"');
  console.log('Expected: Monthly amount + annual note\n');

  try {
    const retainerLetter = await templateService.previewLetterFromFiles(
      'retainer_index',
      testVariables
    );

    // Check if correct payment section is used
    if (retainerLetter.includes('payment-section-retainer')) {
      console.log('✅ Correct payment section file loaded');
    } else {
      console.log('❌ Wrong payment section file');
    }

    // Check service description
    if (retainerLetter.includes('שירותי ראיית החשבון, הנהלת החשבונות וחשבות השכר')) {
      console.log('✅ Service description correct');
    } else {
      console.log('❌ Service description missing or wrong');
    }

    // Check monthly amount present
    if (retainerLetter.includes('לחודש')) {
      console.log('✅ Monthly amount shown');
    } else {
      console.log('❌ Monthly amount NOT shown');
    }

    // Check annual note present
    if (retainerLetter.includes('סה״כ שנתי')) {
      console.log('✅ Annual total note shown');
    } else {
      console.log('❌ Annual total note NOT shown');
    }

    console.log('\n---\n');
  } catch (error) {
    console.error('❌ Retainer test failed:', error);
  }

  console.log('✅ All tests completed!');
}

// Run tests
testPaymentSections().catch(console.error);
