/**
 * Text to HTML Parser
 * Converts plain text with Markdown-like syntax to styled HTML for letter templates
 *
 * Parsing Rules:
 * - "[text]:"          → Section heading (20px, bold, black)
 * - "* [text]"         → Bullet point (16px + blue icon)
 * - "- [text]"         → Bullet point
 * - "[text]"           → Paragraph (16px, regular)
 * - Empty line         → New paragraph block
 *
 * Note: "הנדון:" (subject lines) are now handled separately as dynamic SubjectLine components
 */

/**
 * Design System Constants (matching existing templates)
 */
const DESIGN_TOKENS = {
  fonts: {
    family: "'David Libre', 'Heebo', 'Assistant', sans-serif"
  },
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#09090b',
    lineHeight: '1.2',
    marginBottom: '20px'
  },
  paragraph: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#09090b',
    lineHeight: '1.2'
  },
  bullet: {
    fontSize: '16px',
    fontWeight: '400',
    color: '#09090b',
    lineHeight: '1.2',
    paddingBottom: '20px',
    iconSrc: 'cid:bullet_star_blue',
    iconWidth: '11',
    iconHeight: '11',
    columnWidth: '20'
  },
  spacing: {
    sectionMarginTop: '20px',
    borderMarginTop: '20px'
  }
} as const;

/**
 * Line type identification
 */
type LineType = 'heading' | 'bullet' | 'paragraph' | 'empty';

interface ParsedLine {
  type: LineType;
  content: string;
  rawLine: string;
}

/**
 * Identify the type of a single line
 */
export function parseLineType(line: string): ParsedLine {
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) {
    return { type: 'empty', content: '', rawLine: line };
  }

  // Heading: line ending with ":"
  if (trimmed.endsWith(':')) {
    return { type: 'heading', content: trimmed, rawLine: line };
  }

  // Bullet point: starts with "*", "-", or "•"
  if (trimmed.match(/^[\*\-\•]\s+/)) {
    const content = trimmed.replace(/^[\*\-\•]\s+/, '').trim();
    return { type: 'bullet', content, rawLine: line };
  }

  // Regular paragraph
  return { type: 'paragraph', content: trimmed, rawLine: line };
}

/**
 * Parse inline text formatting
 * Processes: **bold**, ##red bold##, ###blue bold###, __underline__, ===double underline===, ~~strikethrough~~
 *
 * Processing order (innermost to outermost) to support nesting:
 * 1. __ (underline) - innermost
 * 2. === (double underline)
 * 3. ~~ (strikethrough)
 * 4. ** (bold) - can wrap previous ones
 * 5. ## (red bold) - can wrap all
 * 6. ### (blue bold) - outermost
 *
 * Supported combinations:
 * - **__text__** → bold + underline
 * - **===text===** → bold + double underline
 * - ##__text__## → red bold + underline
 * - ###__text__### → blue bold + underline
 */
