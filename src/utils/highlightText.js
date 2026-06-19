import React from 'react';

/**
 * Split `text` at every occurrence of `query` (case-insensitive) and return
 * an array of React nodes with matching substrings wrapped in <mark>.
 *
 * Returns [text] when query is empty or text is empty.
 * Safely handles special regex characters in the query.
 */
export function highlightText(text, query) {
  if (!query || !text) return [text || ''];

  // Escape special regex characters so the query is treated as a literal string
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let parts;
  try {
    parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  } catch {
    return [text];
  }

  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return (
        <mark key={i} className="search-highlight">
          {part}
        </mark>
      );
    }
    return part;
  });
}
