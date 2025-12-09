/**
 * FilesManagerPage
 * Main page for managing client files organized by categories
 * Access: admin, accountant, bookkeeper
 *
 * Layout: Sidebar (categories on right) + Content (files on left)
 */

import { useState } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import { GroupSelector } from '@/components/GroupSelector';
import { FileCategorySection } from '@/components/files/FileCategorySection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FolderOpen, FileText, User, Users } from 'lucide-react';
import { getAllCategories } from '@/types/file-attachment.types';
import { cn } from '@/lib/utils';
import type { Client, ClientGroup } from '@/services/client.service';
import type { FileCategory } from '@/types/file-attachment.types';

export default function FilesManagerPage() {
  const [mode, setMode] = useState<'client' | 'group'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('company_registry');
  const categories = getAllCategories();

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
      <div className="rtl:text-right">
        <div className="flex items-center gap-3 rtl:flex-row-reverse mb-2">
          <FolderOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold rtl:text-right">מנהל קבצים ומסמכים</h1>
        </div>
        <p className="text-gray-600 rtl:text-right">
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
                  placeholder="חפש לקוח לפי שם או ח.פ..."
                />
              </div>
            </TabsContent>

            <TabsContent value="group">
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <GroupSelector
                  value={selectedGroup?.id || null}
                  onChange={setSelectedGroup}
                  label="בחר קבוצה"
                  placeholder="חפש קבוצה לפי שם..."
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
                : `קבצים מאורגנים לפי ${categories.length} קטגוריות`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6" dir="rtl">
              {/* Sidebar - קטגוריות מימין */}
              <div className="w-64 flex-shrink-0">
                <nav className="space-y-1 sticky top-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key as FileCategory)}
                      className={cn(
                        "w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center gap-2",
                        selectedCategory === cat.key
                          ? "bg-primary text-white font-medium"
                          : "hover:bg-gray-100 text-gray-700"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
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