import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/shared/AuthGuard";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Analysis from "@/pages/Analysis";
import Subscriptions from "@/pages/Subscriptions";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { EmailConnect } from "@/pages/EmailConnect";
import SpendingTrends from "@/pages/SpendingTrends";
import { useAuthStore } from "@/store/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const token = useAuthStore((s) => s.token);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/upload"
            element={
              <AuthGuard>
                <Upload />
              </AuthGuard>
            }
          />
          <Route
            path="/analysis/:id"
            element={
              <AuthGuard>
                <Analysis />
              </AuthGuard>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <AuthGuard>
                <Subscriptions />
              </AuthGuard>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGuard>
                <History />
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          <Route
            path="/email"
            element={
              <AuthGuard>
                <EmailConnect />
              </AuthGuard>
            }
          />
          <Route
            path="/trends"
            element={
              <AuthGuard>
                <SpendingTrends />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
