/**
 * Shaagat HaAri Grants Module — Entry Point
 */

// Service
export { shaagatService } from './services/shaagat.service';
export type {
  FeasibilityCheck,
  FeasibilityCheckWithClient,
  EligibilityCheck,
  EligibilityCheckWithClient,
  DetailedCalculation,
  TaxSubmission,
  DashboardViewRow,
  DashboardStats,
  EligibilityFilters,
  CreateEligibilityCheckInput,
  CreateDetailedCalculationInput,
  UpdateCalculationStepInput,
  CreateTaxSubmissionInput,
  EligibilityPaymentStatus,
  FeasibilityPaymentStatus,
  SubmissionStatus,
  TaxLetterType,
  TaxLetterStatus,
  EmailLogType,
} from './services/shaagat.service';

// Store
export { useShaagatStore } from './store/shaagatStore';

// Types
export type {
  TrackType,
  BusinessType,
  ReportingType,
  EligibilityStatus,
  TrackConfig,
  StandardTrackConfig,
  SmallBusinessTrackConfig,
  CashBasisTrackConfig,
  NewBusinessTrackConfig,
  NorthernTrackConfig,
  ContractorTrackConfig,
  EligibilityInput,
  EligibilityResult,
  FixedExpensesInput,
  FixedExpensesResult,
  SalaryInput,
  SalaryResult,
  GrantBreakdown,
  GrantCalculationInput,
  TrackComparisonEntry,
  TrackComparisonResult,
  SmallBusinessLookupEntry,
  GrantApplicationStatus,
  GrantApplicationRow,
  GrantSalaryDataRow,
  GrantFixedExpensesRow,
} from './types/shaagat.types';

// Constants
export { GRANT_CONSTANTS, SMALL_BUSINESS_LOOKUP } from './lib/grant-constants';
export { ISRAELI_BANKS } from './lib/israeli-banks';

// Calculations
export {
  calculateEligibility,
  calculateFixedExpensesGrant,
  calculateSalaryGrant,
  calculateGrantCap,
  lookupSmallBusinessGrant,
  maybeCompareWithSmallBusiness,
  calculateGrant,
} from './lib/grant-calculations';

// Email service
export { shaagatEmailService } from './services/shaagat-email.service';
export type {
  NotEligibleEmailVariables,
  EligibleEmailVariables,
  DetailedCalculationEmailVariables,
  SubmissionConfirmationEmailVariables,
  AccountingFormRequestEmailVariables,
  SalaryDataRequestEmailVariables,
} from './lib/grant-email-templates';
export {
  getNotEligibleEmail,
  getEligibleEmail,
  getGrayAreaEmail,
  getDetailedCalculationEmail,
  getSubmissionConfirmationEmail,
  getAccountingFormRequestEmail,
  getSalaryDataRequestEmail,
  EMAIL_TEMPLATE_MAP,
} from './lib/grant-email-templates';

// Public service (token-based, no auth)
export { shaagatPublicService } from './services/shaagat-public.service';

// Pages (named exports for lazy() with .then(m => ({ default: m.X })))
export { ShaagatDashboardPage } from './pages/ShaagatDashboardPage';
export { EligibilityCheckPage } from './pages/EligibilityCheckPage';
export { ProcessHubPage } from './pages/ProcessHubPage';
export { TaxSubmissionsPage } from './pages/TaxSubmissionsPage';
export { DetailedCalculationPage } from './pages/DetailedCalculationPage';
export { ClientTimelinePage } from './pages/ClientTimelinePage';
// Public (token-based) pages — no auth required
export { default as FeasibilityFormPage } from './pages/FeasibilityFormPage';
export { default as SalaryDataFormPage } from './pages/SalaryDataFormPage';
export { default as GrantApprovalFormPage } from './pages/GrantApprovalFormPage';
