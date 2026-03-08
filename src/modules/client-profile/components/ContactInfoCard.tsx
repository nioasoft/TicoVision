/**
 * ContactInfoCard - All contacts with accountant highlighted
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UsersRound, Mail, Phone, UserCircle } from 'lucide-react';
import type { Client, ClientContact, ClientPhone } from '@/services';

interface ContactInfoCardProps {
  client: Client;
  contacts: ClientContact[];
  phones: ClientPhone[];
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

export function ContactInfoCard({ client, contacts, phones }: ContactInfoCardProps) {
  const accountantContacts = contacts.filter((c) => c.contact_type === 'accountant_manager');
  const otherContacts = contacts.filter((c) => c.contact_type !== 'accountant_manager');

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          פרטי קשר
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Primary contact from client record */}
        {client.contact_name && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">איש קשר ראשי</div>
            <div className="text-sm font-medium">{client.contact_name}</div>
            {client.contact_email && (
              <a
                href={`mailto:${client.contact_email}`}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {client.contact_email}
              </a>
            )}
            {client.contact_phone && (
              <a
                href={`tel:${client.contact_phone}`}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                dir="ltr"
              >
                <Phone className="h-3.5 w-3.5" />
                {client.contact_phone}
              </a>
            )}
          </div>
        )}

        {/* Accountant - highlighted */}
        {accountantContacts.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-2 border border-blue-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <UserCircle className="h-3.5 w-3.5" />
              מנהל/ת חשבונות
            </div>
            {accountantContacts.map((contact) => (
              <div key={contact.id} className="space-y-1">
                <div className="text-sm font-medium text-blue-900">{contact.full_name}</div>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 text-sm text-blue-700"
                    dir="ltr"
                  >
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Accountant from client record (fallback) */}
        {accountantContacts.length === 0 && client.accountant_name && (
          <div className="bg-blue-50 rounded-lg p-3 space-y-1 border border-blue-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <UserCircle className="h-3.5 w-3.5" />
              מנהל/ת חשבונות
            </div>
            <div className="text-sm font-medium text-blue-900">{client.accountant_name}</div>
            {client.accountant_email && (
              <a
                href={`mailto:${client.accountant_email}`}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <Mail className="h-3 w-3" />
                {client.accountant_email}
              </a>
            )}
            {client.accountant_phone && (
              <a
                href={`tel:${client.accountant_phone}`}
                className="flex items-center gap-1.5 text-sm text-blue-700"
                dir="ltr"
              >
                <Phone className="h-3 w-3" />
                {client.accountant_phone}
              </a>
            )}
          </div>
        )}

        {/* Other contacts */}
        {otherContacts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">אנשי קשר נוספים</div>
            {otherContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-sm">{contact.full_name}</div>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {CONTACT_TYPE_LABELS[contact.contact_type || ''] || contact.contact_type}
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

        {/* Phone numbers */}
        {phones.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">מספרי טלפון</div>
            {phones.map((phone) => (
              <div key={phone.id} className="flex items-center gap-2">
                <a
                  href={`tel:${phone.phone_number}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  dir="ltr"
                >
                  {phone.phone_number}
                </a>
                {phone.phone_type && (
                  <span className="text-xs text-muted-foreground">
                    ({phone.phone_type === 'office' ? 'משרד' : phone.phone_type === 'mobile' ? 'נייד' : 'פקס'})
                  </span>
                )}
                {phone.is_primary && (
                  <Badge variant="outline" className="text-xs">ראשי</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
