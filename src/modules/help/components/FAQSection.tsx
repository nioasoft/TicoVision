/**
 * FAQSection Component
 * Displays frequently asked questions in an accordion format
 */

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FAQItem } from '../types/help.types';

interface FAQSectionProps {
  faqs: FAQItem[];
  title?: string;
  className?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  faqs,
  title = 'שאלות נפוצות',
  className,
}) => {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse text-lg">
          <HelpCircle className="h-5 w-5 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="rtl:text-right hover:no-underline">
                <span dir="rtl" className="text-right flex-1 pr-2">{faq.question}</span>
              </AccordionTrigger>
              <AccordionContent className="rtl:text-right">
                <div dir="rtl" className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {faq.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

FAQSection.displayName = 'FAQSection';
