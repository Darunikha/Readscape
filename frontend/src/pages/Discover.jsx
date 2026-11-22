import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Flame, Gem, Search, Sparkles, Star, X } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../lib/useApi';
import { BookGrid, BookRow } from '../components/books/BookCard';
import { EmptyState, ErrorState, Spinner } from '../components/ui';
import { Sprig } from '../components/decor/Decor';
import { cn } from '../lib/utils';

const GENRE_TONES = ['bg-mist', 'bg-cocoa-100', 'bg-silver-100', 'bg-oat'];

/** Paged results for a search query or a genre. */
function ResultsGrid({ path, title, subtitle, onBack }) {
  const [state, setState] = useState({ books: [], page: 1, total: 0, loading: true, error: null, more: false });

  const load = async (page) => {
    setState((s) => ({ ...s, loading: page === 1, more: page > 1, error: null }));
    try {
      const sep = path.includes('?') ? '&' : '?';
      const data = await api.get(`${path}${sep}page=${page}`);
      setState((s) => {
        const seen = new Set(page === 1 ? [] : s.books.map((b) => b.olId));
        const books = [...(page === 1 ? [] : s.books), ...data.books.filter((b) => !seen.has(b.olId))];
        return { books, page, total: data.total, loading: false, more: false, error: null, fallback: data.fallback };
      });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, more: false, error }));
    }
  };

  useEffect(() => { load(1); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const canLoadMore = state.books.length > 0 && state.books.length < state.total && !state.fallback;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1.5 text-sm text-cocoa-500 hover:text-cocoa"><ArrowLeft className="size-4" /> Back to Discover</button>
          <h1 className="text-[38px] leading-none">{title}</h1>
          {subtitle && <p className="mt-1.5 text-cocoa-500">{!state.loading && state.total ? `${state.total.toLocaleString()} books · ` : ''}{subtitle}</p>}
        </div>
      </div>
      {state.fallback && <p className="rounded-xl bg-mist/60 px-4 py-2.5 text-sm text-cocoa-700">The book catalogue is unreachable right now — showing books from Readscape’s library instead.</p>}
      {state.error && !state.books.length ? (
        <ErrorState error={state.error} onRetry={() => load(1)} />
      ) : !state.loading && !state.books.length ? (
        <EmptyState title="No books found" message="Try another title, author or spelling." />
      ) : (
        <BookGrid books={state.books} loading={state.loading} />
      )}
      {canLoadMore && (
        <div className="flex justify-center">
          <button type="button" className="btn-secondary" disabled={state.more} onClick={() => load(state.page + 1)}>{state.more && <Spinner />}Load more</button>
        </div>
      )}
      {state.error && state.books.length > 0 && <ErrorState error={state.error} onRetry={() => load(state.page + 1)} />}
    </section>
  );
}

function DiscoverRow({ path, ...props }) {
  const { data, loading, error, reload } = useApi(path);
  return <BookRow books={data?.books} loading={loading} error={error} onRetry={reload} {...props} subtitle={props.subtitle?.(data)} />;
}

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const genreSlug = params.get('genre') || '';
  const [input, setInput] = useState(q);
  const genres = useApi('/books/genres');

  useEffect(() => { setInput(q); }, [q]);

  const submit = (e) => {
    e.preventDefault();
    if (input.trim().length >= 2) setParams({ q: input.trim() });
  };

  const back = () => setParams({});
  const genreName = genres.data?.genres.find((g) => g.slug === genreSlug)?.name || 'Genre';

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-cocoa/10 bg-oat-50 px-6 py-8 shadow-soft sm:px-10">
        <Sprig className="absolute -top-2 right-4 hidden h-36 w-28 opacity-90 sm:block" flip />
        <Sprig className="absolute -bottom-10 right-28 hidden h-28 w-20 opacity-60 md:block" />
        <p className="eyebrow">Discover</p>
        <h1 className="mt-1 max-w-xl text-[36px] leading-[1.05] sm:text-[44px]">Find your next favourite book</h1>
        <form onSubmit={submit} className="relative mt-5 max-w-xl" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-cocoa-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Title, author or ISBN…"
            aria-label="Search by title or author"
            className="input rounded-full py-3.5 pr-28 pl-12 text-base"
          />
          {input && <button type="button" onClick={() => { setInput(''); if (q) back(); }} className="absolute top-1/2 right-24 -translate-y-1/2 text-cocoa-400 hover:text-cocoa" aria-label="Clear"><X className="size-4" /></button>}
          <button type="submit" className="btn-primary absolute top-1/2 right-1.5 -translate-y-1/2 py-2" disabled={input.trim().length < 2}>Search</button>
        </form>
        <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
          {genres.data?.genres.map((g) => (
            <button
              key={g.slug}
              type="button"
              onClick={() => setParams(genreSlug === g.slug ? {} : { genre: g.slug })}
              className={cn('chip shrink-0', genreSlug === g.slug ? 'chip-active' : 'hover:border-cocoa/30 hover:bg-mist/50')}
            >
              {g.name}
            </button>
          ))}
        </div>
      </header>

      {q ? (
        <ResultsGrid key={`q-${q}`} path={`/books/search?q=${encodeURIComponent(q)}`} title={`“${q}”`} subtitle="Search results" onBack={back} />
      ) : genreSlug ? (
        <ResultsGrid key={`g-${genreSlug}`} path={`/books/genre/${genreSlug}`} title={genreName} subtitle="Browse by genre" onBack={back} />
      ) : (
        <>
          <DiscoverRow path="/books/trending" title="Trending today" icon={Flame} subtitle={() => 'What readers are opening right now'} />
          <DiscoverRow
            path="/books/recommended"
            title="Recommended for you"
            icon={Sparkles}
            subtitle={(d) => (d?.basedOn?.length ? `Because you enjoy ${d.basedOn.join(', ')}` : 'Shelve a few books to personalise this')}
          />
          <DiscoverRow path="/books/popular" title="Popular this year" icon={Star} subtitle={() => 'Most-read on Open Library this year'} />
          <DiscoverRow path="/books/new" title="New releases" icon={Gem} subtitle={() => 'Fresh titles from the last two years'} />

          <section>
            <h2 className="section-title mb-4">Browse by genre</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {genres.error && <ErrorState error={genres.error} onRetry={genres.reload} className="col-span-full" />}
              {genres.data?.genres.map((g, i) => (
                <Link
                  key={g.slug}
                  to={`/discover?genre=${g.slug}`}
                  className={cn('group relative overflow-hidden rounded-2xl border border-cocoa/8 px-5 py-6 transition hover:-translate-y-0.5 hover:shadow-lift', GENRE_TONES[i % GENRE_TONES.length])}
                >
                  <span className="relative z-10 font-serif text-xl font-semibold">{g.name}</span>
                  <Sprig className="absolute -right-3 -bottom-5 h-20 w-16 opacity-50 transition group-hover:opacity-80" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
