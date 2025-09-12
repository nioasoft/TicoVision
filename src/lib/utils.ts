import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get client IP address for audit logging
 * In browser context, we can't get the real IP address
 * Returns null for browser context, server-side implementation needed for real IP
 */
export function getClientIpAddress(): string | null {
  // In browser context, we cannot get the real IP address
  // Real IP detection requires server-side implementation
  // For now, return null which is valid for PostgreSQL inet type
  return null;
}

/**
 * Get client info for audit logging
 */
export function getClientInfo() {
  return {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
  };
}