/**
 * GroupMembersCard - Table of all clients in the group with inline payment role editing
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Client, PaymentRole } from '@/services';

interface GroupMembersCardProps {
  members: Client[];
  onAddClients?: () => void;
  onPaymentRoleChange?: (clientId: string, newRole: PaymentRole) => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  pending: 'ממתין',
  adhoc: 'מזדמן',
};

const STATUS_STYLES: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  active: 'success',
  inactive: 'danger',
  pending: 'warning',
  adhoc: 'neutral',
};

const PAYMENT_ROLE_OPTIONS: { value: PaymentRole; label: string }[] = [
  { value: 'independent', label: 'עצמאי' },
  { value: 'member', label: 'חבר קבוצה' },
  { value: 'primary_payer', label: 'משלם ראשי' },
];

const CLIENT_TYPE_LABELS: Record<string, string> = {
  company: 'חברה',
  freelancer: 'עצמאי',
  salary_owner: 'שכיר בעל שליטה',
  partnership: 'שותפות',
  nonprofit: 'עמותה',
};

export function GroupMembersCard({ members, onAddClients, onPaymentRoleChange }: GroupMembersCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            חברי הקבוצה
            <span className="text-xs text-muted-foreground font-normal">({members.length})</span>
          </CardTitle>
          {onAddClients && (
            <Button
              variant="brandOutline"
              size="pill"
              onClick={onAddClients}
            >
              <Plus className="size-4" />
              הוסף חברות לקבוצה
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין חברים בקבוצה</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right pb-2 pe-3 font-medium">שם חברה</th>
                  <th className="text-right pb-2 pe-3 font-medium">ח.פ.</th>
                  <th className="text-right pb-2 pe-3 font-medium">סוג</th>
                  <th className="text-right pb-2 pe-3 font-medium">סטטוס</th>
                  <th className="text-right pb-2 pe-3 font-medium">תפקיד תשלום</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td
                      className="py-2 pe-3 font-medium text-blue-700 hover:underline cursor-pointer"
                      onClick={() => navigate(`/clients/${member.id}`)}
                    >
                      {member.company_name}
                    </td>
                    <td className="py-2 pe-3 font-mono text-muted-foreground" dir="ltr">
                      {member.tax_id}
                    </td>
                    <td className="py-2 pe-3 text-muted-foreground">
                      {CLIENT_TYPE_LABELS[member.client_type] || member.client_type}
                    </td>
                    <td className="py-2 pe-3">
                      <Badge
                        variant={STATUS_STYLES[member.status] || 'neutral'}
                        className="text-xs"
                      >
                        {STATUS_LABELS[member.status] || member.status}
                      </Badge>
                    </td>
                    <td className="py-2 pe-3">
                      {onPaymentRoleChange ? (
                        <Select
                          value={member.payment_role || 'independent'}
                          onValueChange={(val) => onPaymentRoleChange(member.id, val as PaymentRole)}
                        >
                          <SelectTrigger className="h-9 w-[138px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {PAYMENT_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        member.payment_role && (
                          <Badge variant="brand" className="text-xs">
                            {PAYMENT_ROLE_OPTIONS.find(o => o.value === member.payment_role)?.label || member.payment_role}
                          </Badge>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
