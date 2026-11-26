import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * The table of contents of a book (number and title of every chapter),
 * for everyone (public.ebook_toc, migration 0053).
 * -> { toc, loading, error }
 */
export function useEbookToc(book) {
  const [state, setState] = useState({ toc: [], loading: true, error: null });
  useEffect(() => {
    let alive = true;
    if (!book) {
      setState({ toc: [], loading: false, error: null });
      return undefined;
    }
    setState((s) => ({ ...s, loading: true }));
    supabase
      .rpc('ebook_toc', { p_product_id: book.productId, p_locale: book.locale })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          console.warn('[ebook] contents:', error.message);
          setState({ toc: [], loading: false, error });
        } else {
          setState({ toc: Array.isArray(data) ? data : [], loading: false, error: null });
        }
      });
    return () => {
      alive = false;
    };
  }, [book?.productId, book?.locale]);
  return state;
}

/**
 * One chapter. The database sends it only to who may read it (chapter 1
 * to everyone, the rest to Pro); otherwise `chapter` is null.
 * `enabled` false skips the read (a locked chapter for a non-subscriber).
 * Pass the user id so a sign-in or sign-out reads again.
 * -> { chapter: { chapter_number, title, html_content } | null, loading, error }
 */
export function useEbookChapter(book, n, { enabled = true, userId = null } = {}) {
  const [state, setState] = useState({ chapter: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    if (!book || !n || !enabled) {
      setState({ chapter: null, loading: false, error: null });
      return undefined;
    }
    setState({ chapter: null, loading: true, error: null });
    supabase
      .from('ebook_chapters')
      .select('chapter_number, title, html_content')
      .eq('product_id', book.productId)
      .eq('locale', book.locale)
      .eq('chapter_number', n)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('[ebook] chapter:', error.message);
        setState({ chapter: error ? null : data || null, loading: false, error: error || null });
      });
    return () => {
      alive = false;
    };
  }, [book?.productId, book?.locale, n, enabled, userId]);
  return state;
}
