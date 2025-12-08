/**
 * Letter History Table Component
 * Displays a table of sent letters and drafts with actions
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye,
  Mail,
  Printer,
  Trash2,
  MoreVertical,
  CheckCircle2,
  Clock,
  Send,
  Edit,
  FileDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LetterHistoryItem } from '@/services/letter-history.service';
import { formatIsraeliDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface LetterHistoryTableProps {
  letters: LetterHistoryItem[];
  onViewLetter: (letterId: string) => void;
  onResendLetter: (letterId: string, recipients: string[]) => void;
  onEditLetter?: (letterId: string) => void;
  onDeleteDraft?: (letterId: string) => void;
  onPrintLetter?: (letterId: string) => void;
  onGeneratePDF?: (letterId: string) => void;
  isDraftsMode?: boolean;
  // Multi-select support (for bulk delete in drafts mode)
  isSelectMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function LetterHistoryTable({
  letters,
  onViewLetter,
  onResendLetter,
  onEditLetter,
  onDeleteDraft,
  onPrintLetter,
  onGeneratePDF,
  isDraftsMode = false,
  isSelectMode = false,
  selectedIds = [],
  onToggleSelect,
}: LetterHistoryTableProps) {
  /**
   * Get status badge
   */
  const getStatusBadge = (status: string, openCount: number) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3" />
            טיוטה
          </Badge>
        );
      case 'saved':
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            שמור
          </Badge>
        );
      case 'sent_email':
        return (
          <Badge variant="default" className="gap-1 bg-blue-100 text-blue-800">
            <Mail className="h-3 w-3" />
            נשלח במייל
          </Badge>
        );
      case 'sent_whatsapp':
        return (
          <Badge variant="default" className="gap-1 bg-purple-100 text-purple-800">
            <Send className="h-3 w-3" />
            נשלח בוואטסאפ
          </Badge>
        );
      case 'sent_print':
        return (
          <Badge variant="default" className="gap-1 bg-orange-100 text-orange-800">
            <Printer className="h-3 w-3" />
            הודפס
          </Badge>
        );
      // Legacy statuses (for backward compatibility)
      case 'sent':
        return (
          <Badge variant="default" className="gap-1 bg-blue-100 text-blue-800">
            <Send className="h-3 w-3" />
            נשלח
          </Badge>
        );
      case 'opened':
        return (
          <Badge variant="default" className="gap-1 bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3" />
            נפתח {openCount > 1 && `(${openCount})`}
          </Badge>
        );
      default:
        return null;
    }
  };

  /**
   * Get template type label
   */
  const getTemplateTypeLabel = (templateType: string | null): string => {
    if (!templateType) return 'מכתב מותאם';

    const typeLabels: Record<string, string> = {
      'external': 'חיצוניים',
      'internal_audit': 'ביקורת פנימית',
      'internal_bookkeeping': 'הנהלת חשבונות',
      'bookkeeping': 'הנהלת חשבונות',
      'retainer': 'רטיינר',
      'custom': 'מכתב מותאם',
    };

    // Find matching key
    const matchingKey = Object.keys(typeLabels).find(key => templateType.includes(key));
    return matchingKey ? typeLabels[matchingKey] : 'מכתב';
  };

  if (letters.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {isDraftsMode ? 'אין טיוטות' : 'אין מכתבים להצגה'}
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Checkbox column for multi-select (drafts only) */}
            {isSelectMode && (
              <TableHead className="w-12">
                <span className="sr-only">בחירה</span>
              </TableHead>
            )}
            <TableHead className="rtl:text-right ltr:text-left w-[160px]">פעולות</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">סטטוס</TableHead>
            {!isDraftsMode && (
              <TableHead className="rtl:text-right ltr:text-left">נמענים</TableHead>
            )}
            <TableHead className="rtl:text-right ltr:text-left">נושא</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">סוג מכתב</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">לקוח</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">תאריך</TableHead>
            <TableHead className="rtl:text-right ltr:text-left w-[80px]">גרסה</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {letters.map((letter) => (
            <TableRow key={letter.id}>
              {/* Checkbox for multi-select */}
              {isSelectMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(letter.id)}
                    onCheckedChange={() => onToggleSelect?.(letter.id)}
                    aria-label={`בחר מכתב ${letter.subject || 'ללא נושא'}`}
                  />
                </TableCell>
              )}
              {/* Actions */}
              <TableCell className="rtl:text-right ltr:text-left">
                <div className="flex items-center gap-2">
                  {/* View Button - Always Visible */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewLetter(letter.id)}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    צפייה
                  </Button>

                  {/* More Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rtl:text-right ltr:text-left">
                      {/* Edit button - for custom letters (custom_text and custom types) */}
                      {onEditLetter && (letter.template_type === 'custom_text' || letter.template_type === 'custom') && (
                        <DropdownMenuItem onClick={() => onEditLetter(letter.id)}>
                          <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          ערוך
                        </DropdownMenuItem>
                      )}

                      {letter.status !== 'draft' && (
                        <>
                          <DropdownMenuItem
                            onClick={() =>
                              onResendLetter(
                                letter.id,
                                Array.isArray(letter.recipient_emails)
                                  ? letter.recipient_emails
                                  : []
                              )
                            }
                          >
                            <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            שלח מחדש
                          </DropdownMenuItem>

                          {onPrintLetter && (
                            <DropdownMenuItem onClick={() => onPrintLetter(letter.id)}>
                              <Printer className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              הדפסה
                            </DropdownMenuItem>
                          )}

                          {onGeneratePDF && (
                            <DropdownMenuItem onClick={() => onGeneratePDF(letter.id)}>
                              <FileDown className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              צור PDF
                            </DropdownMenuItem>
                          )}
                        </>
                      )}

                      {letter.status === 'draft' && onDeleteDraft && (
                        <DropdownMenuItem
                          onClick={() => onDeleteDraft(letter.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          מחק
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell className="rtl:text-right ltr:text-left">
                {getStatusBadge(letter.status, letter.open_count || 0)}
              </TableCell>

              {/* Recipients (only for sent letters) */}
              {!isDraftsMode && (
                <TableCell className="rtl:text-right ltr:text-left">
                  {letter.recipient_emails && Array.isArray(letter.recipient_emails) && letter.recipient_emails.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {letter.recipient_emails.slice(0, 2).map((email, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                      {letter.recipient_emails.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{letter.recipient_emails.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm italic">אין נמענים רשומים</span>
                  )}
                </TableCell>
              )}

              {/* Subject */}
              <TableCell className="rtl:text-right ltr:text-left max-w-xs">
                {letter.subject ? (
                  <span className="truncate block">{letter.subject}</span>
                ) : (
                  <span className="text-muted-foreground italic">אין נושא רשום</span>
                )}
              </TableCell>

              {/* Template Type */}
              <TableCell className="rtl:text-right ltr:text-left">
                {getTemplateTypeLabel(letter.template_type)}
              </TableCell>

              {/* Client */}
              <TableCell className="rtl:text-right ltr:text-left font-medium">
                {letter.client_company || letter.client_name || 'לא צוין'}
              </TableCell>

              {/* Date */}
              <TableCell className="rtl:text-right ltr:text-left">
                <div className="text-sm">
                  {letter.sent_at
                    ? formatIsraeliDate(new Date(letter.sent_at))
                    : formatIsraeliDate(new Date(letter.created_at))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {letter.sent_at
                    ? new Date(letter.sent_at).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date(letter.created_at).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                </div>
              </TableCell>

              {/* Version */}
              <TableCell className="rtl:text-right ltr:text-left">
                <div className="flex items-center gap-1">
                  {letter.version_number && letter.version_number > 1 ? (
                    <Badge variant="outline" className="text-xs">
                      v{letter.version_number}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">v1</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
