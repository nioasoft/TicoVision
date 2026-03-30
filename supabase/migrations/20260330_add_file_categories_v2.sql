-- Add 3 new file categories: tax withholding exemption, tax account status, shaagat haari grant
ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'tax_withholding_exemption';
ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'tax_account_status';
ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'shaagat_haari_grant';
