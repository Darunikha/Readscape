import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Compass, House, Library, LogOut, Search, UserRound, Users, ChevronDown, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui';
import Popover, { MenuItem, MenuDivider } from '../ui/Popover';
import { Bow, BookStack, Sparkle, Sprig } from '../decor/Decor';
import { cn } from '../../lib/utils';

export const NAV = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/shelf', label: 'My Bookshelf', short: 'Shelf', icon: Library },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="group inline-flex flex-col items-center text-center">
      {!compact && <Bow className="mb-1 h-10 w-14 transition group-hover:-rotate-3" />}
      <span className={cn('font-serif font-semibold tracking-tight text-cocoa', compact ? 'text-2xl' : 'text-[32px] leading-none')}>Readscape</span>
      {!compact && <span className="mt-1.5 text-[12px] tracking-[0.12em] text-cocoa-400">Read · Track · Share</span>}
    </Link>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-hidden border-r border-cocoa/10 bg-oat-150/70 lg:flex">
      <div className="relative px-6 pt-9 pb-8 text-center">
        <Sparkle className="absolute top-12 left-6 size-3" />
        <Logo />
        <Sparkle className="mx-auto mt-3 size-3" color="#93A8AD" />
      </div>
      <nav className="flex flex-col gap-1.5 px-4" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'flex items-center gap-3.5 rounded-full px-5 py-3 text-[15px] transition',
              isActive ? 'bg-cocoa-100 font-medium text-cocoa shadow-[inset_0_0_0_1px_rgb(104_79_72/0.08)]' : 'text-cocoa-500 hover:bg-cocoa-50 hover:text-cocoa',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('size-5', isActive && 'fill-cocoa-200/60')} strokeWidth={isActive ? 2 : 1.6} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="pointer-events-none relative mt-auto h-60">
        <Sprig className="absolute bottom-24 left-4 h-36 w-28" />
        <Sparkle className="absolute top-6 right-16 size-3" />
        <BookStack className="absolute -bottom-1 left-6 w-44" tones={['silver', 'mist', 'silver']} ribbon />
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cocoa/10 bg-oat-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
      <div className="mx-auto flex max-w-lg justify-around px-2">
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition', isActive ? 'text-cocoa' : 'text-cocoa-400')}
          >
            {({ isActive }) => (
              <>
                <span className={cn('rounded-full px-4 py-1 transition', isActive && 'bg-cocoa-100')}><Icon className="size-5" strokeWidth={isActive ? 2 : 1.6} /></span>
                {short || label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');

  useEffect(() => {
    setQ(location.pathname === '/discover' ? params.get('q') || '' : '');
  }, [location.pathname, params]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim().length >= 2) navigate(`/discover?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-oat-100/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-10 lg:py-5">
        <div className="lg:hidden"><Logo compact /></div>
        <form onSubmit={submit} className="relative ml-auto max-w-xl flex-1 lg:ml-0" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-cocoa-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for books or authors…"
            aria-label="Search books"
            className="w-full rounded-full border border-cocoa/15 bg-oat-50/90 py-2.5 pr-4 pl-11 text-[15px] outline-none transition placeholder:text-cocoa-400 focus:border-silver-600 focus:ring-3 focus:ring-mist/70"
          />
        </form>
        <Sparkle className="hidden size-3 xl:ml-auto xl:block" color="#93A8AD" />
        <Popover
          align="end"
          width={220}
          trigger={(open) => (
            <button type="button" className="ml-auto flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition hover:bg-cocoa-50 xl:ml-4" aria-label="Account menu" aria-expanded={open}>
              <Avatar user={user} size={40} />
              <ChevronDown className={cn('hidden size-4 text-cocoa-500 transition sm:block', open && 'rotate-180')} />
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="px-3 py-2">
                <p className="truncate font-serif text-lg font-semibold">{user.displayName || user.username}</p>
                <p className="truncate text-[13px] text-cocoa-400">@{user.username}</p>
              </div>
              <MenuDivider />
              <MenuItem icon={UserRound} onClick={() => { close(); navigate('/profile'); }}>Your profile</MenuItem>
              <MenuItem icon={Settings} onClick={() => { close(); navigate('/profile?edit=1'); }}>Edit profile</MenuItem>
              <MenuDivider />
              <MenuItem icon={LogOut} onClick={() => { close(); logout(); navigate('/login'); }}>Log out</MenuItem>
            </div>
          )}
        </Popover>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main key={location.pathname} className="mx-auto max-w-7xl animate-page px-4 pt-2 pb-28 sm:px-6 lg:px-10 lg:pb-16">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
