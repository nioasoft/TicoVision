import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styledDivider: {
      setStyledDivider: (options: { color?: string; thickness?: string }) => ReturnType;
    };
  }
}

export const StyledDivider = Node.create({
  name: 'styledDivider',

  group: 'block',

  parseHTML() {
    return [
      {
        tag: 'div[data-styled-divider]',
      },
      // Also parse <hr> tags as styled dividers
      {
        tag: 'hr',
        getAttrs: (node) => {
          const element = node as HTMLElement;
          const style = element.getAttribute('style') || '';
          const color = style.match(/border-color:\s*([^;]+)/)?.[1] || '#000000';
          const thickness = style.match(/border-width:\s*([^;]+)/)?.[1] || '1px';
          return { color, thickness };
        },
      },
    ];
  },

  addAttributes() {
    return {
      color: {
        default: '#000000',
        parseHTML: (element) => {
          const style = element.getAttribute('style') || '';
          return (
            style.match(/border-top-color:\s*([^;]+)/)?.[1] ||
            style.match(/border-color:\s*([^;]+)/)?.[1] ||
            '#000000'
          );
        },
      },
      thickness: {
        default: '1px',
        parseHTML: (element) => {
          const style = element.getAttribute('style') || '';
          return (
            style.match(/border-top-width:\s*([^;]+)/)?.[1] ||
            style.match(/border-width:\s*([^;]+)/)?.[1] ||
            '1px'
          );
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { color, thickness } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(
        {
          'data-styled-divider': '',
          style: `border-top: ${thickness} solid ${color}; margin: 20px 0;`,
        },
        HTMLAttributes
      ),
    ];
  },

  addCommands() {
    return {
      setStyledDivider:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              color: options.color || '#000000',
              thickness: options.thickness || '1px',
            },
          });
        },
    };
  },
});
