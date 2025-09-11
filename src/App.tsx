// Import the functions you need from the SDKs you need

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RolesDashboard from "./pages/DashboardPage";
import Login from "./components/auth/Login";
import NavBar from "./components/common/NavBar";
import { AuthGuard } from "./contexts/AuthGuard";
import RolesCatalog from "./pages/RolesCatalog";
import RoleDetailsPage from "./pages/RoleDetailsPage";
import TrackedRoleDetailsPage from "./pages/TrackedRoleDetailsPage";

// Tiny layout wrapper
function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* show NavBar on all routes except login */}
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected area */}
        <Route
          path="/roles"
          element={
            <AuthGuard>
              <PageLayout>
                <RolesDashboard />
              </PageLayout>
            </AuthGuard>
          }
        />

        {/* Default: redirect root based on auth (simple version) */}
        <Route path="/" element={<Navigate to="/roles" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/catalog" element={<RolesCatalog />} />
        <Route path="/catalog/:roleId" element={<RoleDetailsPage />} />
        <Route
          path="/roles/:roleId"
          element={
            <AuthGuard>
              <TrackedRoleDetailsPage />
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
