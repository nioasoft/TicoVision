/**
 * Israeli Banks — Constant list for bank selection dropdown
 * Source: Bank of Israel official list
 */

export interface IsraeliBank {
  code: string;
  name: string;
}

export const ISRAELI_BANKS: IsraeliBank[] = [
  { code: '10', name: 'בנק לאומי' },
  { code: '11', name: 'בנק דיסקונט' },
  { code: '12', name: 'בנק הפועלים' },
  { code: '13', name: 'בנק איגוד' },
  { code: '14', name: 'בנק אוצר החייל' },
  { code: '17', name: 'בנק מרכנתיל דיסקונט' },
  { code: '20', name: 'בנק מזרחי-טפחות' },
  { code: '31', name: 'בנק הבינלאומי' },
  { code: '46', name: 'בנק מסד' },
  { code: '52', name: 'בנק פאגי' },
  { code: '54', name: 'בנק ירושלים' },
];
