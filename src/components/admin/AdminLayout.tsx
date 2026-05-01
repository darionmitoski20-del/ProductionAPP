import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { AdminLayoutProvider } from '@/contexts/AdminLayoutContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  Users,
  BarChart3,
  LogOut,
  ChefHat,
  Home,
  Menu,
  Palette,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const SIDEBAR_LINKS = [
  { to: '/admin', end: true, labelKey: 'admin.layout.dashboard', icon: LayoutDashboard },
  { to: '/admin/menu', end: false, labelKey: 'admin.layout.products', icon: UtensilsCrossed },
  { to: '/admin/categories', end: false, labelKey: 'admin.layout.categories', icon: FolderTree },
  { to: '/admin/staff', end: false, labelKey: 'admin.layout.staff', icon: Users },
  { to: '/admin/reports', end: false, labelKey: 'admin.layout.reports', icon: BarChart3 },
  { to: '/admin/hours', end: false, labelKey: 'admin.layout.businessHours', icon: Clock },
  { to: '/admin/design', end: false, labelKey: 'admin.layout.design', icon: Palette },
] as const;

function getPageTitleKey(pathname: string): string {
  if (pathname === '/admin' || pathname === '/admin/') return 'admin.layout.pageTitleDashboard';
  if (pathname.startsWith('/admin/orders')) return 'admin.layout.pageTitleOrders';
  if (pathname.startsWith('/admin/menu')) return 'admin.layout.pageTitleProducts';
  if (pathname.startsWith('/admin/categories')) return 'admin.layout.pageTitleCategories';
  if (pathname.startsWith('/admin/staff')) return 'admin.layout.pageTitleStaff';
  if (pathname.startsWith('/admin/reports')) return 'admin.layout.pageTitleReports';
  if (pathname.startsWith('/admin/hours')) return 'admin.layout.pageTitleHours';
  if (pathname.startsWith('/admin/design')) return 'admin.layout.pageTitleDesign';
  return 'admin.layout.pageTitleAdmin';
}

export function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isDemo } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const sidebarLinks = SIDEBAR_LINKS.filter(link => {
    if (isDemo && link.to === '/admin/design') return false;
    return true;
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    html.style.overflow = 'hidden';
    html.style.height = '100dvh';
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';
    body.style.margin = '0';
    if (root) {
      root.style.height = '100dvh';
      root.style.overflow = 'hidden';
    }
    return () => {
      html.style.overflow = '';
      html.style.height = '';
      body.style.overflow = '';
      body.style.height = '';
      body.style.margin = '';
      if (root) {
        root.style.height = '';
        root.style.overflow = '';
      }
    };
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const ro = new ResizeObserver(() => {
      const max = main.scrollHeight - main.clientHeight;
      if (main.scrollTop > max) main.scrollTop = Math.max(0, max);
    });
    ro.observe(main);
    if (main.firstElementChild) ro.observe(main.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const closeDrawer = () => setSidebarOpen(false);

  const navContent = (
    <>
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2 min-w-0">
        <NavLink to="/admin" className="flex items-center gap-2 [&_.gradient-hero]:!bg-primary min-w-0 flex-1" onClick={closeDrawer}>
          <Logo showText={false} className="[&_svg]:!text-white shrink-0" />
          <span className="font-semibold text-white truncate">{t('admin.layout.admin')}</span>
        </NavLink>
      </div>
      <nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map(({ to, end, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeDrawer}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <NavLink
          to="/kitchen"
          className="flex gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
          onClick={closeDrawer}
        >
          <ChefHat className="h-4 w-4" />
          {t('admin.layout.kitchen')}
        </NavLink>
        <NavLink
          to="/"
          className="flex gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
          onClick={closeDrawer}
        >
          <Home className="h-4 w-4" />
          {t('admin.layout.customerMenu')}
        </NavLink>
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            {t('admin.layout.signOut')}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex bg-[#F6F7F8] overflow-hidden">
      {/* Mobile header: hamburger + title */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4 bg-zinc-900 text-zinc-100 border-b border-zinc-800">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={() => setSidebarOpen(true)}
          aria-label={t('admin.layout.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-white truncate flex-1 min-w-0">
          {t(getPageTitleKey(location.pathname))}
        </span>
        <div className="shrink-0 flex items-center">
          <LanguageSwitcher variant="admin" />
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside className="relative flex min-h-0 w-64 max-h-[100dvh] max-w-[85vw] shrink-0 flex-col overflow-y-auto overscroll-contain bg-zinc-900 text-zinc-100 shadow-xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar: fixed height to viewport; nav scrolls inside if needed */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col h-full min-h-0 overflow-hidden bg-zinc-900 text-zinc-100">
        {navContent}
      </aside>

      {/* Main column: header fixed in column; only main scrolls (stable gutter on md+) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        <header className="hidden md:flex h-14 shrink-0 items-center justify-end gap-3 px-4 lg:px-6 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <LanguageSwitcher variant="header" />
        </header>
        <main ref={mainRef} className="flex-1 min-w-0 min-h-0 bg-[#F6F7F8] pt-14 md:pt-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
          <AdminLayoutProvider>
            <Outlet />
          </AdminLayoutProvider>
        </main>
      </div>
    </div>
  );
}
