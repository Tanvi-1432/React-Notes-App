import { tiptapDocFromPlainText, extractPlainText, extractTasksFromTiptap, parseTiptapContent } from '../tiptapHelpers';

describe('tiptapDocFromPlainText', () => {
  it('creates a valid doc from a single line', () => {
    const doc = tiptapDocFromPlainText('Hello world');
    expect(doc.type).toBe('doc');
    expect(doc.content[0].type).toBe('paragraph');
    expect(doc.content[0].content[0].text).toBe('Hello world');
  });

  it('creates one paragraph per line', () => {
    const doc = tiptapDocFromPlainText('Line 1\nLine 2\nLine 3');
    expect(doc.content).toHaveLength(3);
  });

  it('handles empty string', () => {
    const doc = tiptapDocFromPlainText('');
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(1);
  });

  it('handles null/undefined', () => {
    const doc = tiptapDocFromPlainText(null);
    expect(doc.type).toBe('doc');
  });
});

describe('extractPlainText', () => {
  it('extracts text from a simple paragraph', () => {
    const doc = tiptapDocFromPlainText('Hello world');
    expect(extractPlainText(doc)).toBe('Hello world');
  });

  it('joins multiple paragraphs with newlines', () => {
    const doc = tiptapDocFromPlainText('Line 1\nLine 2');
    const text = extractPlainText(doc);
    expect(text).toContain('Line 1');
    expect(text).toContain('Line 2');
  });

  it('handles null doc', () => {
    expect(extractPlainText(null)).toBe('');
  });
});

describe('extractTasksFromTiptap', () => {
  const docWithTasks = {
    type: 'doc',
    content: [
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: { checked: false },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Buy milk' }] }],
          },
          {
            type: 'taskItem',
            attrs: { checked: true },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Call dentist' }] }],
          },
        ],
      },
    ],
  };

  it('extracts task items from a taskList node', () => {
    const tasks = extractTasksFromTiptap(docWithTasks);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].label).toBe('Buy milk');
    expect(tasks[0].isComplete).toBe(false);
    expect(tasks[1].label).toBe('Call dentist');
    expect(tasks[1].isComplete).toBe(true);
  });

  it('assigns a unique id to each task', () => {
    const tasks = extractTasksFromTiptap(docWithTasks);
    expect(tasks[0].id).not.toBe(tasks[1].id);
    expect(typeof tasks[0].id).toBe('string');
  });

  it('filters out empty task items', () => {
    const docWithEmpty = {
      type: 'doc',
      content: [{
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [] }],
        }],
      }],
    };
    const tasks = extractTasksFromTiptap(docWithEmpty);
    expect(tasks).toHaveLength(0);
  });

  it('returns empty array for null doc', () => {
    expect(extractTasksFromTiptap(null)).toEqual([]);
  });

  it('returns empty array for doc with no tasks', () => {
    const doc = tiptapDocFromPlainText('Just a paragraph');
    expect(extractTasksFromTiptap(doc)).toEqual([]);
  });
});

describe('parseTiptapContent', () => {
  it('parses valid Tiptap JSON string', () => {
    const doc = { type: 'doc', content: [] };
    const result = parseTiptapContent(JSON.stringify(doc));
    expect(result).toEqual(doc);
  });

  it('returns null for invalid JSON', () => {
    expect(parseTiptapContent('not json')).toBeNull();
  });

  it('returns null for wrong structure', () => {
    expect(parseTiptapContent(JSON.stringify({ type: 'paragraph' }))).toBeNull();
  });

  it('returns null for null/empty input', () => {
    expect(parseTiptapContent(null)).toBeNull();
    expect(parseTiptapContent('')).toBeNull();
  });
});
