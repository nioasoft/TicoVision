/**
 * Template Importer
 * Imports the 11 letter templates from files to database
 */

import type { LetterTemplate, LetterTemplateType } from '../types/letter.types';

interface TemplateDefinition {
  type: LetterTemplateType;
  fileName: string;
  name: string;
  nameHebrew: string;
  subject: string;
  category: 'external' | 'internal_audit' | 'retainer' | 'internal_bookkeeping';
  feeChangeType: 'index' | 'real' | 'agreed';
}

export class TemplateImporter {
  // Define the 11 templates
  static readonly TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
    // External clients (A-C)
    {
      type: 'external_index_only',
      fileName: 'A - חיצוניים - שינוי מדד',
      name: 'External - Index Change Only',
      nameHebrew: 'חיצוניים - שינוי מדד בלבד',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'external',
      feeChangeType: 'index'
    },
    {
      type: 'external_real_change',
      fileName: 'B - חיצוניים - שינוי ריאלי',
      name: 'External - Real Change',
      nameHebrew: 'חיצוניים - שינוי ריאלי',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'external',
      feeChangeType: 'real'
    },
    {
      type: 'external_as_agreed',
      fileName: 'C - חיצוניים - כמוסכם',
      name: 'External - As Agreed',
      nameHebrew: 'חיצוניים - כמוסכם',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'external',
      feeChangeType: 'agreed'
    },
    // Internal audit (D1-D3)
    {
      type: 'internal_audit_index',
      fileName: 'D1 - פנימי - ראיית חשבון - שינוי מדד',
      name: 'Internal Audit - Index Change',
      nameHebrew: 'פנימי ראיית חשבון - שינוי מדד',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_audit',
      feeChangeType: 'index'
    },
    {
      type: 'internal_audit_real',
      fileName: 'D2 - פנימי - ראיית חשבון - ריאלי',
      name: 'Internal Audit - Real Change',
      nameHebrew: 'פנימי ראיית חשבון - שינוי ריאלי',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_audit',
      feeChangeType: 'real'
    },
    {
      type: 'internal_audit_agreed',
      fileName: 'D3 - פנימי - ראיית חשבון - כמוסכם',
      name: 'Internal Audit - As Agreed',
      nameHebrew: 'פנימי ראיית חשבון - כמוסכם',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_audit',
      feeChangeType: 'agreed'
    },
    // Retainer (E1-E2)
    {
      type: 'retainer_index',
      fileName: 'E1 - ריטיינר - שינוי מדד',
      name: 'Retainer - Index Change',
      nameHebrew: 'ריטיינר - שינוי מדד',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'retainer',
      feeChangeType: 'index'
    },
    {
      type: 'retainer_real',
      fileName: 'E2 - ריטיינר - שינוי ריאלי',
      name: 'Retainer - Real Change',
      nameHebrew: 'ריטיינר - שינוי ריאלי',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי ראיית חשבון ואופן תשלומו ; לשנת המס 2025',
      category: 'retainer',
      feeChangeType: 'real'
    },
    // Internal bookkeeping (F1-F3)
    {
      type: 'internal_bookkeeping_index',
      fileName: 'F1 - פנימי - שירותי הנהלת חשבונות - שינוי מדד',
      name: 'Internal Bookkeeping - Index Change',
      nameHebrew: 'פנימי הנהלת חשבונות - שינוי מדד',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי הנהלת חשבונות ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_bookkeeping',
      feeChangeType: 'index'
    },
    {
      type: 'internal_bookkeeping_real',
      fileName: 'F2 - פנימי שירותי הנהלת חשובנות - שינוי ריאלי',
      name: 'Internal Bookkeeping - Real Change',
      nameHebrew: 'פנימי הנהלת חשבונות - שינוי ריאלי',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי הנהלת חשבונות ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_bookkeeping',
      feeChangeType: 'real'
    },
    {
      type: 'internal_bookkeeping_agreed',
      fileName: 'F3 - פנימי - שירותי הנהלת חשבונות - כמוסכם',
      name: 'Internal Bookkeeping - As Agreed',
      nameHebrew: 'פנימי הנהלת חשבונות - כמוסכם',
      subject: 'שכר טרחתנו (כמדי תחילת שנה) בעבור שירותי הנהלת חשבונות ואופן תשלומו ; לשנת המס 2025',
      category: 'internal_bookkeeping',
      feeChangeType: 'agreed'
    }
  ];

  /**
   * Get template HTML content based on the template from the original letters
   * This is a simplified version - in production, you would parse the actual DOCX files
   */
  static getTemplateContent(definition: TemplateDefinition): string {
    // Common header for all templates
    const header = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e40af; font-family: 'Assistant', sans-serif;">TICO FRANCO & CO</h2>
        <p style="color: #64748b;">Certified Public Accountants Isr.</p>
      </div>
    `;

    // Common greeting
    const greeting = `
      <div style="margin-bottom: 20px;">
        <p>[תאריך]</p>
        <p style="font-weight: bold;">תל אביב</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p>לכבוד</p>
        <p style="font-weight: bold;">[שם]</p>
        <p>[קבוצה]</p>
        <p style="font-style: italic;">[סוג הודעה]</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="font-weight: bold; text-decoration: underline;">
          הנדון: ${definition.subject}
        </p>
      </div>
    `;

    // Opening paragraph
    const opening = `
      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold;">בפתח הדברים, ברצוננו:</p>
        <ul>
          <li>להודות לכם על הבעת האמון המקצועי אותו הנכם רוחשים למשרדנו – בכך שבחרתם בנו לשמש כרואי החשבון שלכם.</li>
          <li>כמו כן, משרדנו נאמן לעיקרון המקודש שלו מזה עשרות שנים, לא לחייב אתכם בחיוב חריג בשום אופן וצורה, למעט שכר הטרחה השנתי המבוקש, כמדי תחילת שנה.</li>
        </ul>
      </div>
    `;

    // VAT notice
    const vatNotice = `
      <div style="margin-bottom: 20px; background-color: #fef3c7; padding: 15px; border-radius: 5px;">
        <p>שימו לב כי שיעור המע"מ השתנה ל 18 אחוז. אך אין בכך מ"לפגוע" בכם שכן אצלכם מדובר בתשומות מוכרות שיופחתו מתשלום המע"מ החודשי שלכם.</p>
      </div>
    `;

    // Main content based on fee change type
    let mainContent = `
      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold;">ולגופו של עניין:</p>
        <p>כמדי תחילת שנה, הננו לפרט לכם את גובה שכר טרחתנו ואופן תשלומו בגין מלוא שירותי ראיית חשבון שימסרו לכם ולבעלי המניות של [חברה] בשנה הקרובה.</p>
    `;

    // Add specific content based on fee change type
    if (definition.feeChangeType === 'index') {
      mainContent += `
        <p>קודם לכן, נדגיש כי שכר הטרחה המבוקש השנה, זהה לשכר הטרחה ששילמתם אשתקד, למעט עדכון המחיר בשיעור עליית המדד (שיעור עליית מדד המחירים לצרכן בשנת המס 2024 הסתכם בלפחות 4%).</p>
      `;
    } else if (definition.feeChangeType === 'real') {
      mainContent += `
        <p>קודם לכן, נדגיש כי שכר הטרחה המבוקש השנה, זהה לשכר הטרחה ששילמתם אשתקד, למעט עדכון המחיר בשיעור עליית המדד (שיעור עליית מדד המחירים לצרכן בשנת המס 2024 הסתכם בלפחות 4%) והתייקרות תשומות העבודה והתשומות האחרות.</p>
      `;
    } else if (definition.feeChangeType === 'agreed') {
      mainContent += `
        <p>קודם לכן, נדגיש כי שכר הטרחה המבוקש השנה הינו כפי שסוכם ביננו.</p>
      `;
    }

    mainContent += `</div>`;

    // Payment section
    const paymentSection = `
      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold; text-decoration: underline;">אופן התשלום:</p>
        <p>נודה, איפה, על הכנת 8 המחאות שסכום כל אחת מהן (הסכום כבר כולל מע"מ) הינו בסה"כ של: <span style="font-weight: bold; color: #dc2626;">[סכום] ₪</span></p>
        <p>תאריכי ההמחאות הינם לחמישי לכל חודש, החל מיום 5.1.2025 ועד ליום 5.8.2025.</p>
        <p style="color: #dc2626;">נבקשכם בכל לשון להקפיד על תאריכי ההמחאות והסכומים המדויקים.</p>
      </div>
    `;

    // Discounts section
    const discounts = `
      <div style="margin-bottom: 20px; background-color: #f0fdf4; padding: 15px; border-radius: 5px;">
        <p style="font-weight: bold;">הנחות:</p>
        <ul>
          <li>הנחה בשיעור של 8 אחוזים תימסר למשלמים את מלוא הסכום מראש (הן בכרטיס אשראי או בהעברה בנקאית).</li>
          <li>הסכום כולל מע"מ לאחר ההנחה: <span style="font-weight: bold;">[סכום לאחר הנחה]</span></li>
          <li>הנחה בשיעור של 4 אחוזים תימסר למשלמים בכרטיס אשראי עד 4 תשלומים.</li>
        </ul>
      </div>
    `;

    // Bank details
    const bankDetails = `
      <div style="margin-bottom: 20px; background-color: #f8fafc; padding: 15px; border-radius: 5px;">
        <p style="font-weight: bold;">להלן פרטי חשבון הבנק להעברה:</p>
        <ul style="list-style: none;">
          <li>◆ בנק הפועלים לישראל בע"מ</li>
          <li>◆ סניף 532 - דניאל פריש</li>
          <li>◆ חשבון מספר 539990</li>
          <li>◆ על שם: פרנקו ושות' רו"ח</li>
        </ul>
      </div>
    `;

    // Contact info
    const contactInfo = `
      <div style="margin-bottom: 20px;">
        <p>להסדרת התשלום יש לפנות לסמנכ"לית הכספים, סיגל נגר, בטלפון 050-8620993 או במייל sigal@franco.co.il</p>
      </div>
    `;

    // Footer
    const footer = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
        <p style="font-size: 14px; color: #64748b;">
          פרנקו ושות' רואי חשבון ◆ שד"ל 3, מגדל אלרוב קומה ראשונה, תל אביב ◆ 035666170 ◆ franco-cpa@franco.co.il
        </p>
      </div>
    `;

    // Combine all sections
    return header + greeting + opening + vatNotice + mainContent + paymentSection + discounts + bankDetails + contactInfo + footer;
  }

  /**
   * Get variables schema for the template
   */
  static getVariablesSchema(definition: TemplateDefinition): any {
    const commonRequired = [
      'תאריך',
      'שם',
      'חברה',
      'סכום',
      'סכום לאחר הנחה'
    ];

    const commonOptional = [
      'קבוצה',
      'סוג הודעה',
      'payment_link'
    ];

    const schema = {
      required: commonRequired,
      optional: commonOptional,
      conditional: {}
    };

    // Add specific requirements based on fee change type
    if (definition.feeChangeType === 'real') {
      schema.required.push('real_adjustment_reason');
    }

    return schema;
  }

  /**
   * Get selection rules for the template
   */
  static getSelectionRules(definition: TemplateDefinition): any {
    const rules: any = {
      fee_change_type: definition.feeChangeType
    };

    if (definition.category === 'external') {
      rules.client_type = 'external';
    } else if (definition.category.includes('internal')) {
      rules.client_type = 'internal';
    }

    if (definition.category === 'internal_audit') {
      rules.service_type = 'audit';
    } else if (definition.category === 'internal_bookkeeping') {
      rules.service_type = 'bookkeeping';
    } else if (definition.category === 'retainer') {
      rules.service_type = 'retainer';
    }

    return rules;
  }

  /**
   * Generate template data for database insertion
   */
  static generateTemplateData(definition: TemplateDefinition): Partial<LetterTemplate> {
    return {
      template_type: definition.type,
      name: definition.name,
      name_hebrew: definition.nameHebrew,
      description: `Template for ${definition.name}`,
      language: 'he',
      subject: definition.subject,
      content_html: this.getTemplateContent(definition),
      content_text: '', // Will be generated from HTML
      variables_schema: this.getVariablesSchema(definition),
      selection_rules: this.getSelectionRules(definition),
      is_active: true,
      is_editable: true,
      version: 1,
      original_file_path: `11 letters original/${definition.fileName}.docx`
    };
  }

  /**
   * Get all templates ready for database insertion
   */
  static getAllTemplates(): Partial<LetterTemplate>[] {
    return this.TEMPLATE_DEFINITIONS.map(def => this.generateTemplateData(def));
  }
}