/**
 * FilesManagerPage
 * Main page for managing client files organized by categories
 * Access: admin, accountant, bookkeeper
 */

import { useState } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import { FileCategorySection } from '@/components/files/FileCategorySection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';
import { getAllCategories } from '@/types/file-attachment.types';
import type { Client } from '@/services/client.service';
import type { FileCategory } from '@/types/file-attachment.types';

export default function FilesManagerPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const categories = getAllCategories();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rtl:text-right">
        <div className="flex items-center gap-3 rtl:flex-row-reverse mb-2">
          <FolderOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold rtl:text-right">מנהל קבצים ומסמכים</h1>
        </div>
        <p className="text-gray-600 rtl:text-right">
          ניהול וארגון מסמכים ללקוחות לפי קטגוריות
        </p>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader className="rtl:text-right">
          <CardTitle className="rtl:text-right">בחירת לקוח</CardTitle>
          <CardDescription className="rtl:text-right">
            בחר לקוח כדי לצפות ולנהל את המסמכים שלו
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientSelector
            value={selectedClient?.id || null}
            onChange={setSelectedClient}
            label="בחר לקוח"
            placeholder="חפש לקוח לפי שם או ח.פ..."
          />
        </CardContent>
      </Card>

      {/* Files by Category */}
      {selectedClient ? (
        <Card>
          <CardHeader className="rtl:text-right">
            <CardTitle className="rtl:text-right">
              מסמכים - {selectedClient.company_name_hebrew || selectedClient.company_name}
            </CardTitle>
            <CardDescription className="rtl:text-right">
              קבצים מאורגנים לפי 7 קטגוריות
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={categories[0].key} className="w-full" dir="rtl">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 w-full rtl:space-x-reverse">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.key}
                    value={category.key}
                    className="rtl:text-right text-xs md:text-sm"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category.key} value={category.key} className="mt-6">
                  <FileCategorySection
                    clientId={selectedClient.id}
                    category={category.key as FileCategory}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 rtl:text-right mb-2">
                בחר לקוח להתחלה
              </h3>
              <p className="text-gray-500 rtl:text-right">
                בחר לקוח מהרשימה למעלה כדי לצפות ולנהל את המסמכים שלו
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
