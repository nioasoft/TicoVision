/**
 * HelpPage Component
 * Main help and training page with tutorials and FAQs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HelpSearch } from '../components/HelpSearch';
import { TutorialCard } from '../components/TutorialCard';
import { FAQSection } from '../components/FAQSection';
import { HELP_CATEGORIES } from '../data/categories';
import { TUTORIALS, getTutorialsByCategory } from '../data/tutorials';
import { FAQ_ITEMS, getFAQsByCategory } from '../data/faq';
import type { HelpCategory } from '../types/help.types';
import * as LucideIcons from 'lucide-react';
import { BookOpen } from 'lucide-react';

// Get icon component by name
function getIconComponent(iconName: string): React.ElementType {
  const icons = LucideIcons as Record<string, React.ElementType>;
  return icons[iconName] || LucideIcons.FileText;
}

export const HelpPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<HelpCategory>('collections');
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null);

  // Get tutorials and FAQs for active category
  const categoryTutorials = useMemo(() => {
    return getTutorialsByCategory(activeCategory);
  }, [activeCategory]);

  const categoryFAQs = useMemo(() => {
    return getFAQsByCategory(activeCategory);
  }, [activeCategory]);

  // Handle search selection
  const handleSelectTutorial = useCallback((tutorialId: string, category: HelpCategory) => {
    setActiveCategory(category);
    setOpenTutorialId(tutorialId);
    // Scroll to tutorial
    setTimeout(() => {
      const element = document.getElementById(`tutorial-${tutorialId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const handleSelectFAQ = useCallback((faqId: string, category: HelpCategory) => {
    setActiveCategory(category);
    // Scroll to FAQ section
    setTimeout(() => {
      const element = document.getElementById('faq-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  // Toggle tutorial
  const handleToggleTutorial = useCallback((tutorialId: string) => {
    setOpenTutorialId(prev => prev === tutorialId ? null : tutorialId);
  }, []);

  // Get total counts for tabs
  const getCategoryCount = useCallback((categoryId: HelpCategory) => {
    const tutorialCount = TUTORIALS.filter(t => t.category === categoryId).length;
    const faqCount = FAQ_ITEMS.filter(f => f.category === categoryId).length;
    return tutorialCount + faqCount;
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="rtl:text-right ltr:text-left">
        <div className="flex items-center gap-3 rtl:flex-row-reverse mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">עזרה והדרכה</h1>
        </div>
        <p className="text-gray-500">
          מדריכים מפורטים וטיפים לשימוש במערכת TicoVision CRM
        </p>
      </div>

      {/* Search */}
      <HelpSearch
        onSelectTutorial={handleSelectTutorial}
        onSelectFAQ={handleSelectFAQ}
        className="max-w-2xl mx-auto"
      />

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as HelpCategory)}>
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 justify-center">
          {HELP_CATEGORIES.map((category) => {
            const Icon = getIconComponent(category.icon);
            const count = getCategoryCount(category.id);
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border rtl:flex-row-reverse',
                  'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
                  'data-[state=active]:border-primary',
                  'data-[state=inactive]:bg-white data-[state=inactive]:hover:bg-gray-50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{category.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5',
                    'data-[state=active]:bg-primary-foreground/20'
                  )}
                >
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        {HELP_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6 space-y-6">
            {/* Category Description */}
            <Card className="bg-gradient-to-l from-gray-50 to-white">
              <CardContent className="py-4">
                <p className="text-gray-600 rtl:text-right">{category.description}</p>
              </CardContent>
            </Card>

            {/* Tutorials Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold rtl:text-right">הדרכות</h2>
              {categoryTutorials.length > 0 ? (
                <div className="space-y-3">
                  {categoryTutorials.map((tutorial) => (
                    <div key={tutorial.id} id={`tutorial-${tutorial.id}`}>
                      <TutorialCard
                        tutorial={tutorial}
                        isOpen={openTutorialId === tutorial.id}
                        onToggle={() => handleToggleTutorial(tutorial.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    אין הדרכות זמינות בקטגוריה זו
                  </CardContent>
                </Card>
              )}
            </div>

            {/* FAQ Section */}
            <div id="faq-section">
              {categoryFAQs.length > 0 && (
                <FAQSection faqs={categoryFAQs} />
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer Help Text */}
      <Card className="bg-blue-50 border-blue-100">
        <CardContent className="py-4">
          <p className="text-sm text-blue-800 rtl:text-right">
            לא מצאת את מה שחיפשת? פנה/י למנהל המערכת או שלח/י מייל לתמיכה.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

HelpPage.displayName = 'HelpPage';

export default HelpPage;
