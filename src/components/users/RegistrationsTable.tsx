import React from 'react';
import { CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import type { PendingRegistration } from '@/services/registration.service';

interface RegistrationsTableProps {
  registrations: PendingRegistration[];
  mode: 'pending' | 'rejected';
  loading: boolean;
  onApprove?: (registration: PendingRegistration) => void;
  onReject?: (registration: PendingRegistration) => void;
  onViewDetails: (registration: PendingRegistration) => void;
  onDelete?: (registration: PendingRegistration) => void;
}

interface RegistrationRowProps {
  registration: PendingRegistration;
  mode: 'pending' | 'rejected';
  onApprove?: (registration: PendingRegistration) => void;
  onReject?: (registration: PendingRegistration) => void;
  onViewDetails: (registration: PendingRegistration) => void;
  onDelete?: (registration: PendingRegistration) => void;
}

// Memoized row component to prevent unnecessary re-renders
const RegistrationRow = React.memo<RegistrationRowProps>(
  ({ registration, mode, onApprove, onReject, onViewDetails, onDelete }) => {
    const getRoleLabel = (role: string) => {
      const labels: Record<string, string> = {
        admin: 'מנהל מערכת',
        accountant: 'רואה חשבון',
        bookkeeper: 'מנהלת חשבונות',
        client: 'לקוח',
      };
      return labels[role] || role;
    };

    return (
      <TableRow key={registration.id}>
        <TableCell className="font-medium min-w-[200px] rtl:text-right ltr:text-left">
          {registration.email}
        </TableCell>
        <TableCell className="w-40 rtl:text-right ltr:text-left">{registration.full_name}</TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">{registration.phone || '-'}</TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">
          <Badge variant="outline">{getRoleLabel(registration.requested_role)}</Badge>
        </TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">{formatDate(registration.created_at)}</TableCell>
        {mode === 'rejected' && (
          <TableCell className="w-48 rtl:text-right ltr:text-left">
            <div className="text-sm text-red-600 truncate" title={registration.rejection_reason}>
              {registration.rejection_reason || 'לא צוינה סיבה'}
            </div>
          </TableCell>
        )}
        <TableCell className="w-48 rtl:text-right ltr:text-left">
          <div className="flex gap-2 rtl:flex-row-reverse ltr:flex-row">
            {mode === 'pending' ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onApprove?.(registration)}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-3 w-3" />
                  <span className="rtl:mr-1 ltr:ml-1">אשר</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReject?.(registration)}
                  className="flex items-center gap-1"
                >
                  <XCircle className="h-3 w-3" />
                  <span className="rtl:mr-1 ltr:ml-1">דחה</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(registration)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span className="rtl:mr-1 ltr:ml-1">פרטים</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(registration)}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span className="rtl:mr-1 ltr:ml-1">פרטים</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete?.(registration)}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="rtl:mr-1 ltr:ml-1">מחק</span>
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }
);

RegistrationRow.displayName = 'RegistrationRow';

export const RegistrationsTable = React.memo<RegistrationsTableProps>(({
  registrations,
  mode,
  loading,
  onApprove,
  onReject,
  onViewDetails,
  onDelete,
}) => {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px] rtl:text-right ltr:text-left">אימייל</TableHead>
            <TableHead className="w-40 rtl:text-right ltr:text-left">שם מלא</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">טלפון</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">תפקיד מבוקש</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">תאריך בקשה</TableHead>
            {mode === 'rejected' && (
              <TableHead className="w-48 rtl:text-right ltr:text-left">סיבת דחייה</TableHead>
            )}
            <TableHead className="w-48 rtl:text-right ltr:text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={mode === 'rejected' ? 7 : 6} className="text-center rtl:text-right ltr:text-left">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : registrations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={mode === 'rejected' ? 7 : 6} className="text-center rtl:text-right ltr:text-left">
                {mode === 'pending' ? 'אין בקשות הרשמה ממתינות' : 'אין בקשות הרשמה שנדחו'}
              </TableCell>
            </TableRow>
          ) : (
            registrations.map((registration) => (
              <RegistrationRow
                key={registration.id}
                registration={registration}
                mode={mode}
                onApprove={onApprove}
                onReject={onReject}
                onViewDetails={onViewDetails}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});

RegistrationsTable.displayName = 'RegistrationsTable';
