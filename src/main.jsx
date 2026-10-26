import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.jsx";
import { initializeFirebaseAppCheck } from "./lib/firebaseAppCheck.js";
import { initObservability } from "./lib/observability.js";
import "./styles/global.css";
import "./styles/wordSpelling.css";

void initializeFirebaseAppCheck().catch((error) => {
  if (import.meta.env.DEV) {
    console.warn("[app-check] initialization failed", error);
  }
});
void initObservability();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary
      eyebrow="App Error"
      title="앱을 불러오지 못했습니다"
      onRetry={() => window.location.reload()}
      onHome={() => window.location.assign("/")}
    >
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
