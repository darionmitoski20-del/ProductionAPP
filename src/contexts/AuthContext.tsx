import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isDemoUserEmail } from '@/lib/isDemoUserEmail';

const LOG_PREFIX = '[AuthContext]';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isDemo: boolean;
  role: 'admin' | 'staff' | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Returns true if the error is auth-related (401/403 or JWT). */
function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; status?: number; message?: string };
  if (e.code === 'PGRST301' || e.status === 401 || e.status === 403) return true;
  if (typeof e.message === 'string' && /jwt|unauthorized|forbidden/i.test(e.message)) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [rolesReady, setRolesReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);

  const profileFetchInFlight = useRef(false);
  const visibilityHandlerAttached = useRef(false);

  const loading = !authReady || !rolesReady;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthReady(true);

        if (!session?.user) {
          setIsAdmin(false);
          setIsStaff(false);
          setIsDemo(false);
          setRole(null);
          setRolesReady(true);
        } else {
          setIsDemo(isDemoUserEmail(session.user.email));
          setRolesReady(false);
        }
      }
    );

    let mounted = true;
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setIsDemo(isDemoUserEmail(session?.user?.email));
        setAuthReady(true);
        if (!session?.user) setRolesReady(true);
      })
      .catch((err) => {
        console.error(LOG_PREFIX, 'getSession failed', err);
        if (mounted) {
          setAuthReady(true);
          setRolesReady(true);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfileRef = useRef<(uid: string) => Promise<void>>(null!);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setIsAdmin(false);
      setIsStaff(false);
      setIsDemo(false);
      setRole(null);
      setRolesReady(true);
      return;
    }

    const userId = user.id;
    let cancelled = false;

    const fetchProfile = async (overrideUserId?: string) => {
      const uid = overrideUserId ?? userId;
      if (profileFetchInFlight.current) {
        return;
      }
      profileFetchInFlight.current = true;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();

        if (cancelled) return;
        if (profileError) throw profileError;

        if (profile?.role) {
          const isAdminRole = profile.role === 'ADMIN';
          const isStaffRole = profile.role === 'STAFF' || profile.role === 'ADMIN';
          setIsAdmin(isAdminRole);
          setIsStaff(isStaffRole);
          setRole(isAdminRole ? 'admin' : 'staff');
        } else {
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', uid);

          if (cancelled) return;
          if (rolesError) throw rolesError;

          if (roles?.length) {
            const isAdminRole = roles.some((r) => r.role === 'admin');
            const isStaffRole = roles.some((r) => r.role === 'staff' || r.role === 'admin');
            setIsAdmin(isAdminRole);
            setIsStaff(isStaffRole);
            setRole(isAdminRole ? 'admin' : roles.some((r) => r.role === 'staff') ? 'staff' : null);
          } else {
            setIsAdmin(false);
            setIsStaff(false);
            setRole(null);
          }
        }
        setIsDemo(isDemoUserEmail(user?.email));
      } catch (err) {
        if (cancelled) return;
        console.error(LOG_PREFIX, 'fetchProfile failed', err);
        if (isAuthError(err)) {
          console.warn(LOG_PREFIX, 'auth error — clearing session');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setIsStaff(false);
          setIsDemo(false);
          setRole(null);
        } else {
          // Demo flag is from email, not profile. If profile fetch fails (network/RLS), keep demo
          // users able to open admin and use in-memory demo mode on production.
          const demo = isDemoUserEmail(user?.email);
          setIsDemo(demo);
          if (demo) {
            setIsAdmin(true);
            setIsStaff(true);
            setRole('admin');
          } else {
            setIsAdmin(false);
            setIsStaff(false);
            setRole(null);
          }
        }
      } finally {
        profileFetchInFlight.current = false;
        if (!cancelled) {
          setRolesReady(true);
        }
      }
    };

    fetchProfileRef.current = (id: string) => fetchProfile(id);
    fetchProfile();

    return () => { cancelled = true; };
  }, [authReady, user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log(LOG_PREFIX, 'signInWithPassword using project URL', import.meta.env.VITE_SUPABASE_URL);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(LOG_PREFIX, 'signInWithPassword failed', error);
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  useEffect(() => {
    if (visibilityHandlerAttached.current) return;
    visibilityHandlerAttached.current = true;

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      supabase.auth.getUser()
        .then(({ data: { user: u } }) => {
          if (u?.id && fetchProfileRef.current) fetchProfileRef.current(u.id);
        })
        .catch((err) => {
          console.error(LOG_PREFIX, 'getUser on visibility failed', err);
        });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      visibilityHandlerAttached.current = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        isStaff,
        isDemo,
        role,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
