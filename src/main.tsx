import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./main.css";
import { AuthProvider } from "./contexts/AuthContext";
import { PermsProvider } from "./contexts/PermsContext";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <PermsProvider>
          <App />
        </PermsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
