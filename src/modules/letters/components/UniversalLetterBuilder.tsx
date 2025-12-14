/**
 * Universal Letter Builder Component
 * Build custom letters from plain text with Markdown-like syntax
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Eye, Mail, Save, AlertCircle, Loader2, FileText, Trash2, Plus, Minus, ArrowUp, ArrowDown, Type, Printer, HelpCircle, MessageCircle, X, Users, UserPlus, FileDown, Building2 } from 'lucide-react';
import { TemplateService } from '../services/template.service';
import { supabase } from '@/lib/supabase';
import { ClientSelector } from '@/components/ClientSelector';
import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';
import { Combobox } from '@/components/ui/combobox';
import { clientService } from '@/services';
import type { Client } from '@/services/client.service';
import { TenantContactService } from '@/services/tenant-contact.service';
import type { AssignedContact } from '@/types/tenant-contact.types';
import { PDFGenerationService } from '@/modules/letters-v2/services/pdf-generation.service';
import { groupFeeService, type ClientGroup, type GroupMemberClient } from '@/services/group-fee.service';
import { GroupMembersList } from '@/components/fees/GroupMembersList';
import { PdfFilingDialog } from './PdfFilingDialog';

const templateService = new TemplateService();
const pdfService = new PDFGenerationService();

// Constant ID for auto-managed commercial name line
const COMMERCIAL_NAME_LINE_ID = 'commercial-name-auto-line';

// Example Markdown text for guidance
const EXAMPLE_TEXT = `בפתח הדברים:
* אנו מודים לכם על אמונכם במשרדנו
* שמחנו לשרת אותכם בשנה האחרונה

ולגופו של עניין:
הננו להודיעך כי החל מתאריך {{letter_date}}, נעבור לשיטת עבודה חדשה.
המשרד שלנו ממשיך לעמוד לרשותך בכל עת.

בברכה,
צוות המשרד

הערה: שורות ההנדון (נושא המכתב) מנוהלות בסקשן הנפרד למעלה`;

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  plain_text: string;
  parsed_html: string;  // HTML content from Tiptap editor
  includes_payment: boolean;
  subject: string | null;
  created_at: string;
}

// Helper function to get contact type label in Hebrew
const getContactTypeLabel = (contactType: string): string => {
  const labels: Record<string, string> = {
    owner: 'בעלים',
    accountant_manager: 'מנהלת חשבונות',
    secretary: 'מזכירה',
    cfo: 'סמנכ"ל כספים',
    board_member: 'חבר דירקטוריון',
    legal_counsel: 'יועץ משפטי',
    other: 'אחר',
  };
  return labels[contactType] || contactType;
};

/**
 * Convert old table-based bullet format from text-to-html-parser.ts to clean HTML
 *
 * The old parser created bullets using tables like:
 * <table><tr><td><img bullet></td><td>content</td></tr></table>
 *
 * This function converts them to simple paragraphs with bullet markers
 * that Tiptap can properly edit.
 */
const convertBulletTablesToHtml = (html: string): string => {
  let result = html;

  console.log('🔧 [convertBulletTablesToHtml] Input length:', html.length);
  console.log('🔧 [convertBulletTablesToHtml] Has <table>:', html.includes('<table'));
  console.log('🔧 [convertBulletTablesToHtml] Has bullet img:', html.includes('alt="•"'));

  // Step 1: Remove HTML comments (like <!-- Section Heading -->, <!-- Paragraph -->)
  result = result.replace(/<!--[\s\S]*?-->/g, '');

  // Step 2: Extract and convert bullet tables FIRST (before processing other elements)
  // The bullet table structure has 2-column rows: column 1 = bullet icon, column 2 = content
  // Match tables that contain bullet images and extract content
  result = result.replace(
    /<table[^>]*>[\s\S]*?<\/table>/gi,
    (tableMatch) => {
      // TYPE 2: Single-cell tables containing only bullet characters (from Tiptap or legacy data)
      // These appear as <table><tr><td>•</td></tr></table> and should be removed entirely
      const strippedContent = tableMatch
        .replace(/<[^>]+>/g, '') // Remove all HTML tags
        .replace(/\s/g, ''); // Remove all whitespace
      if (/^[•\-\*]+$/.test(strippedContent)) {
        console.log('🔧 [convertBulletTablesToHtml] Removing single-cell bullet table');
        return '';
      }

      // TYPE 1: Check if this table contains bullet icons (indicator it's a bullet list)
      if (!tableMatch.includes('alt="•"') && !tableMatch.includes('bullet_star')) {
        // Not a bullet table - preserve it (it's a user-created table)
        console.log('🔧 [convertBulletTablesToHtml] Preserving user table');
        return tableMatch;
      }

      console.log('🔧 [convertBulletTablesToHtml] Converting bullet table...');

      // Extract all content cells (the second td in each row)
      const bulletItems: string[] = [];

      // Pattern to match each row with bullet icon and content
      // More flexible: allows any whitespace and attribute order
      const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableMatch)) !== null) {
        let content = rowMatch[1].trim();
        // Remove leading/trailing whitespace and clean up
        content = content.replace(/^\s+|\s+$/g, '');
        // Remove leading bullet characters that might already be in the content
        content = content.replace(/^[•\-\*]\s*/g, '');
        if (content) {
          // Output as plain paragraph - no bullet prefix needed
          // (original styled bullets preserved in originalBodyContent for preview)
          bulletItems.push(`<p>${content}</p>`);
        }
      }

      if (bulletItems.length > 0) {
        console.log('🔧 [convertBulletTablesToHtml] Extracted', bulletItems.length, 'bullet items');
        return bulletItems.join('\n');
      }

      // Fallback: if we couldn't extract rows, return empty (remove the bullet table)
      console.log('🔧 [convertBulletTablesToHtml] No bullet items extracted, removing table');
      return '';
    }
  );

  // Step 3: Convert section headings (wrapped in tr>td>div with 20px font)
  // Pattern matches: <tr><td style="padding-top: 20px;"><div style="...font-size: 20px...">content</div></td></tr>
  result = result.replace(
    /<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*font-size:\s*20px[^>]*>([\s\S]*?)<\/div>\s*<\/td>\s*<\/tr>/gi,
    '<h2>$1</h2>'
  );

  // Step 4: Convert paragraphs (wrapped in tr>td>div with 16px font)
  result = result.replace(
    /<tr[^>]*>\s*<td[^>]*>\s*<div[^>]*font-size:\s*16px[^>]*>([\s\S]*?)<\/div>\s*<\/td>\s*<\/tr>/gi,
    '<p>$1</p>'
  );

  // Step 5: Clean up remaining table wrapper rows (outer tr>td structure)
  // These are the wrapper rows that contained the above elements
  result = result.replace(/<tr[^>]*>\s*<td[^>]*padding-top[^>]*>\s*<\/td>\s*<\/tr>/gi, '');

  // Step 6: Clean up border divs - convert to <hr> or remove
  result = result.replace(/<div[^>]*border-top[^>]*>[\s\S]*?<\/div>/gi, '<hr>');

  // Step 7: Clean up orphaned closing tags from table structure
  result = result.replace(/<\/td>\s*<\/tr>\s*$/gi, '');
  result = result.replace(/^\s*<\/td>\s*<\/tr>/gi, '');

  // Step 8: Clean up bullet icon images that were left over
  // These have alt="•" or src="cid:bullet_star"
  result = result.replace(/<img[^>]*alt="[•*-]"[^>]*>/gi, '');
  result = result.replace(/<img[^>]*bullet_star[^>]*>/gi, '');

  // Step 9: Clean up table cells containing ONLY bullet characters (leftovers from conversion)
  result = result.replace(/<td[^>]*>[\s]*[•*-][\s]*<\/td>/gi, '');

  // Step 10: Clean up empty table cells and rows left from bullet table conversion
  result = result.replace(/<td[^>]*>\s*<\/td>/gi, '');
  result = result.replace(/<tr[^>]*>\s*<\/tr>/gi, '');
  result = result.replace(/<tbody[^>]*>\s*<\/tbody>/gi, '');
  result = result.replace(/<table[^>]*>\s*<\/table>/gi, '');

  // Step 11: Clean up any remaining tables that only contain bullet rows
  // (tables with just single-cell rows containing bullets)
  result = result.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableMatch) => {
    // If the entire table content is just bullet characters/whitespace/empty cells, remove it
    const stripped = tableMatch
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/[\s•*-]/g, ''); // Remove whitespace and bullet chars
    if (stripped.length === 0) {
      console.log('🔧 [convertBulletTablesToHtml] Removing empty/bullet-only table');
      return '';
    }
    return tableMatch;
  });

  // Step 12: Clean up multiple consecutive empty paragraphs/breaks
  result = result.replace(/(<p>\s*<\/p>\s*)+/gi, '');
  result = result.replace(/(<br\s*\/?>\s*)+/gi, '<br>');

  // Step 13: Clean up excessive whitespace
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Step 14: Remove any remaining standalone bullet characters that might confuse Tiptap
  // These could appear between tags: >•< or in empty paragraphs <p>•</p>
  result = result.replace(/<p>\s*[•]\s*<\/p>/gi, ''); // Remove paragraphs with just bullet
  result = result.replace(/>\s*[•]\s*</g, '><'); // Remove bullets between tags

  // Step 15: Strip <p> wrappers from inside colored bullet divs
  // BlueBullet/DarkRedBullet/BlackBullet extensions expect inline content, not block elements
  // Convert: <div data-type="blue-bullet"><p>content</p></div>
  // To:      <div data-type="blue-bullet">content</div>
  result = result.replace(
    /<div([^>]*data-type="(?:blue|darkred|black)-bullet"[^>]*)>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/div>/gi,
    '<div$1>$2</div>'
  );

  console.log('🔧 [convertBulletTablesToHtml] Output length:', result.length);
  console.log('🔧 [convertBulletTablesToHtml] Still has <table>:', result.includes('<table'));
  console.log('🔧 [convertBulletTablesToHtml] Still has bullet img:', result.includes('alt="•"'));
  console.log('🔧 [convertBulletTablesToHtml] Still has bullet char:', result.includes('•'));

  return result.trim();
};

