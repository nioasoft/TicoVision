import { Node, mergeAttributes } from '@tiptap/core';
import {
  BULLET_BLUE_BASE64,
  BULLET_DARKRED_BASE64,
  BULLET_BLACK_BASE64,
} from '@/lib/letter-assets';

export type BulletColor = 'blue' | 'darkred' | 'black';

interface ColorConfig {
  base64: string;
  name: string;
  commandName: string;
  dataType: string;
  className: string;
}

const COLOR_CONFIG: Record<BulletColor, ColorConfig> = {
  blue: {
    base64: BULLET_BLUE_BASE64,
    name: 'blueBullet',
    commandName: 'toggleBlueBullet',
    dataType: 'blue-bullet',
    className: 'blue-bullet-item',
  },
  darkred: {
    base64: BULLET_DARKRED_BASE64,
    name: 'darkRedBullet',
    commandName: 'toggleDarkRedBullet',
    dataType: 'darkred-bullet',
    className: 'darkred-bullet-item',
  },
  black: {
    base64: BULLET_BLACK_BASE64,
    name: 'blackBullet',
    commandName: 'toggleBlackBullet',
    dataType: 'black-bullet',
    className: 'black-bullet-item',
  },
};

// Extend TipTap commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blueBullet: {
      toggleBlueBullet: () => ReturnType;
    };
    darkRedBullet: {
      toggleDarkRedBullet: () => ReturnType;
    };
    blackBullet: {
      toggleBlackBullet: () => ReturnType;
    };
  }
}

export interface ColoredBulletOptions {
  HTMLAttributes: Record<string, unknown>;
}

/**
 * Creates a colored bullet TipTap extension
 * @param color - The bullet color: 'blue', 'darkred', or 'black'
 */
export const createColoredBullet = (color: BulletColor) => {
  const config = COLOR_CONFIG[color];

  return Node.create<ColoredBulletOptions>({
    name: config.name,

    group: 'block',

    content: 'inline*',

    defining: true,

    addOptions() {
      return {
        HTMLAttributes: {},
      };
    },

    parseHTML() {
      return [
        {
          tag: `div[data-type="${config.dataType}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-type': config.dataType,
          class: config.className,
          style: 'margin-bottom: 20px;',
        }),
        [
          'table',
          { style: 'width: 100%; border-collapse: collapse;' },
          [
            'tbody',
            {},
            [
              'tr',
              {},
              [
                'td',
                {
                  style:
                    'width: 20px; vertical-align: top; padding-top: 4px; padding-left: 8px;',
                },
                [
                  'img',
                  {
                    src: config.base64,
                    alt: '•',
                    width: '11',
                    height: '11',
                    style: 'display: block;',
                  },
                ],
              ],
              [
                'td',
                {
                  style:
                    'font-family: "David Libre", "Heebo", "Assistant", sans-serif; font-size: 16px; line-height: 1.5; text-align: right; vertical-align: top;',
                },
                0, // This is where the content goes
              ],
            ],
          ],
        ],
      ];
    },

    addCommands() {
      return {
        [config.commandName]:
          () =>
          ({ commands }) => {
            return commands.toggleNode(this.name, 'paragraph');
          },
      } as Record<string, () => ReturnType<typeof commands.toggleNode>>;
    },

    addKeyboardShortcuts() {
      return {
        Enter: () => {
          // Check if we're inside this bullet type
          if (!this.editor.isActive(this.name)) {
            return false;
          }

          const { state } = this.editor;
          const { $from, empty } = state.selection;

          // If the current line is empty, exit the bullet (convert to paragraph)
          if (empty && $from.parent.textContent === '') {
            return this.editor.commands.setNode('paragraph');
          }

          // Split the block and create a new bullet of the same type
          return this.editor
            .chain()
            .splitBlock()
            .setNode(this.name)
            .run();
        },
      };
    },
  });
};

// Export pre-configured bullet extensions
export const BlueBullet = createColoredBullet('blue');
export const DarkRedBullet = createColoredBullet('darkred');
export const BlackBullet = createColoredBullet('black');
