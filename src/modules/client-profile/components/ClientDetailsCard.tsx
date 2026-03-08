/**
 * ClientDetailsCard - Address, group info, and notes
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, FileText } from 'lucide-react';
import type { Client } from '@/services';

interface ClientDetailsCardProps {
  client: Client;
}

const PAYMENT_ROLE_LABELS: Record<string, string> = {
  independent: 'עצמאי',
  member: 'חבר קבוצה',
  primary_payer: 'משלם ראשי',
};

export function ClientDetailsCard({ client }: ClientDetailsCardProps) {
  const hasAddress = client.address?.street || client.address?.city;
  const hasGroup = !!client.group;
  const hasNotes = !!client.notes;

  if (!hasAddress && !hasGroup && !hasNotes) return null;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          פרטים נוספים
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Address */}
        {hasAddress && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              כתובת
            </div>
            <p className="text-sm">
              {[client.address?.street, client.address?.city, client.address?.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        {/* Group */}
        {hasGroup && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">קבוצה</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{client.group!.group_name_hebrew}</Badge>
              {client.payment_role && (
                <span className="text-xs text-muted-foreground">
                  {PAYMENT_ROLE_LABELS[client.payment_role] || client.payment_role}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {hasNotes && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              הערות
            </div>
            <div className="p-2.5 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
              {client.notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
