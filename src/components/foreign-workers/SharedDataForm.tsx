import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import type { Client } from '@/services/client.service';
import type { ForeignWorkerSharedData } from '@/types/foreign-workers.types';

interface SharedDataFormProps {
  value: Partial<ForeignWorkerSharedData>;
  onChange: (data: Partial<ForeignWorkerSharedData>) => void;
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
}

export function SharedDataForm({
  value,
  onChange,
  selectedClientId,
  onClientSelect
}: SharedDataFormProps) {
  /**
   * Handle client selection from ClientSelector
   */
  const handleClientChange = (client: Client | null) => {
    if (client) {
      onClientSelect(client.id);
      onChange({
        ...value,
        company_name: client.company_name,
        tax_id: client.tax_id
      });
    } else {
      onClientSelect(null);
      onChange({
        ...value,
        company_name: undefined,
        tax_id: undefined
      });
    }
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
        {/* Grid 2 columns: Client + Date */}
        <div className="grid grid-cols-2 gap-4">
          {/* Client Selector */}
          <div className="space-y-2">
            <Label htmlFor="client-select" className="text-right block">
              בחר לקוח <span className="text-red-500">*</span>
            </Label>
            <ClientSelector
              value={selectedClientId}
              onChange={handleClientChange}
              label=""
              placeholder="בחר לקוח מהרשימה..."
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
