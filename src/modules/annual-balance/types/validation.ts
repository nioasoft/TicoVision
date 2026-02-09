/**
 * Zod validation schemas for annual balance dialogs
 */

import { z } from 'zod';
import { BALANCE_STATUSES } from './annual-balance.types';

export const markMaterialsSchema = z.object({
  receivedAt: z.date({ required_error: 'יש לבחור תאריך' }),
  backupLink: z.string().url('יש להזין קישור תקין'),
});

export const assignAuditorSchema = z.object({
  auditorId: z.string().min(1, 'יש לבחור מבקר'),
});

export const updateStatusSchema = z.object({
  targetStatus: z.enum(BALANCE_STATUSES, { required_error: 'סטטוס יעד נדרש' }),
  note: z.string().max(500, 'הערה יכולה להכיל עד 500 תווים').optional(),
});

export const updateAdvancesSchema = z.object({
  amount: z.number({ required_error: 'יש להזין סכום' })
    .min(0, 'סכום חייב להיות חיובי'),
  letterId: z.string().uuid().optional().or(z.literal('')),
});

export const openYearSchema = z.object({
  year: z.number()
    .int('שנה חייבת להיות מספר שלם')
    .min(2020, 'שנה לא תקינה')
    .max(2030, 'שנה לא תקינה'),
});

export const confirmAssignmentSchema = z.object({
  id: z.string().uuid(),
});

export const updateAdvanceRateSchema = z.object({
  taxAmount: z.number().min(0, 'סכום מס חייב להיות חיובי'),
  turnover: z.number().min(0, 'מחזור חייב להיות חיובי'),
  currentAdvanceRate: z.number().min(0).max(1, 'שיעור מקדמה חייב להיות בין 0 ל-100%'),
});

export type MarkMaterialsInput = z.infer<typeof markMaterialsSchema>;
export type AssignAuditorInput = z.infer<typeof assignAuditorSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type UpdateAdvancesInput = z.infer<typeof updateAdvancesSchema>;
export type OpenYearInput = z.infer<typeof openYearSchema>;
export type ConfirmAssignmentInput = z.infer<typeof confirmAssignmentSchema>;
export type UpdateAdvanceRateInput = z.infer<typeof updateAdvanceRateSchema>;
