/**
 * ProtocolList
 * Displays a list of protocols with actions
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  FileEdit,
  ScrollText,
  FileDown,
  Mail,
} from 'lucide-react';
import type { Protocol } from '../types/protocol.types';

interface ProtocolListProps {
  protocols: Protocol[];
  loading: boolean;
  onEdit: (protocolId: string) => void;
  onView: (protocolId: string) => void;
  onDuplicate: (protocolId: string) => void;
  onDelete: (protocolId: string) => void;
  onGeneratePdf?: (protocolId: string) => void;
  onSendEmail?: (protocolId: string) => void;
}

export function ProtocolList({
  protocols,
  loading,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onGeneratePdf,
  onSendEmail,
}: ProtocolListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);

  const handleDeleteClick = (protocol: Protocol) => {
    setProtocolToDelete(protocol);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (protocolToDelete) {
      onDelete(protocolToDelete.id);
    }
    setDeleteDialogOpen(false);
    setProtocolToDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (protocols.length === 0) {
    return (
      <div className="text-center py-12">
        <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">אין פרוטוקולים</h3>
        <p className="text-gray-500">לחץ על &quot;פרוטוקול חדש&quot; כדי ליצור את הפרוטוקול הראשון</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="rtl:text-right">תאריך פגישה</TableHead>
            <TableHead className="rtl:text-right">כותרת</TableHead>
            <TableHead className="rtl:text-right">סטטוס</TableHead>
            <TableHead className="rtl:text-right">תאריך יצירה</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {protocols.map((protocol) => (
            <TableRow key={protocol.id}>
              <TableCell className="rtl:text-right font-medium">
                {format(new Date(protocol.meeting_date), 'dd/MM/yyyy', { locale: he })}
              </TableCell>
              <TableCell className="rtl:text-right">
                {protocol.title || (
                  <span className="text-gray-400">ללא כותרת</span>
                )}
              </TableCell>
              <TableCell className="rtl:text-right">
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  <FileEdit className="h-3 w-3" />
                  טיוטה
                </Badge>
              </TableCell>
              <TableCell className="rtl:text-right text-gray-500">
                {format(new Date(protocol.created_at), 'dd/MM/yyyy', { locale: he })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" dir="rtl">
                    <DropdownMenuItem onClick={() => onEdit(protocol.id)}>
                      <Pencil className="h-4 w-4 ml-2" />
                      עריכה
                    </DropdownMenuItem>
                    {onGeneratePdf && (
                      <DropdownMenuItem onClick={() => onGeneratePdf(protocol.id)}>
                        <FileDown className="h-4 w-4 ml-2" />
                        ייצוא PDF
                      </DropdownMenuItem>
                    )}
                    {onSendEmail && (
                      <DropdownMenuItem onClick={() => onSendEmail(protocol.id)}>
                        <Mail className="h-4 w-4 ml-2" />
                        שלח במייל
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDuplicate(protocol.id)}>
                      <Copy className="h-4 w-4 ml-2" />
                      שכפול
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(protocol)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 ml-2" />
                      מחיקה
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת פרוטוקול</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק את הפרוטוקול מתאריך{' '}
              {protocolToDelete &&
                format(new Date(protocolToDelete.meeting_date), 'dd/MM/yyyy', { locale: he })}
              ? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
