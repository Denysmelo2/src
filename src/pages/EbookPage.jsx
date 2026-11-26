import React, { useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Lock, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserPrefs } from '@/hooks/useUserPrefs';
import { useEbookToc, useEbookChapter } from '@/hooks/useEbook';
import { loadUserPrefs, saveUserPrefs } from '@/lib/userPrefs';
import {
  ebookBySlug,
  bookPath,
  chapterPath,
  parseChapterNumber,
  canOpenChapter,
  isFreeChapter,
  neighbours,
  splitTitle,
  withProgress,
  lastChapter,
} from '@/lib/ebook';
import { sanitizeChapterHtml } from '@/lib/ebookHtml';
import '@/styles/ebook.css';

/**
 * The ebook in /library (handover 26/11/2026):
 *   /library/stop-losing-money      the contents, with a padlock on the
 *                                   chapters a non-subscriber cannot open;
 *   /library/stop-losing-money/:n   one chapter, with previous / next.
 * Everyone reads the contents and chapter 1 (Introduction); chapters 2
 * onwards need Pro (the database decides, migration 0053).
 */
function EbookPage() {
  const { slug, chapter: rawChapter } = useParams();
  const book = ebookBySlug(slug);
  const { user } = useAuth();
  const { isPremium, isAdmin, loading: subLoading } = useSubscription();
  const isPro = isPremium || isAdmin;
  const { toc, loading: tocLoading, error: tocError } = useEbookToc(book);

  if (!book) return <Navigate to="/library" replace />;

  if (rawChapter === undefined) {
    return <Contents book={book} toc={toc} loading={tocLoading} error={tocError} isPro={isPro} subLoading={subLoading} user={user} />;
  }
  const n = parseChapterNumber(rawChapter);
  if (!n) return <Navigate to={bookPath(book)} replace />;
  return (
    <Chapter
      key={n}
      book={book}
      n={n}
      toc={toc}
      tocLoading={tocLoading}
      isPro={isPro}
      subLoading={subLoading}
      user={user}
    />
  );
}

function BackLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
      <ArrowLeft className="w-4 h-4 mr-1" />
      {children}
    </Link>
  );
}

