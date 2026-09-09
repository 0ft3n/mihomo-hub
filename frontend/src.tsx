import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

// The public hand-off page and the operator panel share almost nothing.
// Splitting them keeps the panel's editor, admin and YAML tooling out of a
// recipient's download, which is usually a phone on a cold connection.
const SubscriptionPage = lazy(() => import("./public"));
const App = lazy(() => import("./app"));

const publicSubscriptionMatch = window.location.pathname.match(
  /^\/subscription\/([^/]+)\/?$/,
);

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="bootSplash" />}>
    {publicSubscriptionMatch ? (
      <SubscriptionPage slug={decodeURIComponent(publicSubscriptionMatch[1])} />
    ) : (
      <App />
    )}
  </Suspense>,
);
