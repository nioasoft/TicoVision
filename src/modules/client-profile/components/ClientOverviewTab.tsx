/**
 * ClientOverviewTab - Summary cards showing key data from all modules
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileText, Mail, Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsraeliDate } from '@/lib/formatters';
import { BalanceStatusBadge } from '@/modules/annual-balance/components/BalanceStatusBadge';
import type { Client, ClientContact } from '@/services';
import type { AnnualBalanceSheet } from '@/modules/annual-balance/types/annual-balance.types';

interface ClientOverviewTabProps {
  client: Client;
  contacts: ClientContact[];
  balanceSheets: AnnualBalanceSheet[];
}

export const ClientOverviewTab: React.FC<ClientOverviewTabProps> = ({
  client,
  contacts,
  balanceSheets,
}) => {
  const currentYearBalance = balanceSheets.find((b) => b.year === new Date().getFullYear() - 1);
  const hasAdvanceAlert = balanceSheets.some((b) => b.advance_rate_alert);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Client Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">פרטי לקוח</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{client.contact_email || 'לא צוין'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{client.contact_phone || 'לא צוין'}</span>
          </div>
          {client.address?.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{[client.address.street, client.address.city].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>איש קשר:</span>
            <span className="text-foreground">{client.contact_name}</span>
          </div>
          {contacts.length > 0 && (
            <div className="text-muted-foreground">
              {contacts.length} אנשי קשר נוספים
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annual Balance Status Card */}
      {(client.client_type === 'company' || client.client_type === 'partnership') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">מאזן שנתי</CardTitle>
          </CardHeader>
          <CardContent>
            {currentYearBalance ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">שנת {currentYearBalance.year}</span>
                  <BalanceStatusBadge status={currentYearBalance.status} />
                </div>
                {currentYearBalance.meeting_date && (
                  <div className="text-sm text-muted-foreground">
                    תאריך שיוך: {formatIsraeliDate(currentYearBalance.meeting_date)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">אין מאזן לשנה הנוכחית</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advance Payment Alert */}
      {hasAdvanceAlert && (
        <Card className={cn('border-red-200 bg-red-50')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">התראת שיעור מקדמה</p>
                <p className="text-xs text-red-700">השיעור המחושב גבוה מהשיעור הנוכחי - נדרש עדכון</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Badges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">סיווגים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {client.pays_fees && <Badge variant="outline">משלם שכ"ט</Badge>}
            {client.receives_letters && <Badge variant="outline">מקבל מכתבים</Badge>}
            {client.is_retainer && <Badge variant="outline">ריטיינר</Badge>}
            {client.internal_external === 'external' && <Badge variant="secondary">הנה"ח חיצוני</Badge>}
            <Badge variant="outline">
              אחריות: {client.collection_responsibility === 'tiko' ? 'תיקו' : 'שני'}
            </Badge>
          </div>
          {client.notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">הערות</span>
              </div>
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