function Contents({ book, toc, loading, error, isPro, subLoading, user }) {
  const { prefs } = useUserPrefs();
  const last = user ? lastChapter(prefs, book) : null;
  const lastEntry = last ? toc.find((c) => c.chapter_number === last) : null;

  return (
    <>
      <Helmet>
        <title>{book.title} — SnapGain Library</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        <BackLink to="/library">Library</BackLink>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> Ebook
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">{book.title}</h1>
          <p className="text-muted-foreground mt-2">{book.subtitle}</p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={chapterPath(book, lastEntry ? last : 1)}>
              {lastEntry ? `Continue: chapter ${last}` : 'Start reading'}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
          {!subLoading && !isPro && (
            <Button asChild variant="outline">
              <Link to="/pricing">Subscribe to read it all</Link>
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <h2 className="px-4 sm:px-5 pt-4 pb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contents
            </h2>
            {loading ? (
              <p className="px-5 py-6 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading the contents…
              </p>
            ) : error || toc.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                The book is being set up. Please come back in a little while.
              </p>
            ) : (
              <ol className="divide-y">
                {toc.map((c) => {
                  const { part, name } = splitTitle(c.title);
                  const open = canOpenChapter(book, c.chapter_number, isPro);
                  return (
                    <li key={c.chapter_number}>
                      <Link
                        to={chapterPath(book, c.chapter_number)}
                        className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-7 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
                          {c.chapter_number}
                        </span>
                        <span className="flex-1 min-w-0">
                          {part && <span className="block text-xs text-muted-foreground">{part}</span>}
                          <span className="block font-medium leading-snug">{name}</span>
                        </span>
                        {isFreeChapter(book, c.chapter_number) && !isPro ? (
                          <span className="text-xs font-semibold text-primary shrink-0">Free</span>
                        ) : !open && !subLoading ? (
                          <Lock className="w-4 h-4 text-muted-foreground shrink-0" aria-label="Subscribers only" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SubscribeCard({ user, book }) {
  return (
    <Card className="bg-gradient-to-br from-light-pink/30 to-light-green/30 border-primary/30">
      <CardContent className="py-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-lg font-semibold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            Subscribe to read
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            The Introduction is free. The rest of {book.title} is for SnapGain subscribers.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/pricing">See plans</Link>
          </Button>
          {!user && (
            <Button asChild variant="outline">
              <Link to="/auth/login">Log in</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Chapter({ book, n, toc, tocLoading, isPro, subLoading, user }) {
  const open = canOpenChapter(book, n, isPro);
  // Wait for the plan before reading a locked chapter, so a subscriber
  // does not see "Subscribe" for a moment.
  const { chapter, loading, error } = useEbookChapter(book, n, {
    enabled: open,
    userId: user?.id || null,
  });
  const html = useMemo(() => (chapter?.html_content ? sanitizeChapterHtml(chapter.html_content) : ''), [chapter?.html_content]);
  const { prev, next } = neighbours(toc, n);
  const entry = toc.find((c) => c.chapter_number === n);
  const title = chapter?.title || entry?.title || `Chapter ${n}`;
  const { part, name } = splitTitle(title);
  const outOfRange = !tocLoading && toc.length > 0 && !entry;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [n]);

  // Reading progress (task 5): the last chapter opened, saved to the
  // account (user_profiles.preferences, 0048). Once per chapter shown.
  const saved = useRef(null);
  useEffect(() => {
    if (!user || !chapter || saved.current === `${user.id}:${n}`) return;
    saved.current = `${user.id}:${n}`;
    loadUserPrefs(user.id)
      .then((prefs) => {
        if (lastChapter(prefs, book) === n) return null;
        return saveUserPrefs(user.id, withProgress(prefs, book, n));
      })
      .catch(() => {});
  }, [user, chapter, n, book]);

  if (outOfRange) return <Navigate to={bookPath(book)} replace />;

  const locked = !subLoading && !open;
  const waiting = (subLoading && !open) || (open && loading);

  return (
    <>
      <Helmet>
        <title>{`${name} — ${book.title}`}</title>
      </Helmet>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 max-w-3xl">
        <BackLink to={bookPath(book)}>Contents</BackLink>

        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {book.title} · Chapter {n}
            {part ? ` · ${part}` : ''}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">{name}</h1>
        </header>

        {waiting ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading the chapter…
          </p>
        ) : locked ? (
          <SubscribeCard user={user} book={book} />
        ) : chapter ? (
          <article
            className="chapter-content rounded-xl border px-4 py-5 sm:px-8 sm:py-8"
            // Sanitized by DOMPurify (src/lib/ebookHtml.js).
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : error ? (
          <p className="text-sm text-muted-foreground py-10">
            The chapter could not be loaded. Please try again in a moment.
          </p>
        ) : (
          // The database did not send it: the plan ended, or the account is
          // not a subscriber after all.
          <SubscribeCard user={user} book={book} />
        )}

        <nav className="flex items-stretch justify-between gap-3 pt-2" aria-label="Chapters">
          {prev ? (
            <Button asChild variant="outline" className="h-auto py-2 max-w-[48%] justify-start">
              <Link to={chapterPath(book, prev.chapter_number)}>
                <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0" />
                <span className="text-left min-w-0">
                  <span className="block text-xs text-muted-foreground">Previous</span>
                  <span className="block truncate">{splitTitle(prev.title).name}</span>
                </span>
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button asChild variant="outline" className="h-auto py-2 max-w-[48%] justify-end ml-auto">
              <Link to={chapterPath(book, next.chapter_number)}>
                <span className="text-right min-w-0">
                  <span className="block text-xs text-muted-foreground">Next</span>
                  <span className="block truncate">{splitTitle(next.title).name}</span>
                </span>
                <ArrowRight className="w-4 h-4 ml-1.5 shrink-0" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </>
  );
}

export default EbookPage;
