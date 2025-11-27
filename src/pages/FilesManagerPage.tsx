/**
 * FilesManagerPage
 * Main page for managing client files organized by categories
 * Access: admin, accountant, bookkeeper
 *
 * Layout: Sidebar (categories on right) + Content (files on left)
 */

import { useState } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import { FileCategorySection } from '@/components/files/FileCategorySection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, FileText } from 'lucide-react';
import { getAllCategories } from '@/types/file-attachment.types';
import { cn } from '@/lib/utils';
import type { Client } from '@/services/client.service';
import type { FileCategory } from '@/types/file-attachment.types';

export default function FilesManagerPage() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('company_registry');
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

      {/* Files by Category - Sidebar Layout */}
      {selectedClient ? (
        <Card>
          <CardHeader className="rtl:text-right">
            <CardTitle className="rtl:text-right">
              מסמכים - {selectedClient.company_name_hebrew || selectedClient.company_name}
            </CardTitle>
            <CardDescription className="rtl:text-right">
              קבצים מאורגנים לפי {categories.length} קטגוריות
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
                  clientId={selectedClient.id}
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
                בחר לקוח להתחלה
              </h3>
              <p className="text-gray-500">
                בחר לקוח מהרשימה למעלה כדי לצפות ולנהל את המסמכים שלו
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
