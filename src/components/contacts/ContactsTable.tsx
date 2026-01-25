/**
 * Contacts Table Component
 * Displays list of contacts with search, filters, and actions
 */

import React from 'react';
import { Edit, Trash2, MoreHorizontal, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type { ContactSearchResult } from '@/types/tenant-contact.types';

// Contact type labels
const CONTACT_TYPE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  accountant_manager: 'מנהל/ת חשבונות',
  secretary: 'מזכיר/ה',
  cfo: 'סמנכ"ל כספים',
  board_member: 'חבר דירקטוריון',
  legal_counsel: 'יועץ משפטי',
  other: 'אחר',
};

interface ContactFilters {
  contactType: string;
}

interface ContactsTableProps {
  contacts: ContactSearchResult[];
  loading: boolean;
  searchQuery: string;
  filters: ContactFilters;
  currentPage: number;
  totalPages: number;
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: Partial<ContactFilters>) => void;
  onResetFilters: () => void;
  onEdit: (contact: ContactSearchResult) => void;
  onDelete: (contact: ContactSearchResult) => void;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

interface ContactRowProps {
  contact: ContactSearchResult;
  onEdit: (contact: ContactSearchResult) => void;
  onDelete: (contact: ContactSearchResult) => void;
}

// Memoized row component
const ContactRow = React.memo<ContactRowProps>(({ contact, onEdit, onDelete }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDeleteClick = () => {
    if (contact.client_count > 0) {
      // Show warning that contact is linked to clients
      setIsDeleteDialogOpen(true);
    } else {
      // Proceed with delete confirmation
      setIsDeleteDialogOpen(true);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium text-right">
          {contact.full_name}
        </TableCell>
        <TableCell className="text-right">
          {contact.job_title || '-'}
        </TableCell>
        <TableCell className="text-right">
          <Badge variant="secondary">
            {CONTACT_TYPE_LABELS[contact.contact_type] || contact.contact_type}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {contact.email || '-'}
        </TableCell>
        <TableCell className="text-right">
          {contact.phone || '-'}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{contact.client_count}</span>
          </div>
        </TableCell>
        <TableCell className="text-left">
          <div className="flex gap-2 rtl:flex-row-reverse ltr:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(contact)}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              <span className="rtl:mr-1 ltr:ml-1">ערוך</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={handleDeleteClick}
                  className="text-destructive focus:text-destructive"
                  disabled={contact.client_count > 0}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              {contact.client_count > 0 ? 'לא ניתן למחוק' : 'האם אתה בטוח?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {contact.client_count > 0 ? (
                <>
                  איש הקשר "{contact.full_name}" מקושר ל-{contact.client_count} לקוחות.
                  <br />
                  יש לנתק אותו מכל הלקוחות לפני המחיקה.
                </>
              ) : (
                <>
                  פעולה זו תמחק את איש הקשר "{contact.full_name}" לצמיתות.
                  <br />
                  לא ניתן לבטל פעולה זו.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2 gap-2">
            <AlertDialogCancel>
              {contact.client_count > 0 ? 'הבנתי' : 'ביטול'}
            </AlertDialogCancel>
            {contact.client_count === 0 && (
              <AlertDialogAction
                onClick={() => onDelete(contact)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

ContactRow.displayName = 'ContactRow';

export const ContactsTable = React.memo<ContactsTableProps>(({
  contacts,
  loading,
  searchQuery,
  filters,
  currentPage,
  totalPages,
  onSearchChange,
  onFilterChange,
  onResetFilters,
  onEdit,
  onDelete,
  onPageChange,
  onNextPage,
  onPreviousPage,
}) => {
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-3 items-center flex-row-reverse">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input

            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
            dir="rtl"
          />
        </div>
        <Select
          value={filters.contactType}
          onValueChange={(value) => onFilterChange({ contactType: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="owner">בעלים</SelectItem>
            <SelectItem value="accountant_manager">מנהל/ת חשבונות</SelectItem>
            <SelectItem value="secretary">מזכיר/ה</SelectItem>
            <SelectItem value="cfo">סמנכ"ל כספים</SelectItem>
            <SelectItem value="board_member">חבר דירקטוריון</SelectItem>
            <SelectItem value="legal_counsel">יועץ משפטי</SelectItem>
            <SelectItem value="other">אחר</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="flex items-center gap-1"
        >
          <Filter className="h-4 w-4" />
          איפוס
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg" dir="rtl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 text-right">שם מלא</TableHead>
              <TableHead className="w-40 text-right">תפקיד</TableHead>
              <TableHead className="w-36 text-right">סוג</TableHead>
              <TableHead className="w-48 text-right">אימייל</TableHead>
              <TableHead className="w-32 text-right">טלפון</TableHead>
              <TableHead className="w-24 text-right">לקוחות</TableHead>
              <TableHead className="w-32 text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  טוען נתונים...
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  לא נמצאו אנשי קשר
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={onPreviousPage}
            disabled={currentPage === 1}
          >
            הקודם
          </Button>
          <span className="flex items-center px-4">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >
            הבא
          </Button>
        </div>
      )}
    </div>
  );
});

ContactsTable.displayName = 'ContactsTable';
