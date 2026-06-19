import { useMemo } from 'react';

/**
 * Score and filter notes by a search query using simple substring matching.
 * Priority: title (+10) > tag exact match (+5) > body (+3) > clip/task metadata (+1)
 */
export function useSearch(notes, query) {
  return useMemo(() => {
    if (!query || !query.trim()) return notes;
    const q = query.toLowerCase().trim();

    const scored = notes
      .map((note) => {
        let score = 0;

        if (note.title && note.title.toLowerCase().includes(q)) score += 10;

        if (Array.isArray(note.tags)) {
          note.tags.forEach((tag) => {
            if (tag.toLowerCase() === q) score += 5;
            else if (tag.toLowerCase().includes(q)) score += 2;
          });
        }

        if (note.contentPlainText && note.contentPlainText.toLowerCase().includes(q)) score += 3;

        if (Array.isArray(note.tasks)) {
          note.tasks.forEach((t) => {
            if (t.label && t.label.toLowerCase().includes(q)) score += 1;
          });
        }

        if (note.clippedFrom) {
          const { url = '', title = '', domain = '' } = note.clippedFrom;
          if (
            (url && url.toLowerCase().includes(q)) ||
            (title && title.toLowerCase().includes(q)) ||
            (domain && domain.toLowerCase().includes(q))
          ) {
            score += 1;
          }
        }

        return { note, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ note }) => note);
  }, [notes, query]);
}
