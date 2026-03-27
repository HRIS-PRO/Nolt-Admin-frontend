
import React from 'react';
import { UserState, Theme } from '../types';
import { Link } from 'react-router-dom';

interface NavigationProps {
  user: UserState;
  theme: Theme;
  onLogout: () => void;
  onDashboard: () => void;
  onToggleTheme: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  user, theme, onLogout, onDashboard, onToggleTheme
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // console.log("Navigation User Prop:", user);
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <img 
              src="https://noltfinance.s3.us-east-1.amazonaws.com/logo+updated+white.png" 
              alt="NOLT Finance" 
              className="h-8 w-auto dark:brightness-100 [filter:invert(38%)_sepia(98%)_saturate(2136%)_hue-rotate(187deg)_brightness(101%)_contrast(101%)] dark:[filter:none] transition-all duration-300"
              referrerPolicy="no-referrer"
            />
        </Link>

          <nav className="hidden sm:flex items-center">
            <button
              onClick={onDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
              Dashboard
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 group"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined group-hover:rotate-45 transition-transform duration-500">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>

          <div className="flex items-center gap-3 border-l pl-4 border-slate-200 dark:border-slate-800" ref={dropdownRef}>
            <div className="text-right hidden md:block">
              <p className="text-xs font-black text-slate-900 dark:text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.15em] font-bold">Customer</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="group relative focus:outline-none"
                aria-label="Profile Menu"
              >
                <div className={`size-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 ${isOpen ? 'border-primary' : 'border-transparent'} group-hover:border-primary transition-all group-active:scale-90`}>
                  <img
                    src={user.avatar_url || `https://picsum.photos/seed/${user.email}/40/40`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      console.error("Avatar failed to load:", user.avatar_url);
                      e.currentTarget.src = `https://picsum.photos/seed/${user.email}/40/40`;
                    }}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 md:hidden">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/10 font-medium flex items-center gap-2 transition-colors border-b border-slate-100 dark:border-slate-700"
                  >
                    <span className="material-symbols-outlined text-[18px]">account_circle</span>
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