interface UniversalLetterBuilderProps {
  editLetterId?: string | null;
}

export function UniversalLetterBuilder({ editLetterId }: UniversalLetterBuilderProps) {
  // State - Client selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // State - Text content
  const [letterContent, setLetterContent] = useState(''); // Changed from plainText to letterContent (HTML from Tiptap)
  const [originalBodyContent, setOriginalBodyContent] = useState<string | null>(null); // Original content from DB (for preview with styled bullets)
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false); // Track if user edited the content
  const [companyName, setCompanyName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [showCommercialName, setShowCommercialName] = useState(false);
  const [addressLine, setAddressLine] = useState('');
  const [showAddress, setShowAddress] = useState(false);
  const [customHeaderLines, setCustomHeaderLines] = useState<import('../types/letter.types').CustomHeaderLine[]>([]);
  const [subjectLines, setSubjectLines] = useState<import('../types/letter.types').SubjectLine[]>([
    {
      id: 'subject-default',
      content: '',
      formatting: {
        bold: true,
        underline: false,
        color: 'blue'
      },
      order: 0
    }
  ]);

  // Track if user manually edited the subject line (stops auto-sync from email subject)
  const [userEditedSubjectLine, setUserEditedSubjectLine] = useState(false);

  // State - Configuration
  const [includesPayment, setIncludesPayment] = useState(false);
  const [amount, setAmount] = useState<number>(50000);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

  // State - Saved templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // State - UI
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [lastSentLetterId, setLastSentLetterId] = useState<string | null>(null);
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // State - Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [clientContacts, setClientContacts] = useState<AssignedContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [manualEmails, setManualEmails] = useState(''); // For general letters without client

  // State - Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [parentLetterId, setParentLetterId] = useState<string | null>(null);

  // State - WhatsApp
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // State - PDF Filing Dialog
  const [showPdfFilingDialog, setShowPdfFilingDialog] = useState(false);
  const [pdfFilingData, setPdfFilingData] = useState<{
    letterId: string;
    pdfUrl: string;
    letterSubject: string;
  } | null>(null);

  // State - Manual email input
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [showManualEmailInput, setShowManualEmailInput] = useState(false);

  // State - Recipient Mode (client from list, group, or manual recipient)
  const [recipientMode, setRecipientMode] = useState<'client' | 'group' | 'manual'>('client');
  const [showModeWarning, setShowModeWarning] = useState(false);
  const [pendingMode, setPendingMode] = useState<'client' | 'group' | 'manual' | null>(null);

  // State - Group selection (for 'group' mode)
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMemberClient[]>([]);

  // State - Manual recipient fields (for 'manual' mode)
  const [manualCompanyName, setManualCompanyName] = useState('');
  const [manualShowCommercialName, setManualShowCommercialName] = useState(false);
  const [manualCommercialName, setManualCommercialName] = useState('');
  const [manualCustomHeaderLines, setManualCustomHeaderLines] = useState<import('../types/letter.types').CustomHeaderLine[]>([]);
  const [taggedClientId, setTaggedClientId] = useState<string | null>(null); // ⭐ NEW: Client tagging for manual letters

  /**
   * Load saved templates on mount
   */
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  /**
   * Load groups when mode changes to 'group'
   */
  useEffect(() => {
    if (recipientMode === 'group' && groups.length === 0) {
      loadGroups();
    }
  }, [recipientMode]);

  /**
   * Load letter for editing when editLetterId prop is provided
   */
  useEffect(() => {
    if (editLetterId) {
      loadLetterForEdit(editLetterId);
    }
  }, [editLetterId]);

  /**
   * Auto-manage commercial name line in customHeaderLines
   * - When checkbox is checked + name exists: inject as first line
   * - When checkbox is unchecked or name is empty: remove the line
   * - When name changes: update the line content
   */
  useEffect(() => {
    setCustomHeaderLines(prevLines => {
      const shouldShowCommercialName = showCommercialName && commercialName.trim();
      const existingLineIndex = prevLines.findIndex(
        line => line.id === COMMERCIAL_NAME_LINE_ID
      );

      if (shouldShowCommercialName) {
        // Create or update commercial name line
        const commercialLine: import('../types/letter.types').CustomHeaderLine = {
          id: COMMERCIAL_NAME_LINE_ID,
          type: 'text',
          content: commercialName,
          formatting: {
            bold: true,
            color: 'black',
            underline: false
          },
          order: 0
        };

        if (existingLineIndex === -1) {
          // Line doesn't exist - add it as first line
          const reindexedLines = prevLines.map(line => ({
            ...line,
            order: line.order + 1
          }));
          return [commercialLine, ...reindexedLines];
        } else {
          // Line exists - check if content changed
          if (prevLines[existingLineIndex].content !== commercialName) {
            const updatedLines = [...prevLines];
            updatedLines[existingLineIndex] = {
              ...updatedLines[existingLineIndex],
              content: commercialName
            };
            return updatedLines;
          }
          // No change needed
          return prevLines;
        }
      } else if (existingLineIndex !== -1) {
        // Commercial name should not be shown but line exists - remove it
        const filteredLines = prevLines
          .filter(line => line.id !== COMMERCIAL_NAME_LINE_ID)
          .map(line => ({
            ...line,
            order: line.order > 0 ? line.order - 1 : line.order
          }));
        return filteredLines;
      }

      // No change needed
      return prevLines;
    });
  }, [showCommercialName, commercialName]);

  /**
   * Load saved custom templates
   */
  const loadSavedTemplates = async () => {
    try {
      const { data, error } = await templateService.getCustomBodies();
      if (error) throw error;
      if (data) {
        setSavedTemplates(data);
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
      toast.error('שגיאה בטעינת תבניות שמורות');
    }
  };

  /**
   * Load all groups available for selection
   */
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await groupFeeService.getAvailableGroups(currentYear);
      if (error) throw error;
      if (data) {
        // Sort by Hebrew name
        const sorted = data.sort((a, b) =>
          (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he')
        );
        setGroups(sorted);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('שגיאה בטעינת קבוצות');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  /**
   * Handle group selection - load members and collect emails from all members
   */
  const handleGroupChange = async (group: ClientGroup | null) => {
    setSelectedGroup(group);

    if (group) {
      setIsLoadingContacts(true);
      try {
        // Load group with member details
        const { data: fullGroup, error } = await groupFeeService.getGroupWithMembers(group.id);
        if (error) throw error;

        if (fullGroup?.clients) {
          setGroupMembers(fullGroup.clients);

          // Collect emails from ALL group members
          const allEmails: string[] = [];
          for (const client of fullGroup.clients) {
            const emails = await TenantContactService.getClientEmails(client.id, 'important');
            allEmails.push(...emails);
          }

          // Remove duplicates
          const uniqueEmails = [...new Set(allEmails)];
          setSelectedRecipients(uniqueEmails);

          toast.success(`נטענו ${uniqueEmails.length} נמענים מ-${fullGroup.clients.length} חברות`);
        }
      } catch (error) {
        console.error('Error loading group details:', error);
        toast.error('שגיאה בטעינת פרטי הקבוצה');
        setGroupMembers([]);
        setSelectedRecipients([]);
      } finally {
        setIsLoadingContacts(false);
      }
    } else {
      setGroupMembers([]);
      setSelectedRecipients([]);
    }
  };

  /**
   * Handle client selection - auto-fill fields and load contacts
   */
  const handleClientChange = async (client: Client | null) => {
    setSelectedClient(client);

    if (client) {
      // Auto-fill fields from selected client
      setCompanyName(client.company_name_hebrew || client.company_name);

      // Auto-fill commercial name if exists
      if (client.commercial_name) {
        setCommercialName(client.commercial_name);
      }

      // Auto-fill phone if exists
      if (client.contact_phone) {
        setWhatsappPhone(client.contact_phone);
      }

      // Load contacts for this client
      setIsLoadingContacts(true);
      try {
        // Load all contacts and auto-select emails using centralized function
        const contacts = await TenantContactService.getClientContacts(client.id);
        const autoSelectedEmails = await TenantContactService.getClientEmails(client.id, 'important');

        // Filter contacts to show only those included in auto-selection
        const eligibleContacts = contacts.filter(c => autoSelectedEmails.includes(c.email!));

        setClientContacts(eligibleContacts);
        setSelectedRecipients(autoSelectedEmails);

      } catch (error) {
        console.error('Error loading contacts:', error);
        toast.error('שגיאה בטעינת אנשי קשר');
        setClientContacts([]);
        setSelectedRecipients([]);
      } finally {
        setIsLoadingContacts(false);
      }
    } else {
      // Clear auto-filled values when client is deselected
      setCompanyName('');
      setClientContacts([]);
      setSelectedRecipients([]);
    }
  };

  /**
   * Load template from saved list
   */
  const handleLoadTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setLetterContent(template.plain_text); // Load original HTML from Tiptap (not parsed_html with table wrapping)
      setIncludesPayment(template.includes_payment);
      setEmailSubject(template.subject || '');
      setSelectedTemplateId(templateId);
      toast.success(`תבנית "${template.name}" נטענה`);
    }
  };

  /**
   * Delete saved template
   */
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) return;

    try {
      const { error } = await templateService.deleteCustomBody(templateId);
      if (error) throw error;

      toast.success('התבנית נמחקה בהצלחה');
      loadSavedTemplates();

      // Clear selection if deleted template was selected
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
        setLetterContent('');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('שגיאה במחיקת התבנית');
    }
  };

  /**
   * Get recipient name based on current mode
   */
  const getRecipientName = (): string => {
    if (recipientMode === 'group' && selectedGroup) {
      return selectedGroup.group_name_hebrew || selectedGroup.group_name || '';
    }
    if (recipientMode === 'manual') {
      return manualCompanyName;
    }
    return companyName; // client mode
  };

  /**
   * Calculate discount amounts
   */
  const calculateDiscounts = (original: number) => {
    const formatNumber = (num: number): string => {
      return Math.round(num).toLocaleString('he-IL');
    };

    return {
      amount_original: formatNumber(original),
      amount_after_bank: formatNumber(original * 0.91),     // 9% discount
      amount_after_single: formatNumber(original * 0.92),   // 8% discount
      amount_after_payments: formatNumber(original * 0.96), // 4% discount
    };
  };

  /**
   * Validate and parse manual emails (comma or space separated)
   */
  const parseManualEmails = (emailsString: string): string[] => {
    if (!emailsString.trim()) return [];

    // Split by comma, semicolon, or multiple spaces
    const emails = emailsString
      .split(/[,;\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    return emails;
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Preview letter
   */
  const handlePreview = async () => {
    if (!letterContent || letterContent.trim() === '' || letterContent === '<p></p>' || letterContent === '<p><br></p>') {
      toast.error('נא להזין תוכן למכתב');
      return;
    }

    // Debug logging
    console.log('🔍 [Preview Debug] customHeaderLines:', customHeaderLines);
    console.log('🔍 [Preview Debug] מספר שורות:', customHeaderLines.length);
    console.log('🔍 [Preview Debug] showCommercialName:', showCommercialName);
    console.log('🔍 [Preview Debug] commercialName:', commercialName);

    setIsLoadingPreview(true);
    try {
      // Build variables
      const variables: Record<string, string | number> = {
        company_name: getRecipientName(),
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || '',
        commercial_name: showCommercialName ? commercialName : ''
      };

      console.log('🔍 [Preview Debug] variables.commercial_name:', variables.commercial_name);

      // Add email subject if provided
      if (emailSubject.trim()) {
        variables.subject = emailSubject;
      }

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // Build customHeaderLines including address if shown
      let headerLinesForPreview = [...customHeaderLines];
      if (showAddress && addressLine) {
        headerLinesForPreview = headerLinesForPreview.filter(line => line.id !== 'address-line-auto');
        headerLinesForPreview.push({
          id: 'address-line-auto',
          type: 'text' as const,
          content: addressLine,
          formatting: { bold: true, color: 'black' as const, underline: false },
          order: headerLinesForPreview.length
        });
      }

      // Use originalBodyContent for preview if available AND user hasn't edited
      // This keeps styled bullets for old letters while respecting user edits
      const contentForPreview = (originalBodyContent && !hasUserEditedContent)
        ? originalBodyContent
        : letterContent;

      const { data, error } = await templateService.previewCustomLetter({
        plainText: contentForPreview, // Use original styled content for preview
        variables,
        includesPayment,
        customHeaderLines: headerLinesForPreview, // Pass custom header lines to preview
        subjectLines, // Pass subject lines to preview
        isHtml: true // Content is HTML from Tiptap
      });

      if (error) throw error;
      if (data) {
        setPreviewHtml(data.html);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error previewing letter:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Save letter to history without sending
   */
  const handleSaveLetter = async () => {
    if (!letterContent || letterContent.trim() === '' || letterContent === '<p></p>' || letterContent === '<p><br></p>') {
      toast.error('נא להזין תוכן למכתב');
      return;
    }

    setIsSaving(true);
    try {
      // Build variables
      const variables: Record<string, string | number> = {
        company_name: getRecipientName(),
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || '',
        commercial_name: showCommercialName ? commercialName : ''
      };

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // Build customHeaderLines including address if shown
      let headerLinesToSave = [...customHeaderLines];
      if (showAddress && addressLine) {
        // Remove existing address line if present
        headerLinesToSave = headerLinesToSave.filter(line => line.id !== 'address-line-auto');
        // Add address as header line
        headerLinesToSave.push({
          id: 'address-line-auto',
          type: 'text' as const,
          content: addressLine,
          formatting: { bold: true, color: 'black' as const, underline: false },
          order: headerLinesToSave.length
        });
      }

      // ✅ CRITICAL: Check if letter already exists (saved before)
      if (savedLetterId) {
        // UPDATE existing letter
        console.log('🔄 Updating existing letter:', savedLetterId);

        const updateResult = await templateService.updateLetterContent({
          letterId: savedLetterId,
          plainText: letterContent,
          groupId: recipientMode === 'group' ? selectedGroup?.id : null,
          subjectLines,
          customHeaderLines: headerLinesToSave,
          variables,
          includesPayment,
          isHtml: true
        });

        if (updateResult.error) {
          toast.error('שגיאה בעדכון המכתב');
          return;
        }

        toast.success('המכתב עודכן בהצלחה');
      } else {
        // INSERT new letter (first save)
        console.log('✅ Creating new letter (first save)');

        const result = await templateService.generateFromCustomText({
          plainText: letterContent,
          clientId: selectedClient?.id || taggedClientId || null, // ⭐ Support client tagging in manual mode
          groupId: recipientMode === 'group' ? selectedGroup?.id : null, // ⭐ Save group ID for group letters
          recipientEmails: selectedRecipients.length > 0 ? selectedRecipients : null, // ⭐ Save recipients for edit restoration
          variables,
          includesPayment,
          customHeaderLines: headerLinesToSave,
          subjectLines,
          subject: emailSubject || 'מכתב חדש',
          isHtml: true,
          saveWithStatus: 'saved' // ⭐ Save as 'saved' not 'draft'
        });

        if (result.error || !result.data) {
          toast.error('שגיאה בשמירת המכתב');
          return;
        }

        setSavedLetterId(result.data.id);
        toast.success('המכתב נשמר בהיסטוריית מכתבים');
      }

    } catch (error) {
      console.error('Error saving letter:', error);
      toast.error('שגיאה בשמירת המכתב');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Send email via Edge Function
   */
  const handleSendEmail = async () => {
    if (!letterContent || letterContent.trim() === '' || letterContent === '<p></p>' || letterContent === '<p><br></p>') {
      toast.error('נא להזין תוכן למכתב');
      return;
    }

    // Determine recipient emails - selectedRecipients works for both client and manual modes
    if (selectedRecipients.length === 0) {
      toast.error('נא לבחור לפחות נמען אחד');
      return;
    }

    const recipientEmails = selectedRecipients;

    if (!emailSubject.trim()) {
      toast.error('נא להזין נושא למייל');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Build variables
      const variables: Record<string, string | number> = {
        company_name: getRecipientName(),
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || '',
        commercial_name: showCommercialName ? commercialName : ''
      };

      // Add email subject if provided
      if (emailSubject.trim()) {
        variables.subject = emailSubject;
      }

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // Build customHeaderLines including address if shown
      let headerLinesForEmail = [...customHeaderLines];
      if (showAddress && addressLine) {
        headerLinesForEmail = headerLinesForEmail.filter(line => line.id !== 'address-line-auto');
        headerLinesForEmail.push({
          id: 'address-line-auto',
          type: 'text' as const,
          content: addressLine,
          formatting: { bold: true, color: 'black' as const, underline: false },
          order: headerLinesForEmail.length
        });
      }

      // Get fresh session token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Send via Edge Function - it will parse, build, send, and save
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails, // Array of emails (from client or manual)
          recipientName: recipientMode === 'manual' ? manualCompanyName : companyName,
          customText: letterContent, // Send HTML content
          variables,
          includesPayment,
          customHeaderLines: headerLinesForEmail, // Pass custom header lines to Edge Function
          subjectLines, // Pass subject lines to Edge Function
          saveAsTemplate: saveAsTemplate ? {
            name: templateName,
            description: templateDescription,
            subject: emailSubject || undefined
          } : undefined,
          isHtml: true, // Content is HTML from Tiptap
          clientId: selectedClient?.id || null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Save letterId if returned
      if (data?.letterId) {
        setLastSentLetterId(data.letterId);
      }

      toast.success(`מכתב נשלח בהצלחה ל-${recipientEmails.length} נמענים`);

      // Reload templates if saved
      if (saveAsTemplate) {
        await loadSavedTemplates();
      }

    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * Validate Israeli phone number format
   * Accepts: 050-1234567, 0501234567, 050 123 4567, etc.
   * Must be 10 digits starting with 05X
   */
  const validateIsraeliPhone = (phone: string): boolean => {
    // הסרת רווחים, מקפים, סוגריים
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // ולידציה: 05X-XXXXXXX (10 ספרות)
    const regex = /^05[0-9]{8}$/;
    return regex.test(cleaned);
  };

  /**
   * Send letter via WhatsApp
   * Saves letter to database, generates public link, opens WhatsApp with message
   */
  const handleSendWhatsApp = async () => {
    // 1. Validate inputs
    if (!letterContent || letterContent.trim() === '' || letterContent === '<p></p>' || letterContent === '<p><br></p>') {
      toast.error('נא להזין תוכן למכתב');
      return;
    }

    if (!whatsappPhone) {
      toast.error('נא להזין מספר טלפון');
      return;
    }

    if (!validateIsraeliPhone(whatsappPhone)) {
      toast.error('מספר טלפון לא תקין. יש להזין מספר ישראלי (050/052/053/054/055)');
      return;
    }

    // Check correct field based on recipient mode
    const recipientName = recipientMode === 'manual' ? manualCompanyName : companyName;
    if (!recipientName.trim()) {
      toast.error('נא להזין שם נמען');
      return;
    }

    setIsSaving(true);
    try {
      // Determine correct fields based on recipient mode
      const recipientCommercialName = recipientMode === 'manual'
        ? (manualShowCommercialName ? manualCommercialName : '')
        : (showCommercialName ? commercialName : '');
      const recipientCustomHeaderLines = recipientMode === 'manual' ? manualCustomHeaderLines : customHeaderLines;

      // 2. Build letter data
      const letterData = {
        plainText: letterContent, // HTML content
        companyName: recipientName,
        commercialName: recipientCommercialName,
        customHeaderLines: recipientCustomHeaderLines,
        subjectLines,
        includesPayment,
        amount,
        emailSubject: emailSubject || 'מכתב',
        clientId: selectedClient?.id || null
      };

      // Build variables
      const variables: Record<string, string | number> = {
        company_name: recipientName,
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || '',
        commercial_name: recipientCommercialName
      };

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // 3. Generate and save letter
      const result = await templateService.generateFromCustomText({
        plainText: letterData.plainText,
        clientId: letterData.clientId!,
        groupId: recipientMode === 'group' ? selectedGroup?.id : null, // ⭐ Save group ID for group letters
        variables,
        includesPayment: letterData.includesPayment,
        customHeaderLines: letterData.customHeaderLines,
        subjectLines: subjectLines, // ✅ Pass subject lines for "הנדון" section
        subject: emailSubject || 'מכתב חדש', // Pass email subject
        saveAsTemplate: undefined,
        isHtml: true // Content is HTML from Tiptap
      });

      if (result.error || !result.data) {
        toast.error('שגיאה בשמירת המכתב');
        return;
      }

      const letterId = result.data.id;

      // 4. Update letter status to 'sent_whatsapp'
      const { error: updateError } = await supabase
        .from('generated_letters')
        .update({
          status: 'sent_whatsapp',
          sent_at: new Date().toISOString(),
          sent_via: 'whatsapp'
        })
        .eq('id', letterId);

      if (updateError) {
        console.error('Error updating letter status:', updateError);
        // Don't fail the whole operation, just log it
      }

      // 5. Generate public link to view letter
      const letterUrl = `${window.location.origin}/letters/view/${letterId}`;

      // 6. Format phone for WhatsApp (972508620993)
      const cleanPhone = whatsappPhone.replace(/[\s\-\(\)]/g, '').replace(/^0/, '');
      const whatsappNumber = `972${cleanPhone}`;

      // 7. Create WhatsApp message
      const message = encodeURIComponent(
        `שלום,\n\nשלחנו לך מכתב חשוב ממשרד רו"ח פרנקו.\n\nלצפייה במכתב: ${letterUrl}\n\nבברכה,\nצוות פרנקו`
      );

      // 8. Open WhatsApp
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
      window.open(whatsappUrl, '_blank');

      toast.success('המכתב נשמר והוואטסאפ נפתח');

    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('שגיאה בשליחת המכתב');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Add manual email to recipients list
   */
  const handleAddManualEmail = () => {
    const trimmedEmail = manualEmailInput.trim();

    if (!trimmedEmail) {
      toast.error('נא להזין כתובת מייל');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('כתובת מייל לא תקינה');
      return;
    }

    // Check if already exists
    if (selectedRecipients.includes(trimmedEmail)) {
      toast.error('כתובת מייל כבר קיימת ברשימה');
      return;
    }

    // Add to selectedRecipients
    setSelectedRecipients([...selectedRecipients, trimmedEmail]);
    setManualEmailInput('');
    setShowManualEmailInput(false);
    toast.success(`נוסף: ${trimmedEmail}`);
  };

  /**
   * Remove email from recipients list
   */
  const handleRemoveRecipient = (email: string) => {
    setSelectedRecipients(selectedRecipients.filter(e => e !== email));
    toast.success('מייל הוסר מהרשימה');
  };

  /**
   * Handle switching between client, group, and manual modes
   * Shows warning dialog if current mode has data
   */
  const handleModeSwitch = (newMode: 'client' | 'group' | 'manual') => {
    // If already in target mode, do nothing
    if (recipientMode === newMode) return;

    // Check if current mode has any data
    const hasClientData =
      selectedClient !== null ||
      companyName.trim() !== '' ||
      (recipientMode === 'client' && selectedRecipients.length > 0) ||
      customHeaderLines.length > 0;

    const hasGroupData =
      selectedGroup !== null ||
      (recipientMode === 'group' && selectedRecipients.length > 0);

    const hasManualData =
      manualCompanyName.trim() !== '' ||
      manualEmails.trim() !== '' ||
      (recipientMode === 'manual' && selectedRecipients.length > 0) ||
      manualCustomHeaderLines.length > 0;

    // Show warning if switching away from mode with data
    const shouldWarn =
      (recipientMode === 'client' && hasClientData) ||
      (recipientMode === 'group' && hasGroupData) ||
      (recipientMode === 'manual' && hasManualData);

    if (shouldWarn) {
      setPendingMode(newMode);
      setShowModeWarning(true);
    } else {
      // No data, switch directly
      setRecipientMode(newMode);
    }
  };

  /**
   * Confirm mode switch and clear data from previous mode
   */
  const confirmModeSwitch = () => {
    if (!pendingMode) return;

    // Clear data from previous mode
    if (recipientMode === 'client') {
      // Clearing client mode data
      setSelectedClient(null);
      setCompanyName('');
      setCommercialName('');
      setShowCommercialName(false);
      setCustomHeaderLines([]);
      setSelectedRecipients([]);
      setClientContacts([]);
      setWhatsappPhone('');
      setAddressLine('');
      setShowAddress(false);
    } else if (recipientMode === 'group') {
      // Clearing group mode data
      setSelectedGroup(null);
      setGroupMembers([]);
      setSelectedRecipients([]);
      setAddressLine('');
      setShowAddress(false);
    } else {
      // Clearing manual mode data
      setManualCompanyName('');
      setManualCommercialName('');
      setTaggedClientId(null);
      setManualShowCommercialName(false);
      setManualCustomHeaderLines([]);
      setManualEmails('');
      setSelectedRecipients([]);
      setAddressLine('');
      setShowAddress(false);
    }

    // Switch to new mode
    setRecipientMode(pendingMode);
    setPendingMode(null);
    setShowModeWarning(false);
    toast.success('המצב שונה בהצלחה');
  };

  /**
   * Cancel mode switch
   */
  const cancelModeSwitch = () => {
    setPendingMode(null);
    setShowModeWarning(false);
  };

  /**
   * Print/Save as PDF from preview dialog
   */
  const handlePrintPreview = () => {
    if (!previewHtml) return;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${previewHtml}
      </body>
      </html>
    `);
    iframe.contentDocument?.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    };
  };

  /**
   * Generate PDF using Browserless API
   */
  const handleGeneratePDF = async () => {
    // ✅ CRITICAL: Prevent duplicate calls - handleGeneratePDF was being called twice
    // This caused: INSERT → PDF generation → UPDATE → PDF deletion → PDF regeneration
    // Result: PDF always showed old content because UPDATE happened after first PDF
    if (generatingPdf) {
      console.log('⚠️ PDF generation already in progress, skipping duplicate call...');
      return;
    }

    // Validate content
    if (!letterContent.trim()) {
      toast.error('נא להזין טקסט למכתב');
      return;
    }

    // Validate recipient info based on mode
    if (recipientMode === 'manual' && !manualCompanyName.trim()) {
      toast.error('נא להזין שם נמען');
      return;
    }
    if (recipientMode === 'client' && !selectedClient?.id) {
      toast.error('נא לבחור לקוח');
      return;
    }
    if (recipientMode === 'group' && !selectedGroup?.id) {
      toast.error('נא לבחור קבוצה');
      return;
    }

    try {
      setGeneratingPdf(true);

      // ✅ CRITICAL: Use savedLetterId, editingLetterId, or lastSentLetterId (in priority order)
      let letterId = savedLetterId || editingLetterId || lastSentLetterId;

      // Build variables (used for both new and existing letters)
      const variables: Record<string, string | number> = {
        company_name: getRecipientName(),
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || '',
        commercial_name: showCommercialName ? commercialName : ''
      };

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // Build customHeaderLines including address if shown
      let headerLinesForPdf = [...customHeaderLines];
      if (showAddress && addressLine) {
        headerLinesForPdf = headerLinesForPdf.filter(line => line.id !== 'address-line-auto');
        headerLinesForPdf.push({
          id: 'address-line-auto',
          type: 'text' as const,
          content: addressLine,
          formatting: { bold: true, color: 'black' as const, underline: false },
          order: headerLinesForPdf.length
        });
      }

      if (!letterId) {
        // ✅ NEW LETTER: Save letter to database
        console.log('✅ Creating new letter for PDF generation');
        const result = await templateService.generateFromCustomText({
          plainText: letterContent,
          clientId: selectedClient?.id || taggedClientId || null, // ⭐ Support client tagging in manual mode
          groupId: recipientMode === 'group' ? selectedGroup?.id : null, // ⭐ Save group ID for group letters
          variables,
          includesPayment,
          customHeaderLines: headerLinesForPdf,
          subjectLines, // ✅ CRITICAL: Pass subject lines for "הנדון" section
          subject: emailSubject || 'מכתב חדש',
          saveAsTemplate: undefined,
          isHtml: true
        });

        if (result.error || !result.data) {
          toast.error('שגיאה בשמירת המכתב');
          return;
        }

        letterId = result.data.id;
        setLastSentLetterId(letterId);
        setSavedLetterId(letterId); // ✅ Also update savedLetterId for consistency
      } else {
        // ✅ EXISTING LETTER: Update content with latest changes
        console.log('🔄 Updating existing letter:', letterId);

        const updateResult = await templateService.updateLetterContent({
          letterId,
          plainText: letterContent,
          groupId: recipientMode === 'group' ? selectedGroup?.id : null, // ⭐ Save group ID for group letters
          subjectLines, // ✅ CRITICAL: Pass updated subject lines
          customHeaderLines: headerLinesForPdf,
          variables,
          includesPayment,
          isHtml: true
        });

        if (updateResult.error) {
          console.error('❌ Failed to update letter content:', updateResult.error);
          toast.error('שגיאה בעדכון המכתב');
          return;
        }

        console.log('✅ Letter content updated successfully');
      }

      // ✅ CRITICAL: Delete old PDF to force browser cache invalidation
      // This ensures the browser loads the new PDF instead of cached version
      // Old PDF is deleted from Storage before generating new one
      console.log('🗑️ Deleting old PDF from Storage...');
      await pdfService.deletePDF(letterId);

      // ✅ CRITICAL: Always force PDF regeneration to reflect latest changes
      // This is especially important for edited letters
      console.log('🔄 Generating fresh PDF for letter:', letterId);
      const pdfUrl = await pdfService.getOrGeneratePDF(letterId, true);

      // ✅ CRITICAL: Add cache-busting timestamp to force browser to reload PDF
      // Without this, browser shows cached version even after file deletion + regeneration
      // Same URL = browser cache hit, different query param = cache miss
      const urlWithTimestamp = `${pdfUrl}?t=${Date.now()}`;
      console.log('📄 Opening PDF with cache-busting URL:', urlWithTimestamp);

      toast.success('PDF מוכן להורדה');
      window.open(urlWithTimestamp, '_blank');

      // Show PDF filing dialog if there's a client or group to save to
      const hasDestination = selectedClient?.id || taggedClientId || (recipientMode === 'group' && selectedGroup?.id);
      if (hasDestination && letterId) {
        setPdfFilingData({
          letterId,
          pdfUrl,
          letterSubject: emailSubject || 'מכתב',
        });
        setShowPdfFilingDialog(true);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה ביצירת PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  /**
   * Load existing letter for editing
   */
  const loadLetterForEdit = async (letterId: string) => {
    try {
      // Fetch letter from generated_letters table
      const { data: letter, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;
      if (!letter) {
        toast.error('מכתב לא נמצא');
        return;
      }

      // Set edit mode
      setEditMode(true);
      setEditingLetterId(letterId);
      setParentLetterId(letter.parent_letter_id || letterId);
      setHasUserEditedContent(false); // Reset edit tracking when loading a letter

      // Load basic fields
      setEmailSubject(letter.subject || '');
      setCompanyName(letter.client?.company_name || '');

      // Load content - prefer body_content_html for editing (without Header/Footer/Payment)
      // This allows clean editing of only the body content in Tiptap editor
      if (letter.body_content_html) {
        let content = letter.body_content_html;

        console.log('📄 [loadLetterForEdit] Original body_content_html length:', content.length);
        console.log('📄 [loadLetterForEdit] First 500 chars:', content.substring(0, 500));

        // Strip ALL <tr><td> wrappers - may have multiple layers from old saves
        // Loop until no more wrappers are found (handles double/triple wrapping bugs)
        let strippedLayers = 0;
        const maxLayers = 5; // Safety limit

        while (strippedLayers < maxLayers) {
          const trimmed = content.trim();

          // Check if content starts with a wrapper pattern
          if (!trimmed.startsWith('<tr>') && !trimmed.startsWith('<!-- Tiptap Content -->') &&
              !trimmed.startsWith('<!-- Section Heading -->') && !trimmed.startsWith('<!-- Paragraph -->')) {
            break; // No more wrappers
          }

          // Try to extract content from <td class="letter-body-content">...</td>
          const matchWithClass = content.match(/<td[^>]*class="letter-body-content"[^>]*>([\s\S]*)<\/td>\s*<\/tr>\s*$/);
          if (matchWithClass) {
            content = matchWithClass[1];
            strippedLayers++;
            console.log('📄 [loadLetterForEdit] Stripped layer', strippedLayers, '(with class)');
            continue;
          }

          // Fallback: extract from <tr><td>...</td></tr> without class
          const matchSimple = content.match(/<tr>\s*<td[^>]*>([\s\S]*)<\/td>\s*<\/tr>\s*$/);
          if (matchSimple) {
            content = matchSimple[1];
            strippedLayers++;
            console.log('📄 [loadLetterForEdit] Stripped layer', strippedLayers, '(simple)');
            continue;
          }

          break; // No regex match, stop
        }

        console.log('📄 [loadLetterForEdit] Stripped', strippedLayers, 'wrapper layers. Length:', content.length);
        console.log('📄 [loadLetterForEdit] Content has <table>:', content.includes('<table'));

        // Store ORIGINAL content for preview/PDF (keeps styled bullets with blue stars)
        setOriginalBodyContent(content);

        // Convert table-based bullets to clean HTML for Tiptap editing
        // Old letters use tables for bullet styling - these show as ugly tables in Tiptap
        // After conversion, bullets appear as regular text that Tiptap can edit
        const convertedContent = convertBulletTablesToHtml(content);
        console.log('📄 [loadLetterForEdit] After conversion, has <table>:', convertedContent.includes('<table'));
        console.log('📄 [loadLetterForEdit] Converted content first 2000 chars:', convertedContent.substring(0, 2000));

        // LOG: Check if there are any remaining table tags and what they contain
        const tableMatches = convertedContent.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
        if (tableMatches) {
          console.log('📄 [loadLetterForEdit] Found remaining tables:', tableMatches.length);
          tableMatches.forEach((t, i) => console.log(`📄 Table ${i + 1}:`, t.substring(0, 200)));
        }

        setLetterContent(convertedContent); // ✅ Clean content for Tiptap!
      } else if (letter.generated_content_html) {
        // Fallback for old letters created before migration 101
        setLetterContent(letter.generated_content_html);
        toast.warning('מכתב זה נוצר לפני עדכון המערכת. התוכן כולל Header ו-Footer.');
      } else if (letter.generated_content_text) {
        setLetterContent(letter.generated_content_text);
      } else {
        toast.warning('לא ניתן לטעון את התוכן המקורי של המכתב. ניתן להתחיל מחדש.');
      }

      // Load subject lines if saved (variables_used contains subjectLines array)
      if (letter.variables_used?.subjectLines && Array.isArray(letter.variables_used.subjectLines)) {
        setSubjectLines(letter.variables_used.subjectLines);
      }

      // Load custom header lines if saved (variables_used contains customHeaderLines array)
      if (letter.variables_used?.customHeaderLines && Array.isArray(letter.variables_used.customHeaderLines)) {
        const savedHeaderLines = letter.variables_used.customHeaderLines;
        // Extract address line if exists
        const addressLineData = savedHeaderLines.find((line: { id: string }) => line.id === 'address-line-auto');
        if (addressLineData && addressLineData.content) {
          setAddressLine(addressLineData.content);
          setShowAddress(true);
          // Remove address from customHeaderLines (it's managed separately)
          setCustomHeaderLines(savedHeaderLines.filter((line: { id: string }) => line.id !== 'address-line-auto'));
        } else {
          setCustomHeaderLines(savedHeaderLines);
        }
      }

      // Restore recipient mode and data based on what was saved
      if (letter.group_id) {
        // GROUP MODE: Load group with members
        setRecipientMode('group');
        const { data: group, error: groupError } = await groupFeeService.getGroupWithMembers(letter.group_id);
        if (group && !groupError) {
          setSelectedGroup(group);
          // If there were specific recipients selected, restore them
          if (letter.recipient_emails && Array.isArray(letter.recipient_emails)) {
            setSelectedRecipients(letter.recipient_emails);
          }
        }
      } else if (letter.client_id) {
        // CLIENT MODE: Load client
        setRecipientMode('client');
        const { data: client } = await clientService.getById(letter.client_id);
        if (client) {
          setSelectedClient(client);

          // Auto-fill company name fields
          setCompanyName(client.company_name_hebrew || client.company_name);
          if (client.commercial_name) {
             setCommercialName(client.commercial_name);
          }

          // Restore selected recipients for this client
          if (letter.recipient_emails && Array.isArray(letter.recipient_emails)) {
            setSelectedRecipients(letter.recipient_emails);
          }
        }
      } else {
        // MANUAL MODE: No client or group - must be manual recipient mode
        // This handles cases where:
        // 1. User entered manual recipient name without adding emails
        // 2. User entered both name and emails
        setRecipientMode('manual');
        // Restore company name from variables_used
        if (letter.variables_used && typeof letter.variables_used === 'object' && 'company_name' in letter.variables_used) {
          setManualCompanyName(String((letter.variables_used as Record<string, unknown>).company_name) || '');
        }
        // Restore recipients if any were saved
        if (letter.recipient_emails && Array.isArray(letter.recipient_emails) && letter.recipient_emails.length > 0) {
          setManualEmails(letter.recipient_emails.join(', '));
          setSelectedRecipients(letter.recipient_emails);
        }
      }

      toast.success('מכתב נטען לעריכה');
    } catch (error) {
      console.error('Error loading letter for edit:', error);
      toast.error('שגיאה בטעינת המכתב לעריכה');
    }
  };

  /**
   * Handle save as template button click
   */
  const handleSaveTemplateClick = () => {
    setShowSaveTemplateDialog(true);
  };

  /**
   * Confirm save template - Save immediately to database
   */
  const handleConfirmSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('נא להזין שם לתבנית');
      return;
    }

    if (!letterContent || letterContent.trim() === '' || letterContent === '<p></p>' || letterContent === '<p><br></p>') {
      toast.error('נא להזין תוכן למכתב לפני שמירה כתבנית');
      return;
    }

    try {
      setIsSaving(true);

      // Save template immediately to database
      const { data, error } = await templateService.saveCustomBody({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        plainText: letterContent,
        includesPayment: false, // Universal letter doesn't include payment section
        subject: emailSubject || undefined, // Save email subject with template
        isHtml: true // Content is from Tiptap WYSIWYG editor
      });

      if (error) throw error;

      // Success! Reload templates list and clear dialog
      await loadSavedTemplates();
      setShowSaveTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      setSaveAsTemplate(false); // Clear the flag since we saved immediately

      toast.success(`התבנית "${data?.name}" נשמרה בהצלחה!`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Custom Header Lines Handlers
   */
  const handleAddTextLine = () => {
    const newLine: import('../types/letter.types').CustomHeaderLine = {
      id: `line-${Date.now()}`,
      type: 'text',
      content: '',
      formatting: {
        bold: true,
        color: 'black',
        underline: false
      },
      order: customHeaderLines.length
    };
    setCustomHeaderLines([...customHeaderLines, newLine]);
  };

  const handleAddSeparatorLine = () => {
    const newLine: import('../types/letter.types').CustomHeaderLine = {
      id: `line-${Date.now()}`,
      type: 'line',
      order: customHeaderLines.length
    };
    setCustomHeaderLines([...customHeaderLines, newLine]);
  };

  const handleDeleteLine = (id: string) => {
    const updated = customHeaderLines
      .filter(line => line.id !== id)
      .map((line, index) => ({ ...line, order: index })); // Re-index
    setCustomHeaderLines(updated);
  };

  const handleMoveLineUp = (id: string) => {
    const index = customHeaderLines.findIndex(line => line.id === id);
    if (index <= 0) return; // Already at top

    const updated = [...customHeaderLines];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setCustomHeaderLines(updated);
  };

  const handleMoveLineDown = (id: string) => {
    const index = customHeaderLines.findIndex(line => line.id === id);
    if (index >= customHeaderLines.length - 1) return; // Already at bottom

    const updated = [...customHeaderLines];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setCustomHeaderLines(updated);
  };

  const handleUpdateLineContent = (id: string, content: string) => {
    setCustomHeaderLines(customHeaderLines.map(line =>
      line.id === id ? { ...line, content } : line
    ));
  };

  const handleUpdateLineFormatting = (
    id: string,
    key: 'bold' | 'underline',
    value: boolean
  ) => {
    setCustomHeaderLines(customHeaderLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, [key]: value }
        };
      }
      return line;
    }));
  };

  const handleUpdateLineColor = (
    id: string,
    color: 'red' | 'blue' | 'black'
  ) => {
    setCustomHeaderLines(customHeaderLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, color }
        };
      }
      return line;
    }));
  };

  /**
   * Subject Lines Handlers (הנדון)
   */
  const handleAddSubjectLine = () => {
    const newLine: import('../types/letter.types').SubjectLine = {
      id: `subject-${Date.now()}`,
      content: '',
      formatting: {
        bold: true,
        underline: false,
        color: 'blue'
      },
      order: subjectLines.length
    };
    setSubjectLines([...subjectLines, newLine]);
  };

  const handleDeleteSubjectLine = (id: string) => {
    // מניעת מחיקת השורה הראשונה
    const lineToDelete = subjectLines.find(line => line.id === id);
    if (lineToDelete && lineToDelete.order === 0) {
      toast.error('לא ניתן למחוק את שורת ההנדון הראשונה');
      return;
    }

    const updated = subjectLines
      .filter(line => line.id !== id)
      .map((line, index) => ({ ...line, order: index })); // Re-index
    setSubjectLines(updated);
  };

  const handleMoveSubjectLineUp = (id: string) => {
    const index = subjectLines.findIndex(line => line.id === id);
    if (index <= 0) return; // Already at top

    const updated = [...subjectLines];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setSubjectLines(updated);
  };

  const handleMoveSubjectLineDown = (id: string) => {
    const index = subjectLines.findIndex(line => line.id === id);
    if (index >= subjectLines.length - 1) return; // Already at bottom

    const updated = [...subjectLines];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setSubjectLines(updated);
  };

  const handleUpdateSubjectLineContent = (id: string, content: string) => {
    // Mark as manually edited if user edits the first subject line
    const line = subjectLines.find(l => l.id === id);
    if (line && line.order === 0) {
      setUserEditedSubjectLine(true);
    }

    setSubjectLines(subjectLines.map(line =>
      line.id === id ? { ...line, content } : line
    ));
  };

  const handleUpdateSubjectLineFormatting = (
    id: string,
    key: 'bold' | 'underline',
    value: boolean
  ) => {
    setSubjectLines(subjectLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, [key]: value }
        };
      }
      return line;
    }));
  };

  const handleUpdateSubjectLineColor = (
    id: string,
    color: 'red' | 'blue' | 'black'
  ) => {
    setSubjectLines(subjectLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, color }
        };
      }
      return line;
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Edit Mode Banner */}
      {editMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-right text-blue-800">
            <strong>מצב עריכה:</strong> אתה עורך גרסה חדשה של מכתב קיים.
            {parentLetterId && ' שמירה תיצור גרסה חדשה (version) ותשמור את המקור.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Builder Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בונה מכתבים אוניברסלי</CardTitle>
          <CardDescription className="text-right">
            כתוב מכתב בטקסט פשוט עם סימוני Markdown והמערכת תעצב אותו אוטומטית
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Email Subject + Template Selection - Two Columns */}
          <div>
            <Label className="text-right rtl:text-right block text-base font-semibold mb-4">
              1. נושא המייל ובחירת תבנית
            </Label>

            <div className="grid grid-cols-2 gap-4">
              {/* RIGHT COLUMN: Email Subject */}
              <div>
                <Label htmlFor="email_subject" className="text-right rtl:text-right block text-sm font-medium mb-2">
                  נושא המייל <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email_subject"
                  value={emailSubject}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setEmailSubject(newValue);

                    // Copy to subject line as long as user hasn't manually edited it
                    if (!userEditedSubjectLine) {
                      setSubjectLines(subjectLines.map(line =>
                        line.order === 0 ? { ...line, content: newValue } : line
                      ));
                    }
                  }}
                  placeholder="שכר טרחתנו לשנת המס 2026"
                  dir="rtl"
                  required
                />
              </div>

              {/* LEFT COLUMN: Template Selection */}
              <div>
                <Label className="text-right rtl:text-right block text-sm font-medium mb-2">
                  בחר תבנית שמורה (אופציונלי)
                </Label>
                <div className="flex gap-2 rtl:flex-row-reverse">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={handleLoadTemplate}
                    disabled={savedTemplates.length === 0}
                  >
                    <SelectTrigger dir="rtl" className="flex-1">
                      <SelectValue placeholder={savedTemplates.length > 0 ? "בחר תבנית..." : "אין תבניות שמורות"} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {savedTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteTemplate(selectedTemplateId)}
                      title="מחק תבנית"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Three-Column Layout - Client vs Group vs Manual */}
          <div className="space-y-4">
            <Label className="text-right rtl:text-right block text-base font-semibold">
              2. בחר לקוח, קבוצה או הזן נמען אחר
            </Label>

            {/* Three-Column Grid */}
            <div className="grid grid-cols-3 gap-4">

              {/* RIGHT COLUMN: Client from List */}
              <div
                onClick={() => handleModeSwitch('client')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientMode === 'client'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-100 opacity-60'
                }`}
              >
                <h3 className="text-lg font-semibold mb-3 text-right rtl:text-right flex items-center justify-end gap-2 rtl:flex-row-reverse">
                  <Building2 className="h-5 w-5" />
                  לקוח בודד
                </h3>

                <div className={recipientMode !== 'client' ? 'pointer-events-none' : ''}>
                  {/* Client Selector */}
                  <div className="space-y-4">
                    <ClientSelector
                      value={selectedClient?.id || null}
                      onChange={handleClientChange}
                      label="בחר לקוח"
                      placeholder="חפש לפי שם או ח.פ..."
                    />

                    {/* Company Name */}
                    <div>
                      <Label htmlFor="company_name" className="text-right block">
                        שם החברה {selectedClient && <span className="text-xs text-blue-600 mr-1">(נבחר אוטומטית)</span>}
                      </Label>
                      <Input
                        id="company_name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="שם החברה"
                        dir="rtl"
                        disabled={recipientMode !== 'client'}
                      />
                    </div>

                    {/* Commercial Name */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="show_commercial_name"
                          checked={showCommercialName}
                          onCheckedChange={(checked) => setShowCommercialName(checked as boolean)}
                          disabled={recipientMode !== 'client'}
                        />
                        <Label htmlFor="show_commercial_name" className="text-right cursor-pointer">
                          הוסף שם מסחרי
                        </Label>
                      </div>

                      {showCommercialName && (
                        <div>
                          <Input
                            id="commercial_name"
                            value={commercialName}
                            onChange={(e) => setCommercialName(e.target.value)}
                            placeholder="הזן שם מסחרי"
                            dir="rtl"
                            disabled={recipientMode !== 'client'}
                          />
                        </div>
                      )}
                    </div>

                    {/* Address Line */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="show_address"
                          checked={showAddress}
                          onCheckedChange={(checked) => setShowAddress(checked as boolean)}
                          disabled={recipientMode !== 'client'}
                        />
                        <Label htmlFor="show_address" className="text-right cursor-pointer">
                          הוסף כתובת
                        </Label>
                        {selectedClient?.address && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const addr = selectedClient.address;
                              const formatted = [addr?.street, addr?.city, addr?.postal_code].filter(Boolean).join(', ');
                              setAddressLine(formatted);
                              setShowAddress(true);
                            }}
                            disabled={recipientMode !== 'client'}
                          >
                            הכנס מהלקוח
                          </Button>
                        )}
                      </div>

                      {showAddress && (
                        <div>
                          <Input
                            id="address_line"
                            value={addressLine}
                            onChange={(e) => setAddressLine(e.target.value)}
                            placeholder="רחוב, עיר, מיקוד"
                            dir="rtl"
                            disabled={recipientMode !== 'client'}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE COLUMN: Group Selection */}
              <div
                onClick={() => handleModeSwitch('group')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientMode === 'group'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-100 opacity-60'
                }`}
              >
                <h3 className="text-lg font-semibold mb-3 text-right rtl:text-right flex items-center justify-end gap-2 rtl:flex-row-reverse">
                  <Users className="h-5 w-5" />
                  קבוצה
                </h3>

                <div className={recipientMode !== 'group' ? 'pointer-events-none' : ''}>
                  <div className="space-y-4">
                    {/* Group Selector */}
                    {isLoadingGroups ? (
                      <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">טוען קבוצות...</span>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-right block mb-2 text-base">בחר קבוצה</Label>
                        <Combobox
                          options={groups.map((group) => ({
                            value: group.id,
                            label: `${group.group_name_hebrew} (${group.member_count || group.clients?.length || 0} חברות)`,
                          }))}
                          value={selectedGroup?.id || undefined}
                          onValueChange={(groupId) => {
                            const group = groups.find(g => g.id === groupId);
                            handleGroupChange(group || null);
                          }}
                          placeholder="בחר קבוצה מהרשימה..."
                          searchPlaceholder="חיפוש קבוצה..."
                          emptyText="לא נמצאה קבוצה"
                          disabled={recipientMode !== 'group'}
                        />
                        {groups.length === 0 && !isLoadingGroups && (
                          <p className="text-sm text-gray-500 text-right mt-2">
                            אין קבוצות לקוחות במערכת.{' '}
                            <a href="/client-groups" className="text-blue-600 hover:underline">
                              צור קבוצה חדשה
                            </a>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Group Members Display */}
                    {selectedGroup && (
                      <div className="mt-3">
                        <GroupMembersList
                          groupId={selectedGroup.id}
                          compact={true}
                          showHeader={false}
                        />
                      </div>
                    )}

                    {/* Group Address Line */}
                    {selectedGroup && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="show_group_address"
                            checked={showAddress}
                            onCheckedChange={(checked) => setShowAddress(checked as boolean)}
                          />
                          <Label htmlFor="show_group_address" className="text-right cursor-pointer">
                            הוסף כתובת
                          </Label>
                          {selectedGroup?.address && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const addr = selectedGroup.address;
                                const formatted = [addr?.street, addr?.city, addr?.postal_code].filter(Boolean).join(', ');
                                setAddressLine(formatted);
                                setShowAddress(true);
                              }}
                            >
                              הכנס מהקבוצה
                            </Button>
                          )}
                        </div>

                        {showAddress && (
                          <div>
                            <Input
                              id="group_address_line"
                              value={addressLine}
                              onChange={(e) => setAddressLine(e.target.value)}
                              placeholder="רחוב, עיר, מיקוד"
                              dir="rtl"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recipients from group */}
                    {selectedGroup && selectedRecipients.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <Label className="text-sm font-semibold text-green-900 mb-2 block text-right">
                          נמענים מהקבוצה ({selectedRecipients.length}):
                        </Label>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {selectedRecipients.slice(0, 10).map((email) => (
                            <span
                              key={email}
                              className="inline-flex items-center bg-white px-2 py-0.5 rounded-full border text-xs"
                            >
                              {email}
                            </span>
                          ))}
                          {selectedRecipients.length > 10 && (
                            <span className="text-xs text-gray-500">
                              +{selectedRecipients.length - 10} נוספים
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LEFT COLUMN: Manual Recipient */}
              <div
                onClick={() => handleModeSwitch('manual')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  recipientMode === 'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-100 opacity-60'
                }`}
              >
                <h3 className="text-lg font-semibold mb-3 text-right rtl:text-right flex items-center justify-end gap-2 rtl:flex-row-reverse">
                  <UserPlus className="h-5 w-5" />
                  נמען אחר
                </h3>

                <div className={recipientMode !== 'manual' ? 'pointer-events-none' : ''}>
                  <div className="space-y-4">
                    {/* Manual Company Name */}
                    <div>
                      <Label htmlFor="manual_company_name" className="text-right block text-base">
                        שם הנמען
                      </Label>
                      <Input
                        id="manual_company_name"
                        value={manualCompanyName}
                        onChange={(e) => setManualCompanyName(e.target.value)}
                        placeholder="הזן שם נמען"
                        dir="rtl"
                        disabled={recipientMode !== 'manual'}
                      />
                    </div>

                    {/* ⭐ NEW: Client Tagging for Manual Letters */}
                    <div className={recipientMode !== 'manual' ? 'opacity-50 pointer-events-none' : ''}>
                      <Label className="text-right block mb-2">
                        קשור ללקוח (אופציונלי)
                        <span className="text-xs text-gray-500 mr-1">- לשיוך המכתב להיסטוריה של לקוח</span>
                      </Label>
                      <ClientSelector
                        value={taggedClientId}
                        onChange={(client) => setTaggedClientId(client?.id || null)}
                        label=""
                        placeholder="בחר לקוח לשיוך המכתב (אופציונלי)..."
                      />
                      {taggedClientId && (
                        <p className="text-xs text-blue-600 mt-1 text-right">
                          ✓ המכתב ישוייך ללקוח ויופיע בהיסטוריה שלו
                        </p>
                      )}
                    </div>

                    {/* Manual Email Recipients */}
                    {/* Manual Email Addition - Same UX as client mode */}
                    <div className="space-y-3">
                      <Label className="text-right block">
                        כתובות מייל
                      </Label>

                      {/* Add Email Button */}
                      {!showManualEmailInput ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowManualEmailInput(true)}
                          className="w-full"
                          disabled={recipientMode !== 'manual'}
                        >
                          <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          הוסף מייל
                        </Button>
                      ) : (
                        // Input for manual email
                        <div className="flex gap-2">
                          <Input
                            type="email"
                            value={manualEmailInput}
                            onChange={(e) => setManualEmailInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddManualEmail();
                              }
                            }}
                            placeholder="example@email.com"
                            dir="ltr"
                            className="flex-1 text-left"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddManualEmail}
                          >
                            הוסף
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowManualEmailInput(false);
                              setManualEmailInput('');
                            }}
                          >
                            ביטול
                          </Button>
                        </div>
                      )}

                      {/* Display manually added emails */}
                      {selectedRecipients.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <Label className="text-sm font-semibold text-blue-900 mb-2 block text-right">
                            נמענים שנבחרו ({selectedRecipients.length}):
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedRecipients.map((email) => (
                              <div
                                key={email}
                                className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border text-sm"
                              >
                                <span className="text-gray-700">{email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipient(email)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Custom Header Lines - Step 3 */}
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-right rtl:text-right block text-base font-semibold">
                  3. שורות נוספות מתחת לשם הנמען (אופציונלי)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTextLine}
                  >
                    <Plus className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
                    הוסף שורת טקסט
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSeparatorLine}
                  >
                    <Minus className="h-4 w-4 ml-1" />
                    הוסף קו מפריד
                  </Button>
                </div>
              </div>

              {customHeaderLines.length === 0 ? (
                <p className="text-sm text-gray-500 text-right">
                  לחץ על "הוסף שורת טקסט" או "הוסף קו מפריד" כדי להוסיף שורות מותאמות
                </p>
              ) : (
                <div className="space-y-2">
                  {customHeaderLines.map((line, index) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 p-3 bg-white border rounded"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveLineUp(line.id)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveLineDown(line.id)}
                          disabled={index === customHeaderLines.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1">
                        {line.type === 'line' ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Minus className="h-4 w-4" />
                            <span className="text-sm">קו מפריד</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              value={line.content || ''}
                              onChange={(e) => handleUpdateLineContent(line.id, e.target.value)}
                              placeholder="הזן טקסט..."
                              dir="rtl"
                            />
                            <div className="flex gap-3 items-center">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${line.id}-bold`}
                                  checked={line.formatting?.bold || false}
                                  onCheckedChange={(checked) => handleUpdateLineFormatting(line.id, 'bold', !!checked)}
                                />
                                <Label htmlFor={`${line.id}-bold`} className="text-sm">בולד</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${line.id}-underline`}
                                  checked={line.formatting?.underline || false}
                                  onCheckedChange={(checked) => handleUpdateLineFormatting(line.id, 'underline', !!checked)}
                                />
                                <Label htmlFor={`${line.id}-underline`} className="text-sm">קו תחתון</Label>
                              </div>
                              <Button type="button" size="sm" variant={line.formatting?.color === 'black' ? 'default' : 'outline'} onClick={() => handleUpdateLineColor(line.id, 'black')}>שחור</Button>
                              <Button type="button" size="sm" variant={line.formatting?.color === 'red' ? 'default' : 'outline'} onClick={() => handleUpdateLineColor(line.id, 'red')} className="text-red-600">אדום</Button>
                              <Button type="button" size="sm" variant={line.formatting?.color === 'blue' ? 'default' : 'outline'} onClick={() => handleUpdateLineColor(line.id, 'blue')} className="text-blue-600">כחול</Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteLine(line.id)} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Lines Section (הנדון) - Step 4 */}
            <div className="mt-4 p-4 border rounded-lg bg-blue-50">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-right rtl:text-right block text-base font-semibold">
                  4. שורות הנדון (26px)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubjectLine}
                >
                  <Plus className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
                  הוסף שורת הנדון
                </Button>
              </div>

              <div className="space-y-2">
                {subjectLines.map((line, index) => {
                  const isFirstLine = line.order === 0;

                  return (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 p-3 bg-white border rounded"
                    >
                      {/* Move Up/Down Buttons */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSubjectLineUp(line.id)}
                          disabled={index === 0}
                          title="הזז למעלה"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSubjectLineDown(line.id)}
                          disabled={index === subjectLines.length - 1}
                          title="הזז למטה"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Line Content */}
                      <div className="flex-1">
                        <div className="space-y-2">
                          {/* שורה ראשונה עם Label "הנדון:" */}
                          {isFirstLine && (
                            <div className="flex flex-col gap-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="font-bold text-blue-600 text-lg whitespace-nowrap">
                                  הנדון:
                                </Label>
                                <Input
                                  value={line.content}
                                  onChange={(e) => handleUpdateSubjectLineContent(line.id, e.target.value)}
                                  placeholder="הזן נושא המכתב (דוגמה: עדכון שכר טרחה לשנת 2026)"
                                  dir="rtl"
                                  className="flex-1 text-right"
                                  maxLength={70}
                                />
                              </div>
                              <span className="text-xs text-gray-400 text-left">{line.content.length}/70</span>
                            </div>
                          )}

                          {/* שורות נוספות - ללא Label */}
                          {!isFirstLine && (
                            <div className="flex flex-col gap-1 flex-1">
                              <Input
                                value={line.content}
                                onChange={(e) => handleUpdateSubjectLineContent(line.id, e.target.value)}
                                placeholder="שורה נוספת (תתיישר מתחת לטקסט)"
                                dir="rtl"
                                className="text-right mr-14"
                                maxLength={70}
                              />
                              <span className="text-xs text-gray-400 text-left">{line.content.length}/70</span>
                            </div>
                          )}

                          {/* Formatting Options - Bold & Underline only */}
                          <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`${line.id}-bold`}
                                checked={line.formatting?.bold || false}
                                onCheckedChange={(checked) =>
                                  handleUpdateSubjectLineFormatting(line.id, 'bold', !!checked)
                                }
                              />
                              <Label htmlFor={`${line.id}-bold`} className="text-sm cursor-pointer">
                                בולד
                              </Label>
                            </div>

                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`${line.id}-underline`}
                                checked={line.formatting?.underline || false}
                                onCheckedChange={(checked) =>
                                  handleUpdateSubjectLineFormatting(line.id, 'underline', !!checked)
                                }
                              />
                              <Label htmlFor={`${line.id}-underline`} className="text-sm cursor-pointer">
                                קו תחתון
                              </Label>
                            </div>

                            <Button type="button" size="sm" variant={line.formatting?.color === 'black' ? 'default' : 'outline'} onClick={() => handleUpdateSubjectLineColor(line.id, 'black')}>שחור</Button>
                            <Button type="button" size="sm" variant={line.formatting?.color === 'red' ? 'default' : 'outline'} onClick={() => handleUpdateSubjectLineColor(line.id, 'red')} className="text-red-600">אדום</Button>
                            <Button type="button" size="sm" variant={line.formatting?.color === 'blue' ? 'default' : 'outline'} onClick={() => handleUpdateSubjectLineColor(line.id, 'blue')} className="text-blue-600">כחול</Button>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant={isFirstLine ? "ghost" : "destructive"}
                        size="sm"
                        onClick={() => handleDeleteSubjectLine(line.id)}
                        disabled={isFirstLine}
                        title={isFirstLine ? "לא ניתן למחוק את שורת ההנדון הראשונה" : "מחק שורה"}
                        className={`h-8 w-8 p-0 ${isFirstLine ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}

                {/* Tip for users */}
                <p className="text-xs text-blue-600 text-right mt-2">
                  💡 <strong>טיפ:</strong> השורה הראשונה תתחיל עם "הנדון:" אוטומטית. שורות נוספות יתיישרו מתחת לטקסט.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Letter Content with TiptapEditor */}
          <div className="space-y-2">
            <Label className="text-right rtl:text-right block text-base font-semibold">
              5. כתוב את תוכן המכתב
            </Label>
            <TiptapEditor
              value={letterContent}
              onChange={(content) => {
                setLetterContent(content);
                // Mark content as edited when user makes changes
                if (!hasUserEditedContent && originalBodyContent) {
                  setHasUserEditedContent(true);
                }
              }}
              placeholder="הקלד את תוכן המכתב..."
              minHeight="400px"
            />
          </div>

          {/* Step 6: Payment Section - DISABLED + Save Template Button */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-right rtl:text-right block text-base font-semibold opacity-50">
                6. הגדרות תשלום (בפיתוח)
              </Label>

              {/* Save Template Button - LEFT SIDE */}
              <div className="ltr:ml-auto rtl:mr-auto">
                <Button
                  onClick={handleSaveTemplateClick}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                  שמור כתבנית
                </Button>
                {saveAsTemplate && (
                  <p className="text-xs text-green-600 mt-1">✓ התבנית תישמר</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-50 pointer-events-none">
              <Checkbox
                id="includes_payment"
                checked={false}
                disabled
              />
              <Label htmlFor="includes_payment" className="text-right rtl:text-right text-muted-foreground">
                כלול סעיף תשלום (בפיתוח - בקרוב)
              </Label>
            </div>
          </div>

          {/* Steps 7-10: Combined into 4-Column Grid */}
          <div className="space-y-4">
            <Label className="text-right rtl:text-right block text-base font-semibold">
              7. שמירה, תצוגה מקדימה, שליחה
            </Label>

            {/* Overall border container */}
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50/30">
              <div className="grid grid-cols-4 gap-4">
                {/* COLUMN 1 (RIGHT in RTL): Save as PDF */}
                <div className="space-y-4 border-2 border-blue-200 rounded-lg p-3 bg-blue-50/30">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">שמור כ-PDF</h3>

                <Button
                  onClick={handleGeneratePDF}
                  disabled={generatingPdf || !letterContent.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                      יוצר PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      שמור PDF
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-600 text-right">
                  המכתב יישמר אוטומטית לפני יצירת PDF
                </p>
              </div>

              {/* COLUMN 2: Preview */}
              <div className="space-y-4 border-2 border-purple-200 rounded-lg p-3 bg-purple-50/30">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">תצוגה מקדימה</h3>

                <Button
                  onClick={handlePreview}
                  disabled={isLoadingPreview || !letterContent.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {isLoadingPreview ? (
                    <>
                      <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                      טוען...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      הצג תצוגה
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSaveLetter}
                  disabled={isSaving || !letterContent.trim()}
                  variant="default"
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      שמור מכתב
                    </>
                  )}
                </Button>

                {savedLetterId && (
                  <p className="text-xs text-green-600 text-center">
                    ✓ המכתב נשמר בהיסטוריה
                  </p>
                )}
              </div>

              {/* COLUMN 3: Email Recipients + Send Email */}
              <div className="space-y-4 border-2 border-blue-200 rounded-lg p-3 bg-blue-50/30">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">נמעני מייל</h3>

                {recipientMode === 'client' && selectedClient && (
                  <>
                    {isLoadingContacts ? (
                      <div className="text-center py-4 text-gray-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-xs">טוען אנשי קשר...</p>
                      </div>
                    ) : clientContacts.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-right text-xs">
                          לא נמצאו אנשי קשר. הוסף בטופס הלקוח.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                          <div className="space-y-2">
                            {/* Client contacts with checkboxes */}
                            {clientContacts.map((contact) => {
                              const isChecked = selectedRecipients.includes(contact.email!);
                              return (
                                <div
                                  key={contact.id}
                                  className="flex items-start gap-2 p-2 bg-white hover:bg-gray-50 rounded border"
                                >
                                  <Checkbox
                                    id={`univ-rec-${contact.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedRecipients([...selectedRecipients, contact.email!]);
                                      } else {
                                        setSelectedRecipients(selectedRecipients.filter(e => e !== contact.email));
                                      }
                                    }}
                                    className="mt-0.5"
                                  />
                                  <Label
                                    htmlFor={`univ-rec-${contact.id}`}
                                    className="flex-1 cursor-pointer text-right"
                                  >
                                    <div className="font-medium text-xs truncate">{contact.full_name}</div>
                                    <div className="text-xs text-gray-600 truncate">{contact.email}</div>
                                  </Label>
                                </div>
                              );
                            })}

                            {/* Manually added emails as chips */}
                            {selectedRecipients
                              .filter(email => !clientContacts.some(c => c.email === email))
                              .map((email) => (
                                <span
                                  key={email}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-xs"
                                >
                                  <span dir="ltr">{email}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecipients(selectedRecipients.filter(e => e !== email))}
                                    className="text-blue-500 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                                    title="הסר מייל"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 text-right">
                          <strong>{selectedRecipients.length}</strong> נבחרו
                        </p>
                      </>
                    )}
                  </>
                )}

                {/* Manual Email Addition */}
                <div className="space-y-2">
                  {!showManualEmailInput ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualEmailInput(true)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      הוסף מייל
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={manualEmailInput}
                        onChange={(e) => setManualEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualEmail();
                          }
                        }}
                        placeholder="email@example.com"
                        dir="ltr"
                        className="flex-1 text-left text-xs"
                      />
                      <Button type="button" size="sm" onClick={handleAddManualEmail}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowManualEmailInput(false);
                          setManualEmailInput('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Send Email Button */}
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !letterContent.trim() || selectedRecipients.length === 0}
                  className="w-full"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      שלח ({selectedRecipients.length})
                    </>
                  )}
                </Button>
              </div>

              {/* COLUMN 4 (LEFT in RTL): WhatsApp */}
              <div className="space-y-4 border-2 border-purple-200 rounded-lg p-3 bg-purple-50/30">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">וואטסאפ</h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="whatsapp_phone" className="text-right rtl:text-right block text-xs mb-1">
                      מספר טלפון
                    </Label>
                    <Input
                      id="whatsapp_phone"
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      dir="ltr"
                      className="text-left font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-right rtl:text-right">
                      050-XXXXXXX
                    </p>
                  </div>

                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={isSaving || !whatsappPhone || !letterContent.trim()}
                    variant="default"
                    className="w-full"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                        שומר...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                        שלח
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Client Documents Section */}
          {selectedClient && (
            <div className="space-y-4 border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold rtl:text-right">מסמכי לקוח רלוונטיים</h3>

              {/* Financial Reports */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 rtl:text-right">דוחות כספיים</h4>
                <FileDisplayWidget
                  clientId={selectedClient.id}
                  category="financial_report"
                  variant="compact"
                />
              </div>

              {/* Quotes and Invoices */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 rtl:text-right">הצעות מחיר וחשבוניות</h4>
                <FileDisplayWidget
                  clientId={selectedClient.id}
                  category="quote_invoice"
                  variant="compact"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה - מכתב מותאם אישית</DialogTitle>
            <DialogDescription className="text-right">
              המכתב המלא כולל: Header, Custom Body{includesPayment && ', Payment Section'}, Footer
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }}>
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className="select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              סגור
            </Button>
            <Button variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf}>
              {generatingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  יוצר PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 ml-2" />
                  שמור PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mode Switch Warning Dialog */}
      <AlertDialog open={showModeWarning} onOpenChange={setShowModeWarning}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right rtl:text-right">שימו לב: מעבר בין מצבים</AlertDialogTitle>
            <AlertDialogDescription className="text-right rtl:text-right">
              מעבר מ{recipientMode === 'client' ? 'לקוח מהרשימה' : 'נמען אחר'} ל{pendingMode === 'client' ? 'לקוח מהרשימה' : 'נמען אחר'}
              {' '}ינקה את כל הנתונים שמילאת במצב הנוכחי.
              <br /><br />
              <strong>האם ברצונך להמשיך?</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel onClick={cancelModeSwitch}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmModeSwitch}>המשך ונקה נתונים</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right rtl:text-right">שמור כתבנית</DialogTitle>
            <DialogDescription className="text-right rtl:text-right">
              הזן שם ותיאור לתבנית. התבנית תישמר עם שליחת המכתב.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template_name" className="text-right rtl:text-right block">
                שם התבנית <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template_name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="מכתב עדכון שנתי"
                dir="rtl"
                required
              />
            </div>
            <div>
              <Label htmlFor="template_description" className="text-right rtl:text-right block">
                תיאור (אופציונלי)
              </Label>
              <Input
                id="template_description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="מכתב סטנדרטי לעדכון לקוחות"
                dir="rtl"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end rtl:flex-row-reverse mt-4">
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)} disabled={isSaving}>
              ביטול
            </Button>
            <Button onClick={handleConfirmSaveTemplate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  אישור
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Filing Dialog */}
      {pdfFilingData && (
        <PdfFilingDialog
          open={showPdfFilingDialog}
          onOpenChange={setShowPdfFilingDialog}
          letterId={pdfFilingData.letterId}
          clientId={selectedClient?.id || taggedClientId || null}
          groupId={recipientMode === 'group' ? selectedGroup?.id || null : null}
          clientName={selectedClient?.company_name}
          groupName={selectedGroup?.group_name_hebrew || selectedGroup?.group_name}
          pdfUrl={pdfFilingData.pdfUrl}
          letterSubject={pdfFilingData.letterSubject}
          onSuccess={() => {
            setPdfFilingData(null);
          }}
        />
      )}
    </div>
  );
}
