/**
 * ClientBalanceTab - Tab content showing all years with status timeline for a client
 * Shows table of all balance years with quick actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, ExternalLink } from 'lucide-react';
import { formatIsraeliDate, formatIsraeliDateTime, formatILSInteger } from '@/lib/formatters';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { annualBalanceService } from '../services/annual-balance.service';
import { hasBalancePermission } from '../types/annual-balance.types';
import type { AnnualBalanceSheet, AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface ClientBalanceTabProps {
  clientId: string;
  clientName: string;
  clientTaxId: string;
  userRole: string;
  onMarkMaterials?: (balanceCase: AnnualBalanceSheetWithClient) => void;
}

export function ClientBalanceTab({
  clientId,
  clientName,
  clientTaxId,
  userRole,
  onMarkMaterials,
}: ClientBalanceTabProps) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnnualBalanceSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await annualBalanceService.getByClientId(clientId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setRecords(result.data ?? []);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleMarkMaterials = useCallback((record: AnnualBalanceSheet) => {
    if (!onMarkMaterials) return;

    // Wrap AnnualBalanceSheet as AnnualBalanceSheetWithClient for the dialog
    const caseWithClient: AnnualBalanceSheetWithClient = {
      ...record,
      client: {
        id: clientId,
        company_name: clientName,
        company_name_hebrew: null,
        tax_id: clientTaxId,
        client_type: 'company',
      },
    };
    onMarkMaterials(caseWithClient);
  }, [onMarkMaterials, clientId, clientName, clientTaxId]);

  const handleNavigateToBalance = () => {
    navigate(`/annual-balance?client_id=${clientId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground mr-2">טוען נתוני מאזנים...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">אין נתוני מאזנים עבור לקוח זה</p>
        <Button
          variant="link"
          size="sm"
          className="mt-2"
          onClick={handleNavigateToBalance}
        >
          <ExternalLink className="h-3 w-3 ml-1" />
          עבור למודול מאזנים
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {records.length} שנות מאזן
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNavigateToBalance}
          className="h-7 text-xs"
        >
          <ExternalLink className="h-3 w-3 ml-1" />
          פתח במודול מאזנים
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">שנה</TableHead>
              <TableHead className="w-28">סטטוס</TableHead>
              <TableHead className="w-28">הגעת חומר</TableHead>
              <TableHead className="w-28">תאריך שיוך</TableHead>
              <TableHead className="w-28">שידור דוח</TableHead>
              <TableHead className="w-24">מקדמות</TableHead>
              <TableHead className="w-20">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.year}</TableCell>
                <TableCell>
                  <BalanceStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {record.materials_received_at
                    ? formatIsraeliDate(record.materials_received_at)
                    : '-'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {record.meeting_date
                    ? formatIsraeliDateTime(record.meeting_date)
                    : '-'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {record.report_transmitted_at
                    ? formatIsraeliDate(record.report_transmitted_at)
                    : '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {record.new_advances_amount !== null && record.new_advances_amount !== undefined
                    ? formatILSInteger(record.new_advances_amount)
                    : '-'}
                </TableCell>
                <TableCell>
                  {record.status === 'waiting_for_materials' &&
                    hasBalancePermission(userRole, 'mark_materials') &&
                    onMarkMaterials && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2"
                        onClick={() => handleMarkMaterials(record)}
                      >
                        סמן הגיע חומר
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
