import { Building2, Users, Briefcase, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { Client } from '@/services/client.service';

interface ClientInfoCardProps {
  client: Client;
  relatedCompanies?: Client[];
}

export function ClientInfoCard({ client, relatedCompanies = [] }: ClientInfoCardProps) {
  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case 'company':
        return 'חברה';
      case 'freelancer':
        return 'עצמאי';
      case 'salary_owner':
        return 'בעל שליטה שכיר';
      default:
        return type;
    }
  };

  const getCompanyStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-500">פעילה</Badge>
    ) : (
      <Badge variant="secondary">לא פעילה</Badge>
    );
  };

  const getCompanySubtypeLabel = (subtype?: string) => {
    switch (subtype) {
      case 'commercial_restaurant':
        return 'מסחרי - מסעדה';
      case 'commercial_other':
        return 'מסחרי - אחר';
      case 'realestate':
        return 'נדל"ן';
      case 'holdings':
        return 'אחזקות';
      default:
        return subtype || '-';
    }
  };

  return (
    <Card className="bg-gray-50 border-gray-200 rtl:text-right ltr:text-left">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Right Column - Client Type & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">סוג לקוח:</span>
              <Badge variant="outline">{getClientTypeLabel(client.client_type)}</Badge>
            </div>

            {client.client_type === 'company' && (
              <>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">סטטוס:</span>
                  {getCompanyStatusBadge(client.company_status)}
                </div>

                {client.company_subtype && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700">תת סוג:</span>
                    <span className="text-sm text-gray-600">
                      {getCompanySubtypeLabel(client.company_subtype)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Left Column - Shareholders & Related Companies */}
          <div className="space-y-3">
            {client.shareholders && client.shareholders.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">בעלי שליטה:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {client.shareholders.map((shareholder, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {shareholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {client.group && (
              <div className="flex items-start gap-2">
                <Link2 className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">קבוצת חברות:</span>
                  <div className="mt-1">
                    <span className="text-sm text-gray-600">{client.group.group_name_hebrew || client.group.group_name}</span>
                    {relatedCompanies.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        ({relatedCompanies.length} חברות נוספות בקבוצה)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}