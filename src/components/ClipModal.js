import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MdClose, MdBookmark } from 'react-icons/md';
import { useAppContext } from '../context/AppContext';
import { nowISO } from '../utils/dateUtils';
import { useSafeMotion } from '../utils/motionConfig';

const CORS_PROXY = 'https://corsproxy.io/?';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function fetchOgMeta(url) {
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const og = (name) =>
      doc.querySelector(`meta[property="og:${name}"]`)?.getAttribute('content') ||
      doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ||
      null;

    return {
      title: og('title') || doc.title || null,
      excerpt: og('description') || null,
      previewImageUrl: og('image') || null,
    };
  } catch {
    return null;
  }
}

export default function ClipModal({ onClose }) {
  const { addNote, updateNote } = useAppContext();
  const { backdropVariants, confirmVariants } = useSafeMotion();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleClip(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    let fullUrl = trimmed;
    if (!/^https?:\/\//i.test(fullUrl)) fullUrl = 'https://' + fullUrl;

    const domain = getDomain(fullUrl);
    const now = nowISO();

    const bareDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{
            type: 'text',
            marks: [{ type: 'link', attrs: { href: fullUrl, target: '_blank' } }],
            text: fullUrl,
          }],
        },
      ],
    };

    const bareClipSource = {
      url: fullUrl,
      title: domain,
      excerpt: null,
      domain,
      savedDate: now,
      previewImageUrl: null,
    };

    setLoading(true);
    setError('');

    const created = addNote({
      title: domain,
      content: JSON.stringify(bareDoc),
      contentPlainText: fullUrl,
      tags: ['clip'],
      color: '#98B7DB',
      clippedFrom: bareClipSource,
    });

    onClose();

    const meta = await fetchOgMeta(fullUrl);
    if (meta && created) {
      const enrichedTitle = meta.title || domain;
      const paragraphs = [bareDoc.content[0]];
      if (meta.excerpt) {
        paragraphs.push({
          type: 'paragraph',
          content: [{ type: 'text', text: meta.excerpt }],
        });
      }
      const enrichedDoc = { type: 'doc', content: paragraphs };
      const enrichedClip = {
        ...bareClipSource,
        title: enrichedTitle,
        excerpt: meta.excerpt,
        previewImageUrl: meta.previewImageUrl,
      };
      updateNote(created.id, {
        title: enrichedTitle,
        content: JSON.stringify(enrichedDoc),
        contentPlainText: `${fullUrl}\n${meta.excerpt || ''}`.trim(),
        clippedFrom: enrichedClip,
      });
    }

    // The modal closes immediately after creating the bare clip, so avoid
    // updating local component state after the async enrichment finishes.
  }

  const modal = (
    <motion.div
      className="confirm-overlay"
      role="presentation"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Save web clip"
        className="clip-modal"
        variants={confirmVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="clip-modal__header">
          <span className="clip-modal__title">
            <MdBookmark size="1.1em" /> Save a web clip
          </span>
          <motion.button
            type="button"
            className="note-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
            whileTap={{ scale: 0.88, rotate: 45 }}
          >
            <MdClose size="1.2em" />
          </motion.button>
        </div>

        <form className="clip-modal__form" onSubmit={handleClip}>
          <input
            ref={inputRef}
            type="text"
            className="clip-modal__input"
            placeholder="Paste a URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="URL to clip"
            disabled={loading}
          />
          {error && <p className="clip-modal__error" role="alert">{error}</p>}
          <div className="clip-modal__actions">
            <motion.button
              type="button"
              className="confirm-dialog__btn confirm-dialog__btn--cancel"
              onClick={onClose}
              disabled={loading}
              whileTap={{ scale: 0.96 }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              className="confirm-dialog__btn"
              disabled={loading || !url.trim()}
              whileTap={{ scale: 0.96 }}
            >
              {loading ? 'Clipping…' : 'Clip It →'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return createPortal(modal, document.body);
}
