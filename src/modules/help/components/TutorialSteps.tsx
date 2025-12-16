/**
 * TutorialSteps Component
 * Displays step-by-step tutorial content with optional screenshots
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TipBox } from './TipBox';
import type { TutorialStep } from '../types/help.types';

interface TutorialStepsProps {
  steps: TutorialStep[];
  className?: string;
}

const TutorialStepItem: React.FC<{ step: TutorialStep; isLast: boolean }> = ({ step, isLast }) => {
  return (
    <div className="flex gap-4 rtl:flex-row-reverse">
      {/* Step Number Circle */}
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {step.stepNumber}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
        )}
      </div>

      {/* Step Content */}
      <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
        <h4 className="font-semibold text-gray-900 mb-2 rtl:text-right">{step.title}</h4>
        <p className="text-gray-600 text-sm leading-relaxed mb-3 rtl:text-right">
          {step.description}
        </p>

        {/* Screenshot */}
        {step.screenshotUrl && (
          <div className="mb-3">
            <div className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <img
                src={step.screenshotUrl}
                alt={step.screenshotAlt || 'צילום מסך'}
                className="w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  // On error, show placeholder
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling;
                  if (placeholder) {
                    (placeholder as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              {/* Placeholder shown on image load error */}
              <div className="aspect-video items-center justify-center text-gray-400 text-sm hidden">
                <div className="text-center p-4">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-lg bg-gray-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs">{step.screenshotAlt || 'צילום מסך'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tip Box */}
        {step.tip && (
          <TipBox type={step.tip.type} content={step.tip.content} />
        )}
      </div>
    </div>
  );
};

export const TutorialSteps: React.FC<TutorialStepsProps> = ({ steps, className }) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => (
        <TutorialStepItem
          key={step.id}
          step={step}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
};

TutorialSteps.displayName = 'TutorialSteps';