function parseInlineStyles(text: string): string {
  let result = text;

  // Process __ (underline) FIRST - innermost layer
  result = result.replace(/__(.*?)__/g, '<span style="text-decoration: underline;">$1</span>');

  // Process === (double underline) SECOND
  result = result.replace(/===(.*?)===/g, '<span style="text-decoration: underline; text-decoration-style: double;">$1</span>');

  // Process ~~ (strikethrough) THIRD
  result = result.replace(/~~(.*?)~~/g, '<span style="text-decoration: line-through;">$1</span>');

  // Process ** (bold) FOURTH - can wrap underlines/strikethroughs
  result = result.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold;">$1</span>');

  // Process ## (red bold) FIFTH - can wrap everything inside
  result = result.replace(/##(.*?)##/g, '<span style="color: #FF0000; font-weight: bold;">$1</span>');

  // Process ### (blue bold) LAST - outermost layer, before ## to avoid conflicts
  result = result.replace(/###(.*?)###/g, '<span style="color: #395BF7; font-weight: bold;">$1</span>');

  return result;
}

/**
 * Build HTML for section heading
 */
function buildHeading(content: string): string {
  const { heading, fonts } = DESIGN_TOKENS;
  const styledContent = parseInlineStyles(content);
  return `<!-- Section Heading -->
<tr>
    <td>
        <div style="font-family: ${fonts.family}; font-size: ${heading.fontSize}; line-height: ${heading.lineHeight}; font-weight: ${heading.fontWeight}; color: ${heading.color}; text-align: right;">
            ${styledContent}
        </div>`;
}

/**
 * Build HTML for bullet point
 */
function buildBullet(content: string, isLast: boolean = false): string {
  const { bullet, fonts } = DESIGN_TOKENS;
  const paddingStyle = isLast ? '' : ` padding-bottom: ${bullet.paddingBottom};`;
  const styledContent = parseInlineStyles(content);

  return `            <tr>
                <td width="${bullet.columnWidth}" style="vertical-align: top; padding-top: 4px;">
                    <img src="${bullet.iconSrc}" width="${bullet.iconWidth}" height="${bullet.iconHeight}" alt="•" style="display: block; border: 0;">
                </td>
                <td style="font-family: ${fonts.family}; font-size: ${bullet.fontSize}; line-height: ${bullet.lineHeight}; color: ${bullet.color}; text-align: right;${paddingStyle}">
                    ${styledContent}
                </td>
            </tr>`;
}

/**
 * Build HTML for paragraph
 */
function buildParagraph(content: string): string {
  const { paragraph, fonts } = DESIGN_TOKENS;
  const styledContent = parseInlineStyles(content);
  return `<!-- Paragraph -->
<tr>
    <td style="padding-top: 20px;">
        <div style="font-family: ${fonts.family}; font-size: ${paragraph.fontSize}; line-height: ${paragraph.lineHeight}; color: ${paragraph.color}; text-align: right;">
            ${styledContent}
        </div>
    </td>
</tr>`;
}

/**
 * Close bullet section with border
 */
function closeBulletSection(): string {
  return `        </table>
        <!-- Border -->
        <div style="border-top: 1px solid #000000;"></div>
    </td>
</tr>`;
}

/**
 * Parse plain text to HTML
 * Main function that orchestrates the parsing
 */
export function parseTextToHTML(plainText: string): string {
  const lines = plainText.split('\n');
  const parsedLines = lines.map(line => parseLineType(line));

  let html = '';
  let inBulletSection = false;
  let bulletBuffer: string[] = [];

  for (let i = 0; i < parsedLines.length; i++) {
    const parsed = parsedLines[i];
    const nextParsed = parsedLines[i + 1];

    switch (parsed.type) {
      case 'heading':
        // Close bullet section if open
        if (inBulletSection) {
          html += closeBulletSection();
          inBulletSection = false;
          bulletBuffer = [];
        }
        html += buildHeading(parsed.content);
        break;

      case 'bullet':
        // Start bullet section if not already in one
        if (!inBulletSection) {
          html += `        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">\n`;
          inBulletSection = true;
        }

        // Check if this is the last bullet in the section
        const isLastBullet = !nextParsed || nextParsed.type !== 'bullet';
        html += buildBullet(parsed.content, isLastBullet);

        // Close section if no more bullets
        if (isLastBullet) {
          html += closeBulletSection();
          inBulletSection = false;
        }
        break;

      case 'paragraph':
        // Close bullet section if open
        if (inBulletSection) {
          html += closeBulletSection();
          inBulletSection = false;
          bulletBuffer = [];
        }
        html += buildParagraph(parsed.content);
        break;

      case 'empty':
        // Skip empty lines (they're already handled by spacing)
        break;
    }
  }

  // Close any remaining bullet section
  if (inBulletSection) {
    html += closeBulletSection();
  }

  return html;
}

/**
 * Replace variables in text
 * Supports basic variables: {{company_name}}, {{letter_date}}, {{year}}, {{amount}}
 */
export function replaceVariables(
  text: string,
  variables: Record<string, string | number>
): string {
  let result = text;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, String(value));
  }

  return result;
}

/**
 * Extract variables from text
 * Returns array of variable names found in {{variable}} format
 */
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map(m => m[1].trim()))];
}

/**
 * Validate that all required variables are provided
 */
export function validateVariables(
  text: string,
  providedVariables: Record<string, string | number>,
  requiredVariables: string[] = []
): { valid: boolean; missing: string[] } {
  const extractedVars = extractVariables(text);
  const allRequired = [...new Set([...requiredVariables, ...extractedVars])];

  const missing = allRequired.filter(v => !(v in providedVariables));

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Preview function - combines parsing and variable replacement
 */
export function generateHTMLPreview(
  plainText: string,
  variables: Record<string, string | number> = {}
): string {
  // First replace variables in plain text
  const textWithVars = replaceVariables(plainText, variables);

  // Then parse to HTML
  const html = parseTextToHTML(textWithVars);

  return html;
}
