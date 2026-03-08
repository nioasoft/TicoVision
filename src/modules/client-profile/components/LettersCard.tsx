/**
 * LettersCard - Recent generated letters for this client
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Eye } from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import type { LetterSummary } from '../types/client-profile.types';

interface LettersCardProps {
  letters: LetterSummary[];
}

const LETTER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'טיוטה', className: 'bg-gray-100 text-gray-700' },
  saved: { label: 'נשמר', className: 'bg-gray-100 text-gray-700' },
  sent_email: { label: 'נשלח באימייל', className: 'bg-green-100 text-green-700' },
  sent_whatsapp: { label: 'נשלח בוואטסאפ', className: 'bg-green-100 text-green-700' },
  sent_print: { label: 'הודפס', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'בוטל', className: 'bg-red-100 text-red-500' },
};

export function LettersCard({ letters }: LettersCardProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          מכתבים אחרונים
          {letters.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({letters.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {letters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין מכתבים</p>
        ) : (
          <div className="space-y-2">
            {letters.map((letter) => {
              const statusConfig = LETTER_STATUS_CONFIG[letter.status || ''] || {
                label: letter.status || 'לא ידוע',
                className: '',
              };
              return (
                <div
                  key={letter.id}
                  className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {letter.name || letter.subject || 'מכתב'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsraeliDate(letter.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {letter.open_count != null && letter.open_count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span>{letter.open_count}</span>
                      </div>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
