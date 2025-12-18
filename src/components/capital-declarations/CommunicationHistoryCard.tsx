/**
 * Communication History Card Component
 * Displays list of all communications for a declaration
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Phone,
  MessageCircle,
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Loader2,
} from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type {
  CommunicationWithUser,
  DeclarationCommunicationType,
} from '@/types/capital-declaration.types';
import {
  COMMUNICATION_TYPE_LABELS,
} from '@/types/capital-declaration.types';

interface CommunicationHistoryCardProps {
  declarationId: string;
  onAddCommunication?: () => void;
  className?: string;
}

const TYPE_ICONS: Record<DeclarationCommunicationType, React.ReactNode> = {
  letter: <Mail className="h-4 w-4" />,
  phone_call: <Phone className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

const TYPE_COLORS: Record<DeclarationCommunicationType, string> = {
  letter: 'bg-blue-100 text-blue-800',
  phone_call: 'bg-green-100 text-green-800',
  whatsapp: 'bg-emerald-100 text-emerald-800',
  note: 'bg-gray-100 text-gray-800',
};

export function CommunicationHistoryCard({
  declarationId,
  onAddCommunication,
  className,
}: CommunicationHistoryCardProps) {
  const [communications, setCommunications] = useState<CommunicationWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunications();
  }, [declarationId]);

  const loadCommunications = async () => {
    setLoading(true);
    const { data } = await capitalDeclarationService.getCommunications(declarationId);
    if (data) {
      setCommunications(data);
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: he,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg rtl:text-right">היסטוריית תקשורת</CardTitle>
        {onAddCommunication && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCommunication}
            className="gap-2 rtl:flex-row-reverse"
          >
            <Plus className="h-4 w-4" />
            הוסף
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground rtl:text-right">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>אין תקשורת מתועדת</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="border rounded-lg p-3 space-y-2 rtl:text-right"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'gap-1 rtl:flex-row-reverse',
                          TYPE_COLORS[comm.communication_type]
                        )}
                      >
                        {TYPE_ICONS[comm.communication_type]}
                        {COMMUNICATION_TYPE_LABELS[comm.communication_type]}
                      </Badge>
                      {comm.direction === 'inbound' ? (
                        <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comm.communicated_at)}
                    </span>
                  </div>

                  {comm.subject && (
                    <p className="font-medium text-sm">{comm.subject}</p>
                  )}

                  {comm.content && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comm.content}
                    </p>
                  )}

                  {comm.outcome && (
                    <p className="text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                      תוצאה: {comm.outcome}
                    </p>
                  )}

                  {comm.created_by_name && (
                    <p className="text-xs text-muted-foreground">
                      נרשם ע"י: {comm.created_by_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
