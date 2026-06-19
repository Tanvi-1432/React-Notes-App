import React from 'react';
import { render } from '@testing-library/react';
import { highlightText } from '../highlightText';

function renderHighlight(text, query) {
  const nodes = highlightText(text, query);
  const { container } = render(<span>{nodes}</span>);
  return container;
}

describe('highlightText', () => {
  it('returns the plain text when query is empty', () => {
    const result = highlightText('Hello world', '');
    expect(result).toEqual(['Hello world']);
  });

  it('returns the plain text when query is null', () => {
    const result = highlightText('Hello world', null);
    expect(result).toEqual(['Hello world']);
  });

  it('returns empty string array for empty text', () => {
    const result = highlightText('', 'foo');
    expect(result).toEqual(['']);
  });

  it('wraps a matched substring in a mark element', () => {
    const container = renderHighlight('Hello world', 'world');
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('world');
  });

  it('is case-insensitive', () => {
    const container = renderHighlight('Hello World', 'world');
    const mark = container.querySelector('mark');
    expect(mark).toBeTruthy();
    expect(mark.textContent).toBe('World');
  });

  it('handles multiple matches', () => {
    const container = renderHighlight('foo bar foo', 'foo');
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
  });

  it('handles special regex characters safely', () => {
    // Should not throw
    expect(() => highlightText('a.b+c?d', '.')).not.toThrow();
    expect(() => highlightText('test()', '(')).not.toThrow();
    expect(() => highlightText('[test]', '[')).not.toThrow();
  });

  it('applies search-highlight class to marks', () => {
    const container = renderHighlight('hello world', 'world');
    const mark = container.querySelector('mark');
    expect(mark.className).toBe('search-highlight');
  });

  it('preserves non-matching text around the match', () => {
    const container = renderHighlight('The quick brown fox', 'quick');
    expect(container.textContent).toBe('The quick brown fox');
  });
});
