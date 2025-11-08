export { clientService } from './client.service';
export { feeService } from './fee.service';
export { letterService } from './letter.service';
export { cardcomService } from './cardcom.service';
export { auditService } from './audit.service';
export { userService } from './user.service';
export { default as TenantContactService } from './tenant-contact.service';

export type {
  Client,
  CreateClientDto,
  UpdateClientDto,
  ClientsListResponse,
  ClientType,
  CompanyStatus,
  CompanySubtype,
  ClientContact,
  CreateClientContactDto,
  UpdateClientContactDto,
  ClientPhone,
  PhoneType,
  CreateClientPhoneDto,
  UpdateClientPhoneDto,
  PaymentRole,
  ClientGroup
} from './client.service';
export type { User, CreateUserData, UpdateUserData } from './user.service';
export type { 
  FeeCalculation, 
  FeeType, 
  FeeStatus, 
  FeeFrequency,
  CreateFeeCalculationDto, 
  UpdateFeeCalculationDto,
  FeeSummary 
} from './fee.service';
export type { 
  LetterTemplate, 
  LetterHistory, 
  LetterVariables, 
  SendLetterDto,
  LetterTemplateType 
} from './letter.service';
export type { AuditLog, AuditFilter, AuditSummary } from './audit.service';