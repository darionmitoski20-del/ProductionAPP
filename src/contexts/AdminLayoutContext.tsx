import { createContext, useContext } from 'react';

interface AdminLayoutContextValue {
  inLayout: boolean;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue>({ inLayout: false });

export function AdminLayoutProvider({
  children,
  inLayout = true,
}: {
  children: React.ReactNode;
  inLayout?: boolean;
}) {
  return (
    <AdminLayoutContext.Provider value={{ inLayout }}>
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  return useContext(AdminLayoutContext);
}
