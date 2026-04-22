import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DesignSettingsProvider } from "@/contexts/DesignSettingsContext";
import Index from "./pages/Index";
import Cart from "./pages/Cart";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import Auth from "./pages/Auth";
import { AdminLayout } from "./components/admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminMenu from "./pages/AdminMenu";
import AdminCategories from "./pages/AdminCategories";
import AdminStaff from "./pages/AdminStaff";
import AdminReports from "./pages/AdminReports";
import AdminDesign from "./pages/AdminDesign";
import AdminBusinessHours from "./pages/AdminBusinessHours";
import Kitchen from "./pages/Kitchen";
import KitchenCompleted from "./pages/KitchenCompleted";
import NotFound from "./pages/NotFound";
import { RequireAdminRoute } from "@/components/RequireAdminRoute";
import { RequireStaffRoute } from "@/components/RequireStaffRoute";
import { ActiveOrderReadyNotifier } from "@/components/ActiveOrderReadyNotifier";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

/** Vite `BASE_URL` is e.g. `/` or `/subdir/` — React Router expects basename without trailing slash (omit for root). */
const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <DesignSettingsProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/order/:orderId" element={<OrderTracking />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<RequireAdminRoute><AdminLayout /></RequireAdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="menu" element={<AdminMenu />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="analytics" element={<Navigate to="/admin/reports" replace />} />
              <Route path="hours" element={<AdminBusinessHours />} />
              <Route path="design" element={<AdminDesign />} />
            </Route>
            <Route path="/kitchen" element={<RequireStaffRoute><Kitchen /></RequireStaffRoute>} />
          <Route path="/kitchen/completed" element={<RequireStaffRoute><KitchenCompleted /></RequireStaffRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ActiveOrderReadyNotifier />
          </DesignSettingsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
