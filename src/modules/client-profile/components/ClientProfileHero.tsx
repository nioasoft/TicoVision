/**
 * ClientProfileHero - Rich identity header for client profile
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pencil, UserCircle } from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
import { useNavigate } from 'react-router-dom';
import { formatIsraeliTaxId } from '@/lib/validators';
import { Form1214Indicator } from './Form1214Indicator';
import type { Client, ClientContact } from '@/services';

interface ClientProfileHeroProps {
  client: Client;
  contacts: ClientContact[];
  onEdit: () => void;
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  company: 'חברה',
  freelancer: 'עצמאי',
  salary_owner: 'שכיר בעל שליטה',
  partnership: 'שותפות',
  nonprofit: 'עמותה',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
  adhoc: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  pending: 'ממתין',
  adhoc: 'מזדמן',
};

const PAYMENT_ROLE_LABELS: Record<string, string> = {
  independent: 'עצמאי',
  member: 'חבר קבוצה',
  primary_payer: 'משלם ראשי',
};

const COMPANY_SUBTYPE_LABELS: Record<string, string> = {
  commercial_restaurant: 'מסעדה / מסחר',
  commercial_other: 'מסחר אחר',
  realestate: 'נדל"ן',
  holdings: 'אחזקות',
};

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  minor: 'פעילות מזערית',
  significant: 'פעילות מהותית',
};

const ACTIVITY_LEVEL_STYLES: Record<string, string> = {
  minor: 'border-border bg-muted/50 text-muted-foreground',
  significant: 'border-primary/20 bg-primary/10 text-primary',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  active: 'border-t-primary',
  inactive: 'border-t-red-500',
  pending: 'border-t-yellow-500',
  adhoc: 'border-t-border',
};

export function ClientProfileHero({ client, contacts, onEdit }: ClientProfileHeroProps) {
  const navigate = useNavigate();

  const accountantContact = contacts.find(
    (c) => c.contact_type === 'accountant_manager'
  );

  return (
    <div
      className={`rounded-2xl border border-t-4 bg-card p-4 shadow-sm ${STATUS_BORDER_COLORS[client.status] || 'border-t-border'}`}
    >
      <div className="flex items-start justify-between">
        {/* Right side - identity info */}
        <div className="space-y-2 flex-1">
          {/* Row 1: Name + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => navigate('/clients')}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">{client.company_name}</h1>
            {client.commercial_name && (
              <span className="text-lg text-muted-foreground">({client.commercial_name})</span>
            )}
            <Badge variant={STATUS_VARIANT[client.status] || 'secondary'}>
              {STATUS_LABELS[client.status] || client.status}
            </Badge>
            <Badge
              variant="outline"
              className={
                client.company_status === 'inactive'
                  ? 'border-orange-300 bg-orange-50 text-orange-700'
                  : 'border-primary/20 bg-primary/10 text-primary'
              }
            >
              {client.company_status === 'inactive' ? 'חברה רדומה' : 'חברה פעילה'}
            </Badge>
            {client.google_drive_link && (
              <a
                href={client.google_drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white px-3 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <GoogleDriveIcon className="h-4 w-4" />
                Google Drive
              </a>
            )}
          </div>

          {/* Row 2: Tax ID + type + group */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="font-mono" dir="ltr">ח.פ. {formatIsraeliTaxId(client.tax_id)}</span>
            <span>{CLIENT_TYPE_LABELS[client.client_type] || client.client_type}</span>
            {client.group && (
              <Badge variant="outline" className="text-xs">
                {client.group.group_name_hebrew}
              </Badge>
            )}
            <Form1214Indicator status={client.tax_coding_status} />
          </div>

          {/* Row 3: Accountant name */}
          {accountantContact && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary">
                <UserCircle className="h-4 w-4" />
                <span className="font-medium">מנהל/ת חשבונות:</span>
                <span>{accountantContact.full_name}</span>
              </div>
            </div>
          )}

          {/* Row 4: Classification badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {client.pays_fees ? (
              <Badge variant="brand" className="text-xs">
                משלם שכ&quot;ט
              </Badge>
            ) : (
              <Badge variant="danger" className="text-xs">
                לא משלם שכ&quot;ט
              </Badge>
            )}
            {client.receives_letters ? (
              <Badge variant="info" className="text-xs">
                מקבל מכתבים
              </Badge>
            ) : (
              <Badge variant="danger" className="text-xs">
                לא מקבל מכתבים
              </Badge>
            )}
            {client.is_retainer && (
              <Badge variant="neutral" className="text-xs">
                ריטיינר
              </Badge>
            )}
            {client.internal_external === 'external' && (
              <Badge variant="secondary" className="text-xs">
                הנה&quot;ח חיצוני
              </Badge>
            )}
            {client.company_subtype && (
              <Badge variant="neutral" className="text-xs">
                {COMPANY_SUBTYPE_LABELS[client.company_subtype] || client.company_subtype}
              </Badge>
            )}
            {client.activity_level && (
              <Badge variant="outline" className={`text-xs ${ACTIVITY_LEVEL_STYLES[client.activity_level] || ''}`}>
                {ACTIVITY_LEVEL_LABELS[client.activity_level] || client.activity_level}
              </Badge>
            )}
            {client.payment_role && client.payment_role !== 'independent' && (
              <Badge variant="warning" className="text-xs">
                {PAYMENT_ROLE_LABELS[client.payment_role]}
              </Badge>
            )}
          </div>
        </div>

        {/* Left side - actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="brandOutline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 ms-1.5" />
            עריכה
          </Button>
        </div>
      </div>
    </div>
  );
}
