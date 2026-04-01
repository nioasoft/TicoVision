/**
 * GroupDetailsCard - Address, notes, and metadata
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, FileText } from 'lucide-react';
import type { ClientGroup } from '@/services';

interface GroupDetailsCardProps {
  group: ClientGroup;
}

export function GroupDetailsCard({ group }: GroupDetailsCardProps) {
  const address = group.address as { street?: string; city?: string; postal_code?: string } | null;
  const hasAddress = address?.street || address?.city;
  const hasNotes = !!group.notes;

  if (!hasAddress && !hasNotes) return null;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          פרטי קבוצה
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
              {[address?.street, address?.city, address?.postal_code]
                .filter(Boolean)
                .join(', ')}
            </p>
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
              {group.notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
