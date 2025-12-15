import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    colorBlock: {
      setColorBlock: (options: { backgroundColor?: string }) => ReturnType;
      toggleColorBlock: (options: { backgroundColor?: string }) => ReturnType;
      unsetColorBlock: () => ReturnType;
    };
  }
}

export const ColorBlock = Node.create({
  name: 'colorBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-color-block]',
      },
    ];
  },

  addAttributes() {
    return {
      backgroundColor: {
        default: '#EEEDD8',
        parseHTML: (element) => {
          const style = element.getAttribute('style') || '';
          return (
            style.match(/background-color:\s*([^;]+)/)?.[1] ||
            '#EEEDD8'
          );
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { backgroundColor } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(
        {
          'data-color-block': '',
          style: `background-color: ${backgroundColor}; padding: 16px; border-radius: 4px; margin: 12px 0;`,
        },
        HTMLAttributes
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setColorBlock:
        (options = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, {
            backgroundColor: options.backgroundColor || '#EEEDD8',
          });
        },
      toggleColorBlock:
        (options = {}) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, {
            backgroundColor: options.backgroundColor || '#EEEDD8',
          });
        },
      unsetColorBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
});
