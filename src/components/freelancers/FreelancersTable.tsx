import { MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Client } from '@/services';

interface FreelancersTableProps {
  freelancers: Client[];
  selectedFreelancers: string[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (freelancer: Client) => void;
  onDelete: (freelancer: Client) => void;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  isAdmin: boolean;
}

export function FreelancersTable({
  freelancers,
  selectedFreelancers,
  loading,
  currentPage,
  totalPages,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onDelete,
  onPageChange,
  onNextPage,
  onPreviousPage,
  isAdmin,
}: FreelancersTableProps) {
  const allSelected = freelancers.length > 0 && selectedFreelancers.length === freelancers.length;
  const someSelected = selectedFreelancers.length > 0 && selectedFreelancers.length < freelancers.length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (freelancers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">לא נמצאו עצמאים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="בחר הכל"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              <TableHead className="rtl:text-right">שם מלא</TableHead>
              <TableHead className="rtl:text-right">ת.ז.</TableHead>
              <TableHead className="rtl:text-right">טלפון</TableHead>
              <TableHead className="rtl:text-right">אימייל</TableHead>
              <TableHead className="rtl:text-right">סוג</TableHead>
              <TableHead className="rtl:text-right">חברה מקושרת</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {freelancers.map((freelancer) => (
              <TableRow key={freelancer.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedFreelancers.includes(freelancer.id)}
                    onCheckedChange={() => onToggleSelection(freelancer.id)}
                    aria-label={`בחר ${freelancer.company_name}`}
                  />
                </TableCell>
                <TableCell className="font-medium rtl:text-right">
                  {freelancer.company_name}
                </TableCell>
                <TableCell className="rtl:text-right font-mono">
                  {freelancer.tax_id}
                </TableCell>
                <TableCell className="rtl:text-right" dir="ltr">
                  {freelancer.phone || '-'}
                </TableCell>
                <TableCell className="rtl:text-right" dir="ltr">
                  {freelancer.email || '-'}
                </TableCell>
                <TableCell className="rtl:text-right">
                  {(freelancer as Client & { is_passive_income?: boolean }).is_passive_income ? (
                    <Badge variant="secondary">הכנסה פסיבית</Badge>
                  ) : (
                    <Badge variant="outline">פעיל</Badge>
                  )}
                </TableCell>
                <TableCell className="rtl:text-right">
                  {(freelancer as Client & { linked_company_id?: string }).linked_company_id ? (
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">מקושר</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">פעולות</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(freelancer)}>
                        <Pencil className="h-4 w-4 ml-2" />
                        עריכה
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => onDelete(freelancer)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          מחיקה
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            עמוד {currentPage} מתוך {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
