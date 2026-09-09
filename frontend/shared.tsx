import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const LazyMonaco = lazy(() => import("@monaco-editor/react"));

export function MonacoEditor(props: React.ComponentProps<typeof LazyMonaco>) {
  const height = typeof props.height === "number" ? `${props.height}px` : props.height;
  return (
    <Suspense
      fallback={
        <div className="editorLoading" style={{ height }}>
          <RefreshCw className="spin" /> Загружаем редактор…
        </div>
      }
    >
      <LazyMonaco {...props} />
    </Suspense>
  );
}

export async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the selection-based path below
  }
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

export function useCopyAction() {
  const [copiedKey, setCopiedKey] = useState("");
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async (value: string, key = "default") => {
    const ok = await copyText(value);
    setFailed(!ok);
    setCopiedKey(ok ? key : "");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopiedKey("");
      setFailed(false);
    }, 1800);
  };
  return { copy, copiedKey, failed };
}

export function formatBytes(value: number | null | undefined) {
  if (value == null) return "Без лимита";
  if (value === 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ", "ПБ"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index > 2 ? 2 : 1)} ${units[index]}`;
}
