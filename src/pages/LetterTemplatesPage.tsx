/**
 * Letter Templates Page - Updated with Universal Builder
 * Two tabs: Fee Letters (11 templates) + Universal Builder (custom letters)
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LetterBuilder } from '@/modules/letters/components/LetterBuilder';
import { UniversalLetterBuilder } from '@/modules/letters/components/UniversalLetterBuilder';

export function LetterTemplatesPage() {
  const [activeTab, setActiveTab] = useState('fee-letters');

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-right">ניהול תבניות מכתבים</h1>
          <p className="text-gray-500 mt-1 text-right">מכתבי שכר טרחה (11 תבניות) ומכתבים כלליים (מותאמים אישית)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fee-letters">טסט מכתבים שכר טרחה</TabsTrigger>
          <TabsTrigger value="universal-builder">בונה מכתבים אוניברסלי</TabsTrigger>
        </TabsList>

        {/* Fee Letters Tab - 11 Templates */}
        <TabsContent value="fee-letters" className="space-y-4">
          <LetterBuilder />
        </TabsContent>

        {/* Universal Builder Tab - Custom Letters */}
        <TabsContent value="universal-builder" className="space-y-4">
          <UniversalLetterBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
