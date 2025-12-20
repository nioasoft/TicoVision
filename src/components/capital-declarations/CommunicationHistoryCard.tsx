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
        <CardTitle className="text-sm font-medium rtl:text-right">היסטוריית תקשורת</CardTitle>
        {onAddCommunication && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCommunication}
            className="gap-1.5 h-7 text-xs"
          >
            <Plus className="h-3 w-3" />
            הוסף
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground rtl:text-right">
            <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
            <p className="text-sm">אין תקשורת מתועדת</p>
          </div>
        ) : (
          <ScrollArea className="h-[220px]" dir="rtl">
            <div className="space-y-1">
              {communications.map((comm, index) => (
                <div
                  key={comm.id}
                  className={cn(
                    "py-2 px-1 text-right",
                    index !== communications.length - 1 && "border-b"
                  )}
                >
                  {/* Row 1: Type + Date + Author */}
                  <div className="flex items-center gap-2 mb-0.5 flex-row-reverse justify-end">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'gap-1 text-[10px] px-1.5 py-0 h-5 flex-row-reverse',
                        TYPE_COLORS[comm.communication_type]
                      )}
                    >
                      {TYPE_ICONS[comm.communication_type]}
                      {COMMUNICATION_TYPE_LABELS[comm.communication_type]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(comm.communicated_at)}
                    </span>
                    {comm.created_by_name && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {comm.created_by_name}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Row 2: Subject + Content combined */}
                  {(comm.subject || comm.content) && (
                    <p className="text-xs text-muted-foreground line-clamp-1 text-right">
                      {comm.subject && <span className="font-medium text-foreground">{comm.subject}</span>}
                      {comm.subject && comm.content && ' - '}
                      {comm.content}
                    </p>
                  )}

                  {/* Outcome - compact */}
                  {comm.outcome && (
                    <p className="text-[10px] text-green-700 mt-0.5 text-right">
                      ✓ {comm.outcome}
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
