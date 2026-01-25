/**
 * Assign Accountant Select Component
 * Dropdown to assign/reassign declarations to accountants
 */

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, UserX } from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { cn } from '@/lib/utils';

interface Accountant {
  id: string;
  name: string;
  email: string;
}

interface AssignAccountantSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function AssignAccountantSelect({
  value,
  onChange,
  disabled = false,
  className,
}: AssignAccountantSelectProps) {
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountants();
  }, []);

  const loadAccountants = async () => {
    setLoading(true);
    const { data } = await capitalDeclarationService.getTenantAccountants();
    if (data) {
      setAccountants(data);
    }
    setLoading(false);
  };

  const selectedAccountant = accountants.find((a) => a.id === value);

  // Truncate name for compact display (first name only or first 10 chars)
  const truncateName = (name: string, maxLength: number = 12) => {
    // Take first name if there's a space, otherwise truncate
    const firstName = name.split(' ')[0];
    if (firstName.length <= maxLength) return firstName;
    return firstName.substring(0, maxLength) + '...';
  };

  return (
    <Select
      value={value || 'unassigned'}
      onValueChange={(val) => onChange(val === 'unassigned' ? null : val)}
      disabled={disabled || loading}
    >
      <SelectTrigger className={cn('w-full rtl:text-right', className)}>
        <SelectValue>
          {loading ? (
            <span className="text-muted-foreground">טוען...</span>
          ) : value && selectedAccountant ? (
            <span className="flex items-center gap-1 rtl:flex-row-reverse" title={selectedAccountant.name}>
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{truncateName(selectedAccountant.name)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground rtl:flex-row-reverse">
              <UserX className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">לא משויך</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rtl:text-right">
        <SelectItem value="unassigned" className="rtl:text-right">
          <span className="flex items-center gap-2 rtl:flex-row-reverse">
            <UserX className="h-4 w-4" />
            ללא שיוך
          </span>
        </SelectItem>
        {accountants.map((accountant) => (
          <SelectItem
            key={accountant.id}
            value={accountant.id}
            className="rtl:text-right"
          >
            <span className="flex items-center gap-2 rtl:flex-row-reverse">
              <User className="h-4 w-4" />
              {accountant.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
