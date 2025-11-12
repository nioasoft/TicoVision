import { Node, mergeAttributes } from '@tiptap/core';

export interface BlueBulletOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blueBullet: {
      /**
       * Toggle a blue bullet
       */
      toggleBlueBullet: () => ReturnType;
    };
  }
}

export const BlueBullet = Node.create<BlueBulletOptions>({
  name: 'blueBullet',

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
        tag: 'div[data-type="blue-bullet"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'blue-bullet',
        class: 'blue-bullet-item',
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
                  src: '/brand/Bullet_star_blue.png',
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
      toggleBlueBullet:
        () =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph');
        },
    };
  },
});
