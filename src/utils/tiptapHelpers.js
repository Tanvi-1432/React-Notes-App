import { nanoid } from 'nanoid';

/**
 * Build a minimal Tiptap/ProseMirror JSON document from a plain text string.
 * Each line becomes a paragraph node.
 */
export function tiptapDocFromPlainText(text) {
  const lines = (text || '').split('\n');
  const content = lines.map((line) => ({
    type: 'paragraph',
    content: line
      ? [{ type: 'text', text: line }]
      : [],
  }));
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  };
}

/**
 * Recursively walk a Tiptap JSON document node and collect plain text.
 */
function collectText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  const children = node.content || [];
  const childText = children.map(collectText).join('');
  // Add line breaks between block-level nodes
  const blockTypes = new Set([
    'paragraph', 'heading', 'blockquote', 'codeBlock',
    'listItem', 'taskItem', 'bulletList', 'orderedList', 'taskList',
  ]);
  if (blockTypes.has(node.type) && childText) return childText + '\n';
  return childText;
}

/**
 * Extract plain text from a Tiptap JSON document (already parsed object).
 */
export function extractPlainText(doc) {
  if (!doc) return '';
  return collectText(doc).trim();
}

/**
 * Extract tasks from a Tiptap JSON document.
 * Returns an array matching the Task shape from the data model.
 */
export function extractTasksFromTiptap(doc) {
  if (!doc) return [];
  const tasks = [];

  function walk(node) {
    if (!node) return;
    if (node.type === 'taskItem') {
      const label = (node.content || [])
        .map(collectText)
        .join('')
        .trim();
      if (label) {
        tasks.push({
          id: nanoid(),
          label,
          isComplete: node.attrs?.checked === true,
          dueDate: null,
        });
      }
      return;
    }
    (node.content || []).forEach(walk);
  }

  walk(doc);
  return tasks;
}

/**
 * Safely parse a Tiptap JSON string. Returns null on failure.
 */
export function parseTiptapContent(contentStr) {
  if (!contentStr) return null;
  try {
    const parsed = JSON.parse(contentStr);
    if (parsed && parsed.type === 'doc') return parsed;
    return null;
  } catch {
    return null;
  }
}
