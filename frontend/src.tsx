import { Component, Suspense, lazy, type ReactNode } from "react";
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
// A render error used to blank the page with nothing in the server logs, since
// the throw unmounts the whole tree. Show it instead.
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[mihomo-hub]", error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crashScreen">
        <h1>Страница не открылась</h1>
        <p>
          Произошла ошибка на стороне браузера. Перезагрузите страницу; если это
          повторяется, сообщите текст ниже.
        </p>
        <pre>{this.state.error.message}</pre>
        <button className="primary" onClick={() => window.location.reload()}>
          Перезагрузить
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
  <BrowserRouter>
    <Suspense fallback={<div className="bootSplash" />}>
      <Routes>
        <Route path="/subscription/:slug" element={<SubscriptionPage />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
  </ErrorBoundary>,
);
