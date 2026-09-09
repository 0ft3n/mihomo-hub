import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import "./style.css";

// The public hand-off page and the operator panel share almost nothing.
// Splitting them keeps the panel's editor, admin and YAML tooling out of a
// recipient's download, which is usually a phone on a cold connection.
const SubscriptionPage = lazy(() => import("./public"));
const AppShell = lazy(() => import("./app"));

// The backend owns /api, /sub, /s, /c and /rule-sets, and a browser hitting an
// issued link is redirected to /subscription/<slug>. The panel therefore lives
// under its own /app prefix so no future backend path can collide with it.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Suspense fallback={<div className="bootSplash" />}>
      <Routes>
        <Route path="/subscription/:slug" element={<SubscriptionPage />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>,
);
