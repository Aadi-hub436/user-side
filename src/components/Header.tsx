import type { User } from 'firebase/auth';
import { Flame, LogOut, Search, ShoppingBag, X } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalCartCount: number;
  onOpenCart: () => void;
  activeView: 'menu' | 'tracking';
  hasActiveOrder: boolean;
  onNavigateView: (view: 'menu' | 'tracking') => void;
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  totalCartCount,
  onOpenCart,
  activeView,
  hasActiveOrder,
  onNavigateView,
  user,
  authReady,
  isSigningIn,
  onGoogleSignIn,
  onGoogleSignOut,
}: HeaderProps) {
  const firstName = user?.displayName?.split(' ')[0] || 'Account';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigateView('menu')}
          className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 rounded-lg cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
            <Flame className="w-4.5 h-4.5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-900">
            Instant Deliver
          </span>
        </button>

        {/* Zone 2: Desktop Search & Clean View Navigation */}
        <div className="hidden md:flex items-center gap-5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (activeView !== 'menu') {
                  onNavigateView('menu');
                }
              }}
              placeholder="Search dishes like Paneer, Pizza, Biryani..."
              aria-label="Search dishes"
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-zinc-100 border border-transparent text-sm text-zinc-900 placeholder:text-zinc-500 focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <nav className="flex items-center gap-4 text-sm font-medium shrink-0">
            <button
              type="button"
              onClick={() => onNavigateView('menu')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeView === 'menu'
                  ? 'border-orange-600 text-zinc-900 font-semibold'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => {
                onNavigateView('menu');
                window.setTimeout(() => {
                  document
                    .getElementById('order-history')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
              }}
              className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Order History
            </button>
            {hasActiveOrder && (
              <button
                type="button"
                onClick={() => onNavigateView('tracking')}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  activeView === 'tracking'
                    ? 'border-orange-600 text-zinc-900 font-semibold'
                    : 'border-transparent text-orange-600 hover:text-orange-700'
                }`}
              >
                Live Order
              </button>
            )}
          </nav>
        </div>

        {/* Zone 3: Google Account Action & Cart Button */}
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveOrder && (
            <button
              type="button"
              onClick={() => onNavigateView(activeView === 'tracking' ? 'menu' : 'tracking')}
              className="md:hidden min-h-[40px] px-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeView === 'tracking' ? 'Menu' : 'Track'}
            </button>
          )}

          {authReady && !user && (
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isSigningIn}
              aria-label="Sign in with Google for personalized recommendations"
              className="min-h-[40px] sm:min-h-[44px] px-3 sm:px-3.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {isSigningIn ? 'Signing in...' : 'Google Login'}
              </span>
              <span className="sm:hidden">{isSigningIn ? '...' : 'Sign in'}</span>
            </button>
          )}

          {authReady && user && (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 pl-2 pr-1 py-1 shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Google user'}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {firstName.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden sm:inline text-xs font-semibold text-zinc-800 max-w-[90px] truncate">
                {firstName}
              </span>
              <button
                type="button"
                onClick={onGoogleSignOut}
                title="Sign out"
                aria-label="Sign out of Google account"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/70 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Open cart with ${totalCartCount} items`}
            className="relative min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          >
            <ShoppingBag className="w-4 h-4 text-orange-400" aria-hidden="true" />
            <span>Cart</span>
            <span
              className={`min-w-[20px] sm:min-w-[22px] h-[20px] sm:h-[22px] px-1.5 rounded-full text-xs font-bold tabular-nums inline-flex items-center justify-center transition-colors ${
                totalCartCount > 0
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-700 text-zinc-200'
              }`}
            >
              {totalCartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
