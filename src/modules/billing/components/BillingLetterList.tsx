/**
 * Billing Letter List
 * Table component for displaying billing letters
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Eye,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { billingLetterService } from '../services/billing-letter.service';
import { MarkAsSentDialog } from './MarkAsSentDialog';
import type { BillingLetterWithClient, BillingLetterStatus } from '../types/billing.types';
import { BILLING_STATUS_LABELS, SENT_METHOD_LABELS } from '../types/billing.types';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';

export function BillingLetterList() {
  const navigate = useNavigate();

  const [billingLetters, setBillingLetters] = useState<BillingLetterWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markAsSentDialog, setMarkAsSentDialog] = useState<{
    open: boolean;
    billingLetterId: string;
    clientName: string;
  }>({ open: false, billingLetterId: '', clientName: '' });

  useEffect(() => {
    loadBillingLetters();
  }, []);

  const loadBillingLetters = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await billingLetterService.getAll();
      if (fetchError) throw fetchError;
      setBillingLetters(data || []);
    } catch (err) {
      console.error('Error loading billing letters:', err);
      setError('שגיאה בטעינת מכתבי החיוב');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await billingLetterService.markAsPaid(id);
      if (error) throw error;

      toast.success('מכתב החיוב סומן כשולם');
      loadBillingLetters();
    } catch (err) {
      console.error('Error marking as paid:', err);
      toast.error('שגיאה בסימון כשולם');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await billingLetterService.cancel(id);
      if (error) throw error;

      toast.success('מכתב החיוב בוטל');
      loadBillingLetters();
    } catch (err) {
      console.error('Error cancelling:', err);
      toast.error('שגיאה בביטול');
    }
  };

  const getStatusBadge = (status: BillingLetterStatus) => {
    const colors: Record<BillingLetterStatus, string> = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <Badge variant="outline" className={colors[status]}>
        {BILLING_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const getSentMethodIndicator = (letter: BillingLetterWithClient) => {
    if (!letter.sent_at) return null;

    if (letter.sent_manually) {
      return (
        <span className="text-gray-500 text-sm flex items-center gap-1 rtl:flex-row-reverse" title={`נשלח ידנית - ${SENT_METHOD_LABELS[letter.sent_method || 'manual_other']}`}>
          <FileText className="h-3 w-3" />
          <span>ידני</span>
        </span>
      );
    }

    return (
      <span className="text-blue-500 text-sm flex items-center gap-1 rtl:flex-row-reverse" title="נשלח במייל">
        <Mail className="h-3 w-3" />
        <span>מייל</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="outline" onClick={loadBillingLetters}>
          <RefreshCw className="h-4 w-4 ml-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between rtl:flex-row-reverse">
        <div>
          <CardTitle className="rtl:text-right">מכתבי חיוב</CardTitle>
          <CardDescription className="rtl:text-right">
            רשימת מכתבי חיוב כלליים (לא שכר טרחה)
          </CardDescription>
        </div>
        <div className="flex gap-2 rtl:flex-row-reverse">
          <Button variant="outline" size="sm" onClick={loadBillingLetters}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => navigate('/collections/billing/new')}>
            <Plus className="h-4 w-4 ml-2" />
            מכתב חיוב חדש
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {billingLetters.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>אין מכתבי חיוב</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate('/collections/billing/new')}
            >
              <Plus className="h-4 w-4 ml-2" />
              צור מכתב חיוב ראשון
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">שליחה</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingLetters.map((letter) => {
                const clientName = letter.client.company_name_hebrew || letter.client.company_name;

                return (
                  <TableRow
                    key={letter.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/collections/billing/${letter.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div style={{ textAlign: 'right', direction: 'rtl' }}>{clientName}</div>
                    </TableCell>
                    <TableCell className="text-right max-w-[200px] truncate">
                      {letter.service_description}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatILS(letter.total_amount)}
                      {letter.bank_discount_percentage > 0 && (
                        <span className="text-green-600 text-sm block">
                          -{letter.bank_discount_percentage}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {getStatusBadge(letter.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getSentMethodIndicator(letter)}
                    </TableCell>
                    <TableCell className="text-right text-gray-500">
                      {formatIsraeliDate(new Date(letter.created_at))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/collections/billing/${letter.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 ml-2" />
                            צפייה
                          </DropdownMenuItem>

                          {letter.status === 'draft' && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Send email
                                  toast.info('שליחה במייל תהיה זמינה בקרוב');
                                }}
                              >
                                <Mail className="h-4 w-4 ml-2" />
                                שלח במייל
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMarkAsSentDialog({
                                    open: true,
                                    billingLetterId: letter.id,
                                    clientName,
                                  });
                                }}
                              >
                                <FileText className="h-4 w-4 ml-2" />
                                סמן כנשלח
                              </DropdownMenuItem>
                            </>
                          )}

                          {letter.status === 'sent' && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaid(letter.id);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 ml-2" />
                                סמן כשולם
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(letter.id);
                                }}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 ml-2" />
                                בטל
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Mark As Sent Dialog */}
      <MarkAsSentDialog
        open={markAsSentDialog.open}
        onOpenChange={(open) =>
          setMarkAsSentDialog((prev) => ({ ...prev, open }))
        }
        billingLetterId={markAsSentDialog.billingLetterId}
        clientName={markAsSentDialog.clientName}
        onSuccess={loadBillingLetters}
      />
    </Card>
  );
}

BillingLetterList.displayName = 'BillingLetterList';
