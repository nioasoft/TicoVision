import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import { BranchSelector } from './BranchSelector';
import type { Client } from '@/services/client.service';
import type { ForeignWorkerSharedData } from '@/types/foreign-workers.types';

interface SharedDataFormProps {
  value: Partial<ForeignWorkerSharedData>;
  onChange: (data: Partial<ForeignWorkerSharedData>) => void;
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
  selectedBranchId: string | null;
  onBranchChange: (branchId: string | null, clientId: string | null, branchName: string | null, isDefault: boolean) => void;
}

export function SharedDataForm({
  value,
  onChange,
  selectedClientId,
  onClientSelect,
  selectedBranchId,
  onBranchChange,
}: SharedDataFormProps) {
  // Store the base company name (without branch) to append branch when needed
  const [baseCompanyName, setBaseCompanyName] = useState<string | undefined>(value.company_name);

  /**
   * Set today's date as default on mount
   */
  useEffect(() => {
    if (!value.document_date) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      onChange({
        ...value,
        document_date: today
      });
    }
  }, []);

  /**
   * Handle client selection from ClientSelector
   */
  const handleClientChange = (client: Client | null) => {
    if (client) {
      onClientSelect(client.id);
      setBaseCompanyName(client.company_name);
      onChange({
        ...value,
        company_name: client.company_name,
        tax_id: client.tax_id
      });
    } else {
      onClientSelect(null);
      setBaseCompanyName(undefined);
      // Reset branch when client changes
      onBranchChange(null, null, null, true);
      onChange({
        ...value,
        company_name: undefined,
        tax_id: undefined
      });
    }
  };

  /**
   * Handle branch selection from BranchSelector
   */
  const handleBranchChange = (branchId: string | null, clientId: string | null, branchName: string | null, isDefault: boolean) => {
    // Update the company name to include branch name (only for non-default branches)
    if (baseCompanyName && branchName && !isDefault) {
      // Format: "Company Name - Branch Name"
      onChange({
        ...value,
        company_name: `${baseCompanyName} - ${branchName}`
      });
    } else if (baseCompanyName) {
      // Reset to base company name for default branch
      onChange({
        ...value,
        company_name: baseCompanyName
      });
    }

    // Call the parent handler
    onBranchChange(branchId, clientId, branchName, isDefault);
  };

  /**
   * Handle date change
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      document_date: e.target.value
    });
  };

  return (
    <Card className="w-full" dir="rtl">
      <CardHeader>
        <CardTitle className="text-right">נתונים משותפים</CardTitle>
        <CardDescription className="text-right">
          נתונים אלו ישמשו עבור כל המסמכים
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grid 3 columns: Client + Branch + Date */}
        <div className="grid grid-cols-3 gap-4">
          {/* Client Selector - filters by assignment for bookkeepers */}
          <div className="space-y-2">
            <Label htmlFor="client-select" className="text-right block">
              בחר לקוח <span className="text-red-500">*</span>
            </Label>
            <ClientSelector
              value={selectedClientId}
              onChange={handleClientChange}
              label=""
              placeholder="בחר לקוח מהרשימה..."
              filterByAssignment={true}
            />
          </div>

          {/* Branch Selector - shown only when client is selected */}
          <div className="space-y-2">
            <Label htmlFor="branch-select" className="text-right block">
              סניף
            </Label>
            <BranchSelector
              clientId={selectedClientId}
              value={selectedBranchId}
              onChange={handleBranchChange}
              placeholder="בחר סניף..."
              disabled={!selectedClientId}
            />
          </div>

          {/* Document Date */}
          <div className="space-y-2">
            <Label htmlFor="document-date" className="text-right block">
              תאריך המסמך <span className="text-red-500">*</span>
            </Label>
            <Input
              id="document-date"
              type="date"
              value={value.document_date || ''}
              onChange={handleDateChange}
              className="text-right rtl:text-right ltr:text-left"
              dir="rtl"
            />
          </div>
        </div>

        {/* Display selected client details */}
        {selectedClientId && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
            <div className="space-y-1">
              <Label className="text-sm text-gray-600 text-right block">שם החברה</Label>
              <p className="font-medium text-right">{value.company_name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-600 text-right block">ח.פ</Label>
              <p className="font-medium text-right">{value.tax_id}</p>
            </div>
          </div>
        )}

        {/* Validation Message */}
        {(!selectedClientId || !value.document_date) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 text-right">
              יש למלא את כל השדות המסומנים ב-<span className="text-red-500">*</span> לפני מעבר לטאבים
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
