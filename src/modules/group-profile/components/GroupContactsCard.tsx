/**
 * GroupContactsCard - Group contacts with primary owner highlighted
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UsersRound, Mail, Phone, UserCircle, Plus } from 'lucide-react';
import type { AssignedGroupContact } from '@/types/tenant-contact.types';

interface GroupContactsCardProps {
  contacts: AssignedGroupContact[];
  onManageContacts?: () => void;
}

const CONTACT_TYPE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  accountant_manager: 'מנהל/ת חשבונות',
  secretary: 'מזכירה',
  cfo: 'סמנכ"ל כספים',
  board_member: 'דירקטור',
  legal_counsel: 'יועץ משפטי',
  other: 'אחר',
};

export function GroupContactsCard({ contacts, onManageContacts }: GroupContactsCardProps) {
  const primaryContacts = contacts.filter((c) => c.is_primary);
  const otherContacts = contacts.filter((c) => !c.is_primary);

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            אנשי קשר
            {contacts.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({contacts.length})</span>
            )}
          </CardTitle>
          {onManageContacts && (
            <Button size="sm" variant="outline" onClick={onManageContacts}>
              <Plus className="h-4 w-4 ms-1" />
              ניהול
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין אנשי קשר</p>
        ) : (
          <>
            {/* Primary contacts - highlighted */}
            {primaryContacts.map((contact) => (
              <div key={contact.assignment_id} className="bg-indigo-50 rounded-lg p-3 space-y-1 border border-indigo-100">
                <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                  <UserCircle className="h-3.5 w-3.5" />
                  בעל שליטה ראשי
                </div>
                <div className="text-sm font-medium text-indigo-900">{contact.full_name}</div>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 text-sm text-indigo-700"
                    dir="ltr"
                  >
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </a>
                )}
                {contact.assignment_notes && (
                  <div className="text-xs text-indigo-600 mt-1">{contact.assignment_notes}</div>
                )}
              </div>
            ))}

            {/* Other contacts */}
            {otherContacts.length > 0 && (
              <div className="space-y-2">
                {primaryContacts.length > 0 && (
                  <div className="text-xs font-medium text-muted-foreground">אנשי קשר נוספים</div>
                )}
                {otherContacts.map((contact) => (
                  <div
                    key={contact.assignment_id}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm">{contact.full_name}</div>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {CONTACT_TYPE_LABELS[contact.contact_type] || contact.contact_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground">
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
