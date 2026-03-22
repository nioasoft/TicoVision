/**
 * ClientProfileHero - Rich identity header for client profile
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pencil, FolderOpen, UserCircle } from 'lucide-react';
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
  minor: 'bg-gray-50 text-gray-600 border-gray-200',
  significant: 'bg-teal-50 text-teal-700 border-teal-200',
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  active: 'border-t-green-500',
  inactive: 'border-t-red-500',
  pending: 'border-t-yellow-500',
  adhoc: 'border-t-gray-400',
};

export function ClientProfileHero({ client, contacts, onEdit }: ClientProfileHeroProps) {
  const navigate = useNavigate();

  const accountantContact = contacts.find(
    (c) => c.contact_type === 'accountant_manager'
  );

  return (
    <div
      className={`rounded-xl border border-t-4 bg-card shadow-sm p-4 ${STATUS_BORDER_COLORS[client.status] || 'border-t-gray-400'}`}
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
                  : 'border-green-300 bg-green-50 text-green-700'
              }
            >
              {client.company_status === 'inactive' ? 'חברה רדומה' : 'חברה פעילה'}
            </Badge>
            {client.google_drive_link && (
              <a
                href={client.google_drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-sm font-medium text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 text-blue-600" />
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
            <Form1214Indicator taxCoding={client.tax_coding} />
          </div>

          {/* Row 3: Accountant name */}
          {accountantContact && (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 border border-blue-200">
                <UserCircle className="h-4 w-4" />
                <span className="font-medium">מנהל/ת חשבונות:</span>
                <span>{accountantContact.full_name}</span>
              </div>
            </div>
          )}

          {/* Row 4: Classification badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {client.pays_fees ? (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                משלם שכ&quot;ט
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                לא משלם שכ&quot;ט
              </Badge>
            )}
            {client.receives_letters ? (
              <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                מקבל מכתבים
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                לא מקבל מכתבים
              </Badge>
            )}
            {client.is_retainer && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                ריטיינר
              </Badge>
            )}
            {client.internal_external === 'external' && (
              <Badge variant="secondary" className="text-xs">
                הנה&quot;ח חיצוני
              </Badge>
            )}
            {client.company_subtype && (
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                {COMPANY_SUBTYPE_LABELS[client.company_subtype] || client.company_subtype}
              </Badge>
            )}
            {client.activity_level && (
              <Badge variant="outline" className={`text-xs ${ACTIVITY_LEVEL_STYLES[client.activity_level] || ''}`}>
                {ACTIVITY_LEVEL_LABELS[client.activity_level] || client.activity_level}
              </Badge>
            )}
            {client.payment_role && client.payment_role !== 'independent' && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {PAYMENT_ROLE_LABELS[client.payment_role]}
              </Badge>
            )}
          </div>
        </div>

        {/* Left side - actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 ms-1.5" />
            עריכה
          </Button>
        </div>
      </div>
    </div>
  );
}
