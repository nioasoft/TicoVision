/**
 * HelpSearch Component
 * Search bar for finding tutorials and FAQs
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TUTORIALS } from '../data/tutorials';
import { FAQ_ITEMS } from '../data/faq';
import { HELP_CATEGORIES } from '../data/categories';
import type { HelpCategory, Tutorial, FAQItem } from '../types/help.types';

interface SearchResult {
  type: 'tutorial' | 'faq';
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
}

interface HelpSearchProps {
  onSelectTutorial?: (tutorialId: string, category: HelpCategory) => void;
  onSelectFAQ?: (faqId: string, category: HelpCategory) => void;
  className?: string;
}

/**
 * Simple fuzzy search - checks if all query words are in the text
 */
function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  return queryWords.every(word => lowerText.includes(word));
}

/**
 * Calculate match score (higher = better match)
 */
function getMatchScore(item: Tutorial | FAQItem, query: string): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  // Title match is highest priority
  if ('title' in item && item.title.toLowerCase().includes(lowerQuery)) {
    score += 100;
  }

  // Question match (for FAQ)
  if ('question' in item && item.question.toLowerCase().includes(lowerQuery)) {
    score += 100;
  }

  // Description match
  if ('description' in item && item.description.toLowerCase().includes(lowerQuery)) {
    score += 50;
  }

  // Tag match
  if (item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
    score += 30;
  }

  return score;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({
  onSelectTutorial,
  onSelectFAQ,
  className,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Search results
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const tutorialResults: SearchResult[] = TUTORIALS
      .filter(tutorial =>
        fuzzyMatch(tutorial.title, query) ||
        fuzzyMatch(tutorial.description, query) ||
        tutorial.tags.some(tag => fuzzyMatch(tag, query))
      )
      .sort((a, b) => getMatchScore(b, query) - getMatchScore(a, query))
      .slice(0, 5)
      .map(tutorial => ({
        type: 'tutorial' as const,
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        category: tutorial.category,
      }));

    const faqResults: SearchResult[] = FAQ_ITEMS
      .filter(faq =>
        fuzzyMatch(faq.question, query) ||
        fuzzyMatch(faq.answer, query) ||
        faq.tags.some(tag => fuzzyMatch(tag, query))
      )
      .sort((a, b) => getMatchScore(b, query) - getMatchScore(a, query))
      .slice(0, 5)
      .map(faq => ({
        type: 'faq' as const,
        id: faq.id,
        title: faq.question,
        description: faq.answer.substring(0, 100) + '...',
        category: faq.category,
      }));

    return [...tutorialResults, ...faqResults];
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'tutorial' && onSelectTutorial) {
      onSelectTutorial(result.id, result.category);
    } else if (result.type === 'faq' && onSelectFAQ) {
      onSelectFAQ(result.id, result.category);
    }
    setQuery('');
    setIsFocused(false);
  }, [onSelectTutorial, onSelectFAQ]);

  const getCategoryLabel = (categoryId: HelpCategory): string => {
    const category = HELP_CATEGORIES.find(c => c.id === categoryId);
    return category?.label || categoryId;
  };

  const showResults = isFocused && query.length >= 2;

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"

          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pr-10 pl-10 rtl:text-right"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {results.length === 0 ? (
              <div className="py-4 text-center text-gray-500 text-sm">
                לא נמצאו תוצאות עבור "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="w-full p-3 rounded-lg hover:bg-gray-50 text-right transition-colors"
                  >
                    <div className="flex items-start gap-3 rtl:flex-row-reverse">
                      {/* Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                        result.type === 'tutorial' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'
                      )}>
                        {result.type === 'tutorial' ? (
                          <FileText className="h-4 w-4" />
                        ) : (
                          <HelpCircle className="h-4 w-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 rtl:flex-row-reverse">
                          <span className="font-medium text-gray-900 truncate">
                            {result.title}
                          </span>
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                            {getCategoryLabel(result.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {result.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

HelpSearch.displayName = 'HelpSearch';
