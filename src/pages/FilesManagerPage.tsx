/**
 * FilesManagerPage
 * Main page for managing client files organized by categories
 * Access: admin, accountant, bookkeeper
 *
 * Layout: Sidebar (categories on right) + Content (files on left)
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClientSelector } from '@/components/ClientSelector';
import { GroupSelector } from '@/components/GroupSelector';
import { FileCategorySection } from '@/components/files/FileCategorySection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FolderOpen, FileText, User, Users } from 'lucide-react';
import { getCategoriesByGroup } from '@/types/file-attachment.types';
import { cn } from '@/lib/utils';
import { ClientService, type Client, type ClientGroup } from '@/services/client.service';
import type { FileCategory } from '@/types/file-attachment.types';

const clientService = new ClientService();

export default function FilesManagerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<'client' | 'group'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('financial_report');
  const groupedCategories = getCategoriesByGroup();

  // Auto-select client from URL ?clientId=xxx
  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId && !selectedClient) {
      clientService.getById(clientId).then(({ data }) => {
        if (data) {
          setSelectedClient(data);
          // Clean up the URL param
          setSearchParams({}, { replace: true });
        }
      });
    }
  }, [searchParams]);

  const isSelected = mode === 'client' ? !!selectedClient : !!selectedGroup;
  
  const getSelectedName = () => {
    if (mode === 'client' && selectedClient) {
      return selectedClient.company_name_hebrew || selectedClient.company_name;
    }
    if (mode === 'group' && selectedGroup) {
      return selectedGroup.group_name_hebrew;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-left">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-left">מנהל קבצים ומסמכים</h1>
        </div>
        <p className="text-sm text-muted-foreground/60 mt-0.5 italic">Every Record Tells a Story</p>
        <p className="text-gray-600 text-right">
          ניהול וארגון מסמכים ללקוחות וקבוצות לפי קטגוריות
        </p>
      </div>

      {/* Selection Mode & Search */}
      <Card>
        <CardHeader className="rtl:text-right">
          <CardTitle className="rtl:text-right">בחירה</CardTitle>
          <CardDescription className="rtl:text-right">
            בחר אם ברצונך לנהל קבצים עבור לקוח בודד או קבוצת לקוחות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={mode} 
            onValueChange={(v) => {
              setMode(v as 'client' | 'group');
              // Reset selections when switching modes
              if (v === 'client') setSelectedGroup(null);
              else setSelectedClient(null);
            }} 
            dir="rtl" 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="client" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                לפי לקוח
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                לפי קבוצה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client">
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <ClientSelector
                  value={selectedClient?.id || null}
                  onChange={setSelectedClient}
                  label="בחר לקוח"

                />
              </div>
            </TabsContent>

            <TabsContent value="group">
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <GroupSelector
                  value={selectedGroup?.id || null}
                  onChange={setSelectedGroup}
                  label="בחר קבוצה"

                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Files by Category - Sidebar Layout */}
      {isSelected ? (
        <Card>
          <CardHeader className="rtl:text-right">
            <CardTitle className="rtl:text-right">
              מסמכים - {getSelectedName()}
            </CardTitle>
            <CardDescription className="rtl:text-right">
              {mode === 'group'
                ? 'העלאת קבצים לכל לקוחות הקבוצה'
                : 'קבצים מאורגנים לפי קטגוריות'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6" dir="rtl">
              {/* Sidebar - קטגוריות מימין */}
              <div className="w-64 flex-shrink-0">
                <nav className="space-y-4 sticky top-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {groupedCategories.map(({ group, categories: cats }) => (
                    <div key={group.key}>
                      <h4 className="text-xs font-semibold text-gray-500 px-2 pb-1 mb-1 border-b border-gray-200">
                        {group.label}
                      </h4>
                      <div className="space-y-1">
                        {cats.map((cat) => (
                          <button
                            key={cat.key}
                            onClick={() => setSelectedCategory(cat.key)}
                            className={cn(
                              "w-full text-right px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2 bg-yellow-100 text-blue-900 text-sm",
                              selectedCategory === cat.key
                                ? "border-2 border-blue-900 font-bold"
                                : "hover:bg-yellow-200 border-2 border-transparent"
                            )}
                          >
                            <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              {/* Content - קבצים משמאל */}
              <div className="flex-1 min-w-0">
                <FileCategorySection
                  clientId={selectedClient?.id}
                  groupId={selectedGroup?.id}
                  category={selectedCategory}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                בחר {mode === 'client' ? 'לקוח' : 'קבוצה'} להתחלה
              </h3>
              <p className="text-gray-500">
                בחר {mode === 'client' ? 'לקוח' : 'קבוצה'} מהרשימה למעלה כדי {mode === 'client' ? 'לצפות ולנהל את המסמכים שלו' : 'להעלות קבצים לכל חברי הקבוצה'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}