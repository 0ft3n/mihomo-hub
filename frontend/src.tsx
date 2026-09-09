import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Clipboard,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCog,
  FileText,
  Globe2,
  GripVertical,
  HardDrive,
  KeyRound,
  Laptop,
  LayoutDashboard,
  LogOut,
  Moon,
  Pause,
  RefreshCw,
  Route,
  Save,
  Server,
  Settings,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import "./style.css";

const API = "/api";
const RULE_TYPES = [
  "DOMAIN",
  "DOMAIN-SUFFIX",
  "DOMAIN-KEYWORD",
  "DOMAIN-REGEX",
  "GEOSITE",
  "GEOIP",
  "IP-ASN",
  "IP-CIDR",
  "IP-CIDR6",
  "SRC-IP-CIDR",
  "DST-PORT",
  "SRC-PORT",
  "PROCESS-NAME",
  "PROCESS-PATH",
  "RULE-SET",
  "MATCH",
];
const newRuleId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const moveItem = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};
type Profile = {
  id: number;
  name: string;
  url: string;
  slug: string;
  enabled: boolean;
  modifications: any;
  config_url?: string;
  legacy_url?: string;
};
type Sub = {
  id: number;
  name: string;
  source_url: string;
  enabled: boolean;
  source_meta: any;
  profiles: Profile[];
  yaml?: string;
};
type DefaultProfile = {
  name: string;
  modifications: any;
  enabled: boolean;
};
type CustomRuleSet = {
  name: string;
  behavior: "classical" | "domain" | "ipcidr";
  payload: string;
  enabled: boolean;
};
type CustomProxyEntry = {
  id: string;
  proxy: Record<string, any>;
  groups: string[];
};
type ProxyProbeResult = {
  name: string;
  status: "pending" | "ok" | "error";
  delay: number | null;
  error?: string;
  stage?: "upstream" | "target" | "complete";
  upstream_delay?: number | null;
};
type ProxyProbeResponse = {
  best: ProxyProbeResult | null;
  results: ProxyProbeResult[];
  tested: number;
  successful: number;
  diagnosis?: string;
};
type ProxyProbeEvent =
  | { type: "start"; names: string[]; tested: number }
  | { type: "ready" }
  | { type: "result"; result: ProxyProbeResult; completed: number; tested: number }
  | { type: "complete"; best: ProxyProbeResult | null; tested: number; successful: number; diagnosis?: string }
  | { type: "error"; message: string };
const defaultCustomProxy = (): CustomProxyEntry => ({
  id: newRuleId(),
  proxy: {
    name: "Новый сервер",
    type: "vless",
    server: "",
    port: 443,
    uuid: "",
    network: "tcp",
    udp: true,
    "packet-encoding": "xudp",
    encryption: "",
    tls: true,
    servername: "",
    flow: "xtls-rprx-vision",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": "", "short-id": "" },
  },
  groups: [],
});
function normalizeCustomProxies(value: unknown): CustomProxyEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: any) => {
    if (!entry || typeof entry !== "object") return [];
    const proxy = entry.proxy && typeof entry.proxy === "object" ? entry.proxy : entry;
    if (!proxy.name || !proxy.type) return [];
    return [{
      id: newRuleId(),
      proxy: structuredClone(proxy),
      groups: Array.isArray(entry.groups) ? [...entry.groups] : [],
    }];
  });
}
function catalogFromYaml(text = "") {
  try {
    const parsed = parseYaml(text) || {};
    return {
      proxies: Array.isArray(parsed.proxies)
        ? parsed.proxies
            .filter((item: any) => item && typeof item.name === "string")
            .map((item: any) => item.name)
        : [],
      groups: Array.isArray(parsed["proxy-groups"])
        ? parsed["proxy-groups"]
            .filter((item: any) => item && typeof item.name === "string")
            .map((item: any) => item.name)
        : [],
      ruleProviders:
        parsed["rule-providers"] &&
        typeof parsed["rule-providers"] === "object"
          ? Object.keys(parsed["rule-providers"])
          : [],
    };
  } catch {
    return { proxies: [], groups: [], ruleProviders: [] };
  }
}
async function copyText(value: string) {
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

function useCopyAction() {
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

function useDialog(onClose: () => void, active = true) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current as HTMLElement | null;
    node?.querySelector<HTMLElement>(
      "input:not([type=hidden]),textarea,select,button:not(.modalClose),[href],[tabindex]:not([tabindex='-1'])",
    )?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // an open dropdown owns Escape first; closing the dialog would discard the edit
        if (document.querySelector(".customSelect.open, .comboBox.open")) return;
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const focusable = [...node.querySelectorAll<HTMLElement>(
        "input:not([type=hidden]):not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled),[href],[tabindex]:not([tabindex='-1'])",
      )].filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      opener?.focus?.();
    };
  }, [active]);
  return ref;
}

function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);
}

const token = () => localStorage.getItem("token");
let activeRequests = 0;
function emitLoading() {
  window.dispatchEvent(
    new CustomEvent("mihomo-loading", { detail: activeRequests > 0 }),
  );
}
async function api(path: string, options: any = {}) {
  activeRequests += 1;
  emitLoading();
  try {
    const r = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token()}`,
        ...options.headers,
      },
    });
    if (!r.ok)
      throw new Error(
        (await r.json().catch(() => ({}))).detail || "Ошибка запроса",
      );
    return r.status === 204 ? null : r.json();
  } finally {
    activeRequests = Math.max(activeRequests - 1, 0);
    emitLoading();
  }
}

async function streamApi(
  path: string,
  options: any,
  onEvent: (event: ProxyProbeEvent) => void,
): Promise<ProxyProbeResponse> {
  activeRequests += 1;
  emitLoading();
  try {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
        Authorization: `Bearer ${token()}`,
        ...options.headers,
      },
    });
    if (!response.ok)
      throw new Error((await response.json().catch(() => ({}))).detail || "Ошибка запуска проверки");
    if (!response.body) throw new Error("Браузер не поддерживает потоковый ответ проверки");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed: ProxyProbeResponse | undefined;
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as ProxyProbeEvent;
        onEvent(event);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "complete")
          completed = { ...event, results: [] };
      }
      if (chunk.done) break;
    }
    if (!completed) throw new Error("Проверка завершилась без итогового результата");
    return completed;
  } finally {
    activeRequests = Math.max(activeRequests - 1, 0);
    emitLoading();
  }
}

type PublicProfileInfo = {
  title: string;
  profile_name: string;
  enabled: boolean;
  updated_at: string;
  created_at: string;
  limits?: {
    used?: number;
    total?: number;
    remaining?: number | null;
    expire_at?: string | null;
  };
  proxy_count: number;
  group_count: number;
  rule_count: number;
  proxy_types: string[];
  subscription_url: string;
  config_url: string;
  legacy_url: string;
  yaml_url: string;
};

const PUBLIC_CLIENTS = [
  {
    id: "koala",
    name: "Koala Clash",
    platforms: ["windows", "macos", "linux"],
    href: "",
    accent: "#50d4c5",
  },
  {
    id: "verge",
    name: "Clash Verge Rev",
    platforms: ["windows", "macos", "linux"],
    href: "https://github.com/clash-verge-rev/clash-verge-rev/releases",
    accent: "#60a5fa",
  },
  {
    id: "flclash",
    name: "FlClash",
    platforms: ["windows", "android", "macos", "linux"],
    href: "https://github.com/chen08209/FlClash/releases",
    accent: "#a78bfa",
  },
];

const PUBLIC_PLATFORMS = [
  { id: "windows", label: "Windows" },
  { id: "android", label: "Android" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
];

function daysWord(value: number) {
  if (value % 100 >= 11 && value % 100 <= 14) return "дней";
  if (value % 10 === 1) return "день";
  if (value % 10 >= 2 && value % 10 <= 4) return "дня";
  return "дней";
}

function SubscriptionPage({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicProfileInfo>();
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [tab, setTab] = useState<"install" | "yaml">("install");
  const [platform, setPlatform] = useState("windows");
  const [clientId, setClientId] = useState("koala");
  const [yamlText, setYamlText] = useState("");
  const [yamlLoading, setYamlLoading] = useState(false);
  const { copy, copiedKey, failed: copyFailed } = useCopyAction();
  const copied = copiedKey === "subscription";
  const configCopied = copiedKey === "config";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => {
    fetch(`/api/public/profile/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || "Подписка не найдена");
        return response.json();
      })
      .then((profile: PublicProfileInfo) => {
        setData(profile);
        document.title = `${profile.title} — Mihomo Hub`;
      })
      .catch((reason) => setError(reason.message));
  }, [slug]);

  const availableClients = PUBLIC_CLIENTS.filter((client) => client.platforms.includes(platform));
  const selectedClient = availableClients.find((client) => client.id === clientId) || availableClients[0];
  useEffect(() => {
    if (!availableClients.some((client) => client.id === clientId)) setClientId(availableClients[0]?.id || "flclash");
  }, [platform]);

  const copySubscription = () => data && copy(data.subscription_url, "subscription");
  const copyConfig = () => data && copy(data.config_url, "config");
  const openYaml = async () => {
    setTab("yaml");
    if (!data || yamlText || yamlLoading) return;
    setYamlLoading(true);
    try {
      const response = await fetch(data.yaml_url, { headers: { Accept: "text/yaml" } });
      if (!response.ok) throw new Error("Не удалось загрузить YAML");
      setYamlText(await response.text());
    } catch (reason: any) {
      setYamlText(`# ${reason.message || "Не удалось загрузить YAML"}`);
    } finally {
      setYamlLoading(false);
    }
  };

  if (error) return (
    <div className="publicSubPage publicSubCenter">
      <div className="publicErrorCard"><Shield /><h1>Ссылка недоступна</h1><p>{error}</p></div>
    </div>
  );
  if (!data) return (
    <div className="publicSubPage publicSubCenter">
      <div className="publicLoader"><Route /><i /><span>Загружаем подписку</span></div>
    </div>
  );

  const expires = data.limits?.expire_at ? new Date(data.limits.expire_at) : null;
  const daysLeft = expires ? Math.max(Math.ceil((expires.getTime() - Date.now()) / 86_400_000), 0) : null;
  const trafficPercent = data.limits?.total ? Math.min(((data.limits.used || 0) / data.limits.total) * 100, 100) : 0;

  return (
    <div className="publicSubPage">
      <div className="publicGrid" />
      <header className="publicHeader">
        <a className="publicBrand" href="/">
          <span><Route /></span><b>Mihomo <em>Hub</em></b>
        </a>
        <div className="publicHeaderActions">
          <button onClick={copySubscription}>{copied ? <Check /> : <Copy />}<span>{copied ? "Скопировано" : "Скопировать ссылку"}</span></button>
          <button
            className="publicTheme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </div>
      </header>

      <main className="publicContent">
        <section className="publicHero">
          <div className="publicEyebrow"><i /> Безопасная подписка Mihomo</div>
          <h1>{data.title}</h1>
          <p>Готовая конфигурация для ваших устройств. Установите клиент, добавьте ссылку и подключайтесь.</p>
        </section>

        <section className="publicSubscriptionCard">
          <div className="publicSubIdentity">
            <span className={data.enabled ? "publicStatusIcon" : "publicStatusIcon off"}>{data.enabled ? <Check /> : <Pause />}</span>
            <div><small>ПРОФИЛЬ</small><b>{data.profile_name}</b><p>{data.enabled ? "Активен" : "Отключён владельцем"} · обновлён {new Date(data.updated_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
          </div>
          <div className="publicStats">
            <div><Wifi /><span><small>Серверов</small><b>{data.proxy_count}</b></span></div>
            <div><HardDrive /><span><small>Осталось</small><b>{data.limits?.remaining == null ? "∞" : formatBytes(data.limits.remaining)}</b></span></div>
            <div><Clock3 /><span><small>Срок</small><b>{daysLeft == null ? "Без срока" : `${daysLeft} ${daysWord(daysLeft)}`}</b></span></div>
          </div>
          {data.limits?.total ? <div className="publicTraffic"><i style={{ width: `${trafficPercent}%` }} /><span>Использовано {formatBytes(data.limits.used || 0)} из {formatBytes(data.limits.total)}</span></div> : null}
        </section>

        <div className="publicTabs">
          <button className={tab === "install" ? "active" : ""} onClick={() => setTab("install")}><Download /> Установка</button>
          <button className={tab === "yaml" ? "active" : ""} onClick={openYaml}><Code2 /> Исходный YAML</button>
        </div>

        {tab === "install" ? (
          <section className="publicInstallCard">
            <div className="publicSectionHead">
              <div><small>БЫСТРЫЙ СТАРТ</small><h2>Подключение за пару минут</h2></div>
              <div className="publicPlatformSelect">
                <Laptop />
                <select value={platform} onChange={(event) => setPlatform(event.target.value)}>
                  {PUBLIC_PLATFORMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
            </div>

            <div className="publicClients">
              {availableClients.map((client) => (
                <button key={client.id} className={selectedClient?.id === client.id ? "active" : ""} onClick={() => setClientId(client.id)} style={{ "--client-accent": client.accent } as React.CSSProperties}>
                  <span>{client.name.slice(0, 1)}</span><b>{client.name}</b>{selectedClient?.id === client.id ? <Check /> : null}
                </button>
              ))}
            </div>

            <div className="publicSteps">
              <article><span>1</span><div><h3>Установите {selectedClient?.name}</h3><p>Скачайте актуальную версию клиента для {PUBLIC_PLATFORMS.find((item) => item.id === platform)?.label}.</p>{selectedClient?.href ? <a href={selectedClient.href} target="_blank" rel="noreferrer"><Download /> Скачать приложение <ExternalLink /></a> : <div className="publicInstalled"><Check /> Уже установлен</div>}</div></article>
              <article><span>2</span><div><h3>Скопируйте ссылку</h3><p>Универсальная ссылка подходит для импорта и открывает эту страницу в браузере. Не передавайте персональные ссылки другим людям.</p><div className="publicLinkGroup"><label><span>Универсальная</span><div className="publicLinkBox"><code>{data.subscription_url}</code><button onClick={copySubscription} aria-label="Скопировать универсальную ссылку">{copied ? <Check /> : <Copy />}</button></div></label><label><span>Только конфиг</span><div className="publicLinkBox"><code>{data.config_url}</code><button onClick={copyConfig} aria-label="Скопировать ссылку только на конфиг">{configCopied ? <Check /> : <Copy />}</button></div></label></div></div></article>
              <article><span>3</span><div><h3>Добавьте профиль</h3><p>Откройте раздел профилей в приложении, выберите импорт по URL и вставьте скопированную ссылку.</p><button className="publicPrimary" onClick={copySubscription}>{copied ? <Check /> : <Clipboard />} {copied ? "Ссылка скопирована" : "Скопировать для импорта"}</button></div></article>
            </div>
          </section>
        ) : (
          <section className="publicYamlCard">
            <div className="publicYamlHead"><div><FileText /><span><b>{data.profile_name}.yaml</b><small>Текущая конфигурация подписки</small></span></div><div><button onClick={() => copy(yamlText, "yaml")} disabled={!yamlText}>{copiedKey === "yaml" ? <Check /> : <Copy />} {copiedKey === "yaml" ? "Скопировано" : "Копировать"}</button><a href={data.yaml_url} target="_blank" rel="noreferrer"><ExternalLink /> Raw</a></div></div>
            <div className="publicYamlEditor">
              {yamlLoading ? <div className="publicYamlLoading"><RefreshCw className="spin" /> Загружаем конфигурацию…</div> : <MonacoEditor height="520px" language="yaml" theme={theme === "light" ? "light" : "vs-dark"} value={yamlText} options={{ readOnly: true, minimap: { enabled: true }, fontSize: 12, lineHeight: 20, scrollBeyondLastLine: false, wordWrap: "off", automaticLayout: true }} />}
            </div>
          </section>
        )}

        {copyFailed && (
          <div className="publicCopyFallback" role="alert">
            <AlertTriangle /> Браузер не дал скопировать автоматически — выделите ссылку и скопируйте вручную.
          </div>
        )}

        <footer className="publicFooter"><span><Shield /> Ссылка защищена случайным токеном</span><span>Mihomo Hub · современное управление подписками</span></footer>
      </main>
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(!!token());
  const [subs, setSubs] = useState<Sub[]>([]);
  const [customRuleSets, setCustomRuleSets] = useState<CustomRuleSet[]>([]);
  const [active, setActive] = useState<number>();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [admin, setAdmin] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSubscriptionUrl, setNewSubscriptionUrl] = useState("");
  const [addError, setAddError] = useState("");
  const addDialogRef = useDialog(() => {
    if (!networkBusy) setAddOpen(false);
  }, addOpen);
  useEffect(() => {
    const listener = (event: Event) =>
      setNetworkBusy((event as CustomEvent<boolean>).detail);
    window.addEventListener("mihomo-loading", listener);
    return () => window.removeEventListener("mihomo-loading", listener);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);
  const load = () =>
    Promise.all([api("/subscriptions"), api("/rule-sets")])
      .then(([subscriptions, ruleSets]) => {
        setSubs(subscriptions);
        setCustomRuleSets(ruleSets);
        setActive((current) =>
          subscriptions.some((subscription: Sub) => subscription.id === current)
            ? current
            : subscriptions[0]?.id,
        );
      })
      .catch(() => {
        localStorage.removeItem("token");
        setAuthed(false);
      });
  useEffect(() => {
    if (authed) load();
  }, [authed]);
  if (!authed)
    return (
      <Welcome
        onDone={() => setAuthed(true)}
        theme={theme}
        flip={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );
  const sub = subs.find((s) => s.id === active);
  return (
    <div className="shell">
      <div className={networkBusy ? "networkProgress show" : "networkProgress"}>
        <i />
      </div>
      <aside>
        <div className="brand">
          <div className="logo">
            <Route size={19} />
          </div>
          <b>Mihomo Hub</b>
        </div>
        <nav>
          <span>РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <button
            className={!admin ? "on" : ""}
            onClick={() => setAdmin(false)}
          >
            <LayoutDashboard />
            Обзор
          </button>
          <span>ПОДПИСКИ</span>
          {subs.map((s) => (
            <button
              className={!admin && s.id === active ? "on" : ""}
              onClick={() => {
                setActive(s.id);
                setAdmin(false);
              }}
              key={s.id}
            >
              <Server />
              {s.name}
              <ChevronRight className="chev" />
            </button>
          ))}
          <button className="subtle" onClick={() => setAddOpen(true)}>
            <CirclePlus />
            Добавить подписку
          </button>
          <span>СИСТЕМА</span>
          <button className={admin ? "on" : ""} onClick={() => setAdmin(true)}>
            <Shield />
            Администрирование
          </button>
        </nav>
        <div className="asideBottom">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun /> : <Moon />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              setAuthed(false);
            }}
          >
            <LogOut />
            Выйти
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <small>ПАНЕЛЬ УПРАВЛЕНИЯ</small>
            <h2>
              {admin ? "Администрирование" : sub?.name || "Ваши подписки"}
            </h2>
          </div>
          <div className="status">
            <i /> Сервис работает
          </div>
        </header>
        {admin ? (
          <Admin key="admin" onRuleSetsChange={setCustomRuleSets} />
        ) : sub ? (
          <Subscription
            key={sub.id}
            sub={sub}
            reload={load}
            customRuleSets={customRuleSets}
          />
        ) : (
          <Empty />
        )}
      </main>
      {addOpen && (
        <div
          className="modalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAddOpen(false);
          }}
        >
          <form
            className="subscriptionModal"
            ref={addDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subscription-title"
            onSubmit={async (e) => {
              e.preventDefault();
              setAddError("");
              try {
                await api("/subscriptions", {
                  method: "POST",
                  body: JSON.stringify({ url: newSubscriptionUrl.trim() }),
                });
                setNewSubscriptionUrl("");
                setAddOpen(false);
                load();
              } catch (error: any) {
                setAddError(error.message);
              }
            }}
          >
            <button
              type="button"
              className="modalClose"
              aria-label="Закрыть"
              onClick={() => setAddOpen(false)}
            >
              <X />
            </button>
            <div className="modalIcon">
              <CirclePlus />
            </div>
            <h2 id="add-subscription-title">Добавить подписку</h2>
            <p>
              Вставьте ссылку Clash Meta/Mihomo. Мы проверим конфигурацию и
              создадим первый профиль.
            </p>
            <label>
              Ссылка на подписку
              <div className="modalUrlInput">
                <Globe2 />
                <input
                  type="url"
                  required
                  autoFocus
                  value={newSubscriptionUrl}
                  onChange={(e) => setNewSubscriptionUrl(e.target.value)}
                  placeholder="https://provider.example/subscription-id"
                />
              </div>
            </label>
            {addError && <div className="error modalError" role="alert">{addError}</div>}
            <div className="modalActions">
              <button type="button" onClick={() => setAddOpen(false)}>
                Отмена
              </button>
              <button className="primary" disabled={networkBusy}>
                {networkBusy ? <RefreshCw className="spin" /> : <CirclePlus />}
                {networkBusy ? "Проверяем..." : "Добавить подписку"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  useDismiss(open, () => setOpen(false));
  return (
    <div className={open ? "customSelect open" : "customSelect"}>
      {open && (
        <button
          type="button"
          className="selectDismiss"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        className="selectTrigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
      >
        <span>{selected?.label || value}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="selectMenu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  badges = {},
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  badges?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useDismiss(open, () => setOpen(false));
  const filtered = options
    .filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 80);
  return (
    <div className={open ? "comboBox open" : "comboBox"}>
      {open && (
        <button
          type="button"
          className="selectDismiss"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="comboInput">
        <input
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Скрыть варианты" : "Показать варианты"}
          onClick={() => {
            setQuery("");
            setOpen(!open);
          }}
        >
          <ChevronDown />
        </button>
      </div>
      {open && (
        <div className="selectMenu comboMenu" role="listbox">
          {filtered.length ? (
            filtered.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                className={option === value ? "selected" : ""}
                key={option}
                onClick={() => {
                  onChange(option);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                <span className="comboOptionMeta">
                  {badges[option] && <small>{badges[option]}</small>}
                  {option === value && <Check />}
                </span>
              </button>
            ))
          ) : (
            <div className="comboEmpty">
              Можно использовать введённое значение
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Welcome({
  onDone,
  theme,
  flip,
}: {
  onDone: () => void;
  theme: string;
  flip: () => void;
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go(e: any) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(API + "/auth/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.detail);
      localStorage.setItem("token", d.token);
      localStorage.setItem("account_key", d.account_key);
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome">
      <button
        className="theme"
        onClick={flip}
        aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
      <div className="welcomeCard">
        <div className="heroLogo">
          <Route />
        </div>
        <div className="pill">
          <i /> SELF-HOSTED CONTROL PLANE
        </div>
        <h1>
          Ваша подписка.
          <br />
          <em>Ваши правила.</em>
        </h1>
        <p>
          Подключите Clash/Mihomo-подписку и управляйте маршрутизацией,
          профилями и конфигурацией в одном месте.
        </p>
        <form onSubmit={go}>
          <label htmlFor="welcome-subscription-url">Ссылка на подписку</label>
          <div className="urlInput">
            <Globe2 />
            <input
              id="welcome-subscription-url"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://provider.example/subscription"
            />
            <button disabled={busy} aria-label="Подключить подписку">
              {busy ? <RefreshCw className="spin" /> : <ChevronRight />}
            </button>
          </div>
          {err && <div className="error" role="alert">{err}</div>}
          <small>
            <Shield /> Ссылка шифруется и используется только для обновления
            конфигурации
          </small>
        </form>
      </div>
      <div className="welcomeFoot">
        <span>
          <FileCog /> Гибкие модификаторы
        </span>
        <span>
          <Route /> Умный роутинг
        </span>
        <span>
          <KeyRound /> Приватные ссылки
        </span>
      </div>
    </div>
  );
}

function Subscription({
  sub,
  reload,
  customRuleSets,
  adminPassword,
  backToAdmin,
}: {
  sub: Sub;
  reload: () => void | Promise<void>;
  customRuleSets: CustomRuleSet[];
  adminPassword?: string;
  backToAdmin?: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [full, setFull] = useState<Sub>();
  const [edit, setEdit] = useState<Profile>();
  const [renaming, setRenaming] = useState(false);
  const [subscriptionName, setSubscriptionName] = useState(sub.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialogRef = useDialog(() => {
    if (!deleting) setDeleteOpen(false);
  }, deleteOpen);
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const { copy, copiedKey, failed: copyFailed } = useCopyAction();
  const run = async (name: string, action: () => Promise<void>) => {
    setActionError("");
    setBusyAction(name);
    try {
      await action();
    } catch (error: any) {
      setActionError(error.message || "Не удалось выполнить действие");
    } finally {
      setBusyAction("");
    }
  };
  const request = (path: string, options: any = {}) =>
    api(`${adminPassword ? "/admin" : ""}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        ...(adminPassword ? { "X-Admin-Password": adminPassword } : {}),
      },
    });
  const streamRequest = (
    path: string,
    options: any,
    onEvent: (event: ProxyProbeEvent) => void,
  ) => streamApi(`${adminPassword ? "/admin" : ""}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(adminPassword ? { "X-Admin-Password": adminPassword } : {}),
    },
  }, onEvent);
  useEffect(() => {
    request(`/subscriptions/${sub.id}`).then(setFull);
    setSubscriptionName(sub.name);
    setRenaming(false);
  }, [sub.id, adminPassword]);
  const data = full || sub;
  const sourceCatalog = useMemo(
    () => catalogFromYaml(data.yaml || ""),
    [data.yaml],
  );
  if (edit)
    return (
      <Editor
        profile={edit}
        proxies={[
          ...new Set([
            ...(data.source_meta.proxy_names || []),
            ...sourceCatalog.proxies,
          ]),
        ]}
        groups={[
          ...new Set([
            ...(data.source_meta.group_names || []),
            ...sourceCatalog.groups,
          ]),
        ]}
        ruleProviders={[
          ...new Set([
            ...customRuleSets.map((ruleSet) => ruleSet.name),
            ...(data.source_meta.rule_provider_names || []),
            ...sourceCatalog.ruleProviders,
          ]),
        ]}
        sourceYaml={data.yaml || ""}
        probeProxy={(proxy, onEvent) => streamRequest(`/subscriptions/${sub.id}/probe-proxy`, {
          method: "POST",
          body: JSON.stringify({ proxy }),
        }, onEvent)}
        back={() => setEdit(undefined)}
        saveProfile={
          adminPassword
            ? async (updated) => {
                await request(`/profiles/${edit.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(updated),
                });
              }
            : undefined
        }
        saved={() => {
          setEdit(undefined);
          reload();
          request(`/subscriptions/${sub.id}`).then(setFull);
        }}
      />
    );
  return (
    <div className="page">
      {backToAdmin && (
        <button className="back adminBack" onClick={backToAdmin}>
          ← Назад ко всем подпискам
        </button>
      )}
      <div className="tabs">
        <button
          className={tab === "overview" ? "on" : ""}
          onClick={() => setTab("overview")}
        >
          Обзор
        </button>
        <button
          className={tab === "yaml" ? "on" : ""}
          onClick={() => setTab("yaml")}
        >
          Исходный YAML
        </button>
      </div>
      {tab === "yaml" ? (
        <Yaml text={data.yaml || ""} />
      ) : (
        <>
          <section className="metrics">
            <Metric
              icon={<Server />}
              name="Прокси-серверов"
              value={data.source_meta.proxy_count}
            />
            <Metric
              icon={<Route />}
              name="Групп маршрутизации"
              value={data.source_meta.group_count}
            />
            <Metric
              icon={<FileCog />}
              name="Правил"
              value={data.source_meta.rule_count}
            />
            <Metric
              icon={<Activity />}
              name="Статус"
              value={data.enabled ? "Активна" : "Отключена"}
              good={data.enabled}
            />
          </section>
          <SubscriptionUsage info={data.source_meta.subscription} />
          <section className="panel source">
            <div>
              <span className="panelIcon">
                <Database />
              </span>
              <div>
                {renaming ? (
                  <input
                    className="sourceNameInput"
                    aria-label="Название подписки"
                    value={subscriptionName}
                    maxLength={160}
                    autoFocus
                    onChange={(e) => setSubscriptionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSubscriptionName(data.name);
                        setRenaming(false);
                      }
                    }}
                  />
                ) : (
                  <h3>{data.name}</h3>
                )}
                <p>{data.source_url}</p>
              </div>
            </div>
            <div className="sourceActions">
              {renaming ? (
                <>
                  <button
                    className="resetName"
                    title="Вернуть название из исходной подписки"
                    disabled={!!busyAction}
                    onClick={() =>
                      run("reset", async () => {
                        const updated = await request(
                          `/subscriptions/${sub.id}/reset-name`,
                          { method: "POST" },
                        );
                        setSubscriptionName(updated.name);
                        setFull({ ...data, ...updated, yaml: data.yaml });
                        setRenaming(false);
                        reload();
                      })
                    }
                  >
                    <RefreshCw /> Сбросить к исходному
                  </button>
                  <button
                    onClick={() => {
                      setSubscriptionName(data.name);
                      setRenaming(false);
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    className="primary"
                    disabled={!subscriptionName.trim() || !!busyAction}
                    onClick={() =>
                      run("rename", async () => {
                        const updated = await request(`/subscriptions/${sub.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ name: subscriptionName.trim() }),
                        });
                        setFull({ ...data, ...updated, yaml: data.yaml });
                        setRenaming(false);
                        reload();
                      })
                    }
                  >
                    {busyAction === "rename" ? <RefreshCw className="spin" /> : <Save />}
                    {busyAction === "rename" ? "Сохраняем…" : "Сохранить имя"}
                  </button>
                </>
              ) : (
                <button onClick={() => setRenaming(true)}>
                  <Settings /> Переименовать
                </button>
              )}
              <button
                disabled={!!busyAction}
                onClick={() =>
                  run("refresh", async () => {
                    const refreshed = await request(
                      `/subscriptions/${sub.id}/refresh`,
                      { method: "POST" },
                    );
                    setFull(refreshed);
                    setSubscriptionName(refreshed.name);
                    reload();
                  })
                }
              >
                <RefreshCw className={busyAction === "refresh" ? "spin" : ""} />
                {busyAction === "refresh" ? "Обновляем…" : "Обновить"}
              </button>
              <button
                className="dangerButton"
                onClick={() => {
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
              >
                <Trash2 /> Удалить
              </button>
            </div>
          </section>
          {(actionError || copyFailed) && (
            <div className="error panelError" role="alert">
              {actionError || "Браузер не дал скопировать автоматически — выделите ссылку и скопируйте вручную."}
            </div>
          )}
          <div className="sectionTitle">
            <div>
              <h3>Профили конфигурации</h3>
              <p>Независимые настройки для каждого устройства или сценария</p>
            </div>
            <button
              className="primary"
              disabled={!!busyAction}
              onClick={() =>
                run("profile", async () => {
                  const created = await request(`/subscriptions/${sub.id}/profiles`, {
                    method: "POST",
                    body: JSON.stringify({
                      name: `Новый профиль ${data.profiles.length + 1}`,
                      modifications: { rules: [], overrides: {} },
                    }),
                  });
                  await reload();
                  const updated = await request(`/subscriptions/${sub.id}`);
                  setFull(updated);
                  setEdit(created);
                })
              }
            >
              {busyAction === "profile" ? <RefreshCw className="spin" /> : <CirclePlus />}
              Новый профиль
            </button>
          </div>
          <div className="cards">
            {data.profiles.map((p) => (
              <article className="profile" key={p.id}>
                <div className="profileTop">
                  <span className="device">
                    <Settings />
                  </span>
                  <span className={p.enabled ? "activeTag" : "activeTag off"}>
                    <i /> {p.enabled ? "Активен" : "Отключён"}
                  </span>
                </div>
                <h3>{p.name}</h3>
                <p>
                  {(p.modifications.rules || []).length} правил ·{" "}
                  {Object.keys(p.modifications.overrides || {}).length}{" "}
                  переопределений · {(p.modifications.custom_proxies || []).length} своих серверов
                </p>
                <div className="link">
                  <code>{p.url}</code>
                  <button
                    onClick={() => copy(p.url, `profile-${p.id}`)}
                    aria-label={`Скопировать ссылку профиля «${p.name}»`}
                  >
                    {copiedKey === `profile-${p.id}` ? <Check /> : <Clipboard />}
                  </button>
                </div>
                <div className="profileBtns">
                  <button onClick={() => setEdit(p)}>
                    <FileCog />
                    Настроить
                  </button>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Открыть ссылку профиля «${p.name}» в новой вкладке`}
                  >
                    <ExternalLink />
                  </a>
                </div>
              </article>
            ))}
          </div>
          {deleteOpen && createPortal(
            <div
              className="modalBackdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !deleting)
                  setDeleteOpen(false);
              }}
            >
              <div
                className="subscriptionModal deleteSubscriptionModal"
                ref={deleteDialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-subscription-title"
              >
                <button
                  type="button"
                  className="modalClose"
                  aria-label="Закрыть"
                  disabled={deleting}
                  onClick={() => setDeleteOpen(false)}
                >
                  <X />
                </button>
                <div className="modalIcon dangerModalIcon">
                  <Trash2 />
                </div>
                <h2 id="delete-subscription-title">Удалить подписку?</h2>
                <p>
                  Подписка <b>«{data.name}»</b>, все её профили и выданные
                  публичные ссылки будут удалены без возможности восстановления.
                </p>
                {deleteError && <div className="error modalError" role="alert">{deleteError}</div>}
                <div className="modalActions">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteOpen(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="deleteConfirmButton"
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      setDeleteError("");
                      try {
                        await request(`/subscriptions/${sub.id}`, { method: "DELETE" });
                        setDeleteOpen(false);
                        await reload();
                        backToAdmin?.();
                      } catch (error: any) {
                        setDeleteError(error.message);
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? <RefreshCw className="spin" /> : <Trash2 />}
                    {deleting ? "Удаляем..." : "Удалить подписку"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  );
}

function Metric({ icon, name, value, good = false }: any) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <b className={good ? "good" : ""}>{value}</b>
        <small>{name}</small>
      </div>
    </div>
  );
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "Без лимита";
  if (value === 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ", "ПБ"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index > 2 ? 2 : 1)} ${units[index]}`;
}

function SubscriptionUsage({ info }: { info?: any }) {
  if (!info) {
    return (
      <section className="panel usagePanel unavailable">
        <Activity />
        <div>
          <b>Лимиты подписки недоступны</b>
          <small>Провайдер не передал заголовок Subscription-Userinfo</small>
        </div>
      </section>
    );
  }
  const percent = info.total
    ? Math.min((info.used / info.total) * 100, 100)
    : 0;
  const expires = info.expire_at ? new Date(info.expire_at) : null;
  const expired = expires ? expires.getTime() < Date.now() : false;
  const daysRemaining = expires
    ? Math.max(Math.ceil((expires.getTime() - Date.now()) / 86_400_000), 0)
    : null;
  const daysLabel = (() => {
    const value = daysRemaining || 0;
    if (value % 100 >= 11 && value % 100 <= 14) return "дней";
    if (value % 10 === 1) return "день";
    if (value % 10 >= 2 && value % 10 <= 4) return "дня";
    return "дней";
  })();
  return (
    <section className="panel usagePanel">
      <div className="usageSummary">
        <div>
          <small>Осталось трафика</small>
          <b>{formatBytes(info.remaining)}</b>
        </div>
        <div>
          <small>Использовано</small>
          <b>{formatBytes(info.used)}</b>
        </div>
        <div>
          <small>Общий лимит</small>
          <b>{info.total ? formatBytes(info.total) : "Без лимита"}</b>
        </div>
        <div className={expired ? "expired expiryDetails" : "expiryDetails"}>
          {expires ? (
            <>
              <span>
                <small>Действует ещё</small>
                <b>
                  {expired ? "Срок истёк" : `${daysRemaining} ${daysLabel}`}
                </b>
              </span>
              <span>
                <small>Действует до</small>
                <b>
                  {expires.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </b>
              </span>
            </>
          ) : (
            <span>
              <small>Срок действия</small>
              <b>Без срока</b>
            </span>
          )}
        </div>
      </div>
      {info.total > 0 && (
        <div className="usageTrack">
          <i style={{ width: `${percent}%` }} />
        </div>
      )}
    </section>
  );
}
function Yaml({ text }: { text: string }) {
  const { copy, copiedKey } = useCopyAction();
  return (
    <section className="panel yaml">
      <div className="yamlHead">
        <div>
          <Code2 />
          <h3>Исходная конфигурация</h3>
        </div>
        <button onClick={() => copy(text)} disabled={!text}>
          {copiedKey ? <Check /> : <Clipboard />}
          {copiedKey ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre>{text}</pre>
    </section>
  );
}
function Empty() {
  return (
    <div className="empty">
      <Server />
      <h2>Добавьте первую подписку</h2>
    </div>
  );
}

function proxyForType(type: string, current: Record<string, any>) {
  const common = {
    name: current.name || "Новый сервер",
    type,
    server: current.server || "",
    port: Number(current.port) || 443,
    udp: current.udp ?? true,
  };
  if (type === "trojan")
    return { ...common, password: "", network: "tcp", tls: true, sni: "", "client-fingerprint": "chrome" };
  if (type === "ss")
    return { ...common, cipher: "chacha20-ietf-poly1305", password: "" };
  if (type === "hysteria2")
    return { ...common, password: "", sni: "", obfs: "", "obfs-password": "" };
  if (type === "vmess")
    return { ...common, uuid: "", alterId: 0, cipher: "auto", network: "tcp", tls: true, servername: "" };
  return {
    ...common,
    uuid: "",
    network: "tcp",
    "packet-encoding": "xudp",
    encryption: "",
    tls: true,
    servername: "",
    flow: "xtls-rprx-vision",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": "", "short-id": "" },
  };
}

function decodeUrlSafeBase64(value: string) {
  const normalized = decodeURIComponent(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

function splitSsCredentials(value: string) {
  let decoded: string;
  try {
    decoded = decodeUrlSafeBase64(value);
  } catch {
    decoded = decodeURIComponent(value);
  }
  const separator = decoded.indexOf(":");
  if (separator < 1)
    throw new Error("В Shadowsocks-ссылке отсутствуют cipher или пароль");
  return {
    cipher: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function parseSsPlugin(value: string | null) {
  if (!value) return {};
  const parts = value.split(";").filter(Boolean);
  const originalName = parts.shift() || "";
  const plugin = ["obfs-local", "simple-obfs"].includes(originalName)
    ? "obfs"
    : originalName;
  const opts: Record<string, string | boolean> = {};
  for (const part of parts) {
    const separator = part.indexOf("=");
    const key = separator < 0 ? part : part.slice(0, separator);
    const optionValue = separator < 0 ? true : part.slice(separator + 1);
    if (plugin === "obfs" && key === "obfs") opts.mode = optionValue;
    else if (plugin === "obfs" && key === "obfs-host") opts.host = optionValue;
    else opts[key] = optionValue;
  }
  return plugin
    ? { plugin, ...(Object.keys(opts).length ? { "plugin-opts": opts } : {}) }
    : {};
}

function proxyFromSsLink(raw: string): Record<string, any> {
  const source = raw.trim();
  let payload = source.slice("ss://".length);
  const hashIndex = payload.indexOf("#");
  const name = hashIndex >= 0
    ? decodeURIComponent(payload.slice(hashIndex + 1))
    : "Импортированный Shadowsocks";
  if (hashIndex >= 0) payload = payload.slice(0, hashIndex);
  const queryIndex = payload.indexOf("?");
  const query = new URLSearchParams(queryIndex >= 0 ? payload.slice(queryIndex + 1) : "");
  if (queryIndex >= 0) payload = payload.slice(0, queryIndex);

  let credentials: { cipher: string; password: string };
  let address: string;
  const atIndex = payload.lastIndexOf("@");
  if (atIndex >= 0) {
    credentials = splitSsCredentials(payload.slice(0, atIndex));
    address = payload.slice(atIndex + 1);
  } else {
    const decoded = decodeUrlSafeBase64(payload);
    const decodedAtIndex = decoded.lastIndexOf("@");
    if (decodedAtIndex < 0)
      throw new Error("В Shadowsocks-ссылке отсутствуют сервер и порт");
    credentials = splitSsCredentials(decoded.slice(0, decodedAtIndex));
    address = decoded.slice(decodedAtIndex + 1);
  }

  const addressUrl = new URL(`ss://placeholder@${address}`);
  const server = addressUrl.hostname;
  const port = Number(addressUrl.port);
  if (!server || !port)
    throw new Error("В Shadowsocks-ссылке отсутствуют сервер или порт");
  return {
    name,
    type: "ss",
    server,
    port,
    cipher: credentials.cipher,
    password: credentials.password,
    udp: true,
    ...parseSsPlugin(query.get("plugin")),
  };
}

function proxyFromShareLink(raw: string): Record<string, any> {
  const source = raw.trim();
  if (source.toLowerCase().startsWith("ss://"))
    return proxyFromSsLink(source);
  const url = new URL(source);
  const scheme = url.protocol.replace(":", "").toLowerCase();
  const name = decodeURIComponent(url.hash.slice(1)) || "Импортированный сервер";
  const server = url.hostname;
  const port = Number(url.port);
  if (!server || !port) throw new Error("В ссылке отсутствует сервер или порт");
  const query = url.searchParams;
  const network = query.get("type") || "tcp";
  const transport: Record<string, any> = {};
  if (network === "grpc")
    transport["grpc-opts"] = { "grpc-service-name": query.get("serviceName") || "" };
  if (network === "ws")
    transport["ws-opts"] = {
      path: query.get("path") || "/",
      headers: query.get("host") ? { Host: query.get("host") } : {},
    };
  if (network === "xhttp")
    transport["xhttp-opts"] = { path: query.get("path") || "/", host: query.get("host") || "" };
  if (scheme === "vless") {
    const security = query.get("security") || "none";
    const proxy: Record<string, any> = {
      name, type: "vless", server, port, uuid: decodeURIComponent(url.username),
      network, udp: true, "packet-encoding": query.get("packetEncoding") || "xudp",
      encryption: query.get("encryption") || "",
      tls: security !== "none", servername: query.get("sni") || "",
      flow: query.get("flow") || "", "client-fingerprint": query.get("fp") || "chrome",
      ...transport,
    };
    if (security === "reality")
      proxy["reality-opts"] = { "public-key": query.get("pbk") || "", "short-id": query.get("sid") || "" };
    return proxy;
  }
  if (scheme === "trojan")
    return { name, type: "trojan", server, port, password: decodeURIComponent(url.username), network, udp: true, tls: true, sni: query.get("sni") || query.get("peer") || "", "client-fingerprint": query.get("fp") || "chrome", ...transport };
  if (["hysteria2", "hy2"].includes(scheme))
    return { name, type: "hysteria2", server, port, password: decodeURIComponent(url.username), udp: true, sni: query.get("sni") || "", obfs: query.get("obfs") || "", "obfs-password": query.get("obfs-password") || query.get("obfsParam") || "" };
  throw new Error("Поддерживается импорт ссылок ss://, vless://, trojan:// и hysteria2://");
}

function CustomProxyModal({
  initial,
  availableGroups,
  existingNames,
  probe,
  close,
  save,
}: {
  initial: CustomProxyEntry;
  availableGroups: string[];
  existingNames: string[];
  probe?: (proxy: Record<string, any>, onEvent: (event: ProxyProbeEvent) => void) => Promise<ProxyProbeResponse>;
  close: () => void;
  save: (entry: CustomProxyEntry) => void;
}) {
  const [entry, setEntry] = useState<CustomProxyEntry>(() => structuredClone(initial));
  const [mode, setMode] = useState<"builder" | "yaml">("builder");
  const [yamlText, setYamlText] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");
  const [probing, setProbing] = useState(false);
  const [probeData, setProbeData] = useState<ProxyProbeResponse>();
  const [probeError, setProbeError] = useState("");
  const dialogRef = useDialog(() => {
    if (!probing) close();
  });
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const proxy = entry.proxy;
  const setProxy = (patch: Record<string, any>) => {
    setProbeData(undefined);
    setProbeError("");
    setEntry((current) => ({ ...current, proxy: { ...current.proxy, ...patch } }));
  };
  const setReality = (patch: Record<string, any>) =>
    setProxy({ "reality-opts": { ...(proxy["reality-opts"] || {}), ...patch } });
  function switchMode(next: "builder" | "yaml") {
    if (next === mode) return;
    if (next === "yaml") {
      setYamlText(stringifyYaml(proxy, { lineWidth: 120 }));
      setMode("yaml");
      setError("");
      return;
    }
    try {
      const parsed = parseYaml(yamlText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Конфигурация прокси должна быть YAML-объектом");
      setEntry((current) => ({ ...current, proxy: parsed as Record<string, any> }));
      setMode("builder");
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  function submit() {
    try {
      let result = entry;
      if (mode === "yaml") {
        const parsed = parseYaml(yamlText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error("Конфигурация прокси должна быть YAML-объектом");
        result = { ...entry, proxy: parsed as Record<string, any> };
      }
      const candidate = result.proxy;
      if (!String(candidate.name || "").trim()) throw new Error("Укажите название сервера");
      if (!String(candidate.type || "").trim()) throw new Error("Укажите тип прокси");
      if (!String(candidate.server || "").trim()) throw new Error("Укажите IP-адрес или домен сервера");
      const port = Number(candidate.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Порт должен быть числом от 1 до 65535");
      const proxyType = String(candidate.type).toLowerCase();
      if (["vless", "vmess"].includes(proxyType) && !String(candidate.uuid || "").trim())
        throw new Error("Для VLESS/VMess необходимо указать UUID");
      if (["trojan", "ss", "hysteria2"].includes(proxyType) && !String(candidate.password || ""))
        throw new Error("Для выбранного протокола необходимо указать пароль");
      const name = String(candidate.name).trim();
      if (existingNames.some((item) => item === name && name !== initial.proxy.name))
        throw new Error("Прокси с таким названием уже существует");
      const dialerProxy = String(candidate["dialer-proxy"] || "").trim();
      if (dialerProxy === name)
        throw new Error("Сервер не может подключаться через самого себя");
      if (dialerProxy && result.groups.includes(dialerProxy))
        throw new Error(
          `Уберите сервер из группы «${dialerProxy}» или выберите для цепочки другую группу`,
        );
      const cleaned: Record<string, any> = { ...candidate, name, port };
      if (mode === "builder") {
        if (!cleaned.servername) delete cleaned.servername;
        if (!cleaned.sni) delete cleaned.sni;
        if (!cleaned.flow) delete cleaned.flow;
        if (!cleaned.encryption) delete cleaned.encryption;
        if (dialerProxy) cleaned["dialer-proxy"] = dialerProxy;
        else delete cleaned["dialer-proxy"];
        if (!cleaned.obfs) {
          delete cleaned.obfs;
          delete cleaned["obfs-password"];
        }
        if (cleaned["reality-opts"] && !cleaned["reality-opts"]["public-key"])
          delete cleaned["reality-opts"];
      }
      save({ ...result, proxy: cleaned });
    } catch (e: any) {
      setError(e.message || "Проверьте параметры сервера");
    }
  }
  async function runProbe() {
    if (!probe) return;
    setProbing(true);
    setProbeError("");
    setProbeData(undefined);
    try {
      let candidate = proxy;
      if (mode === "yaml") {
        const parsed = parseYaml(yamlText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error("Конфигурация прокси должна быть YAML-объектом");
        candidate = parsed as Record<string, any>;
      }
      if (!candidate.name || !candidate.type || !candidate.server || !candidate.port)
        throw new Error("Сначала укажите название, протокол, сервер и порт");
      const response = await probe(candidate, (event) => {
        if (event.type === "start") {
          setProbeData({
            best: null,
            results: event.names.map((name) => ({ name, status: "pending", delay: null })),
            tested: event.tested,
            successful: 0,
            diagnosis: "Подготавливаю проверку маршрутов",
          });
        } else if (event.type === "result") {
          setProbeData((current) => current ? {
            ...current,
            successful: current.successful + (event.result.status === "ok" ? 1 : 0),
            results: current.results.map((item) => item.name === event.result.name ? event.result : item),
          } : current);
        } else if (event.type === "complete") {
          setProbeData((current) => current ? {
            ...current,
            best: event.best,
            tested: event.tested,
            successful: event.successful,
            diagnosis: event.diagnosis,
          } : current);
        }
      });
      if (response.best) {
        const updated = { ...candidate, "dialer-proxy": response.best.name };
        setEntry((current) => ({ ...current, proxy: updated }));
        if (mode === "yaml") setYamlText(stringifyYaml(updated, { lineWidth: 120 }));
      }
    } catch (e: any) {
      setProbeError(e.message || "Не удалось проверить маршруты");
    } finally {
      setProbing(false);
    }
  }
  const type = String(proxy.type || "vless");
  const supportsNetwork = ["vless", "trojan", "vmess"].includes(type);
  const supportsTls = ["vless", "trojan", "vmess"].includes(type);
  const dialerOptions = [
    ...new Set(["DIRECT", ...availableGroups, ...existingNames]),
  ].filter((name) => name !== proxy.name);
  const dialerBadges = Object.fromEntries([
    ["DIRECT", "напрямую"],
    ...availableGroups.map((name) => [name, "группа"]),
    ...existingNames.map((name) => [name, "прокси"]),
  ]);
  const probeCompleted = probeData?.results.filter((result) => result.status !== "pending").length || 0;
  return createPortal(
    <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="subscriptionModal customProxyModal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-proxy-title"
      >
        <button className="modalClose" aria-label="Закрыть" onClick={close}><X /></button>
        <div className="modalIcon"><Server /></div>
        <h2 id="custom-proxy-title">{initial.proxy.server ? "Настройка сервера" : "Новый прокси-сервер"}</h2>
        <p>Параметры попадут в секцию <code>proxies</code> итоговой подписки.</p>
        <div className="composerTabs proxyModeTabs">
          <button className={mode === "builder" ? "active" : ""} onClick={() => switchMode("builder")}><Settings /> Конструктор</button>
          <button className={mode === "yaml" ? "active" : ""} onClick={() => switchMode("yaml")}><Code2 /> YAML</button>
        </div>
        {mode === "yaml" ? (
          <div className="customProxyYaml">
            <MonacoEditor
              height="390px"
              language="yaml"
              theme={document.documentElement.dataset.theme === "light" ? "light" : "vs-dark"}
              value={yamlText}
              onChange={(value) => {
                setYamlText(value || "");
                setProbeData(undefined);
                setProbeError("");
              }}
              options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 21, tabSize: 2, automaticLayout: true, scrollBeyondLastLine: false }}
            />
          </div>
        ) : (
          <div className="customProxyForm">
            <div className="proxyImportField">
              <span>Быстрый импорт ссылки подключения</span>
              <div><input value={shareLink} onChange={(e) => setShareLink(e.target.value)} placeholder="ss://, vless://, trojan:// или hysteria2://" /><button onClick={() => { try { setEntry((current) => ({ ...current, proxy: proxyFromShareLink(shareLink) })); setProbeData(undefined); setProbeError(""); setShareLink(""); setError(""); } catch (e: any) { setError(e.message); } }}><ArrowDownToLine /> Импортировать</button></div>
            </div>
            <label><span>Название</span><input value={proxy.name || ""} onChange={(e) => setProxy({ name: e.target.value })} placeholder="Мой Reality" /></label>
            <label><span>Протокол</span><SelectField value={type} onChange={(value) => { setEntry((current) => ({ ...current, proxy: proxyForType(value, current.proxy) })); setProbeData(undefined); setProbeError(""); }} options={["vless", "trojan", "ss", "hysteria2", "vmess"].map((value) => ({ value, label: value.toUpperCase() }))} /></label>
            <label className="proxyServerField"><span>Сервер</span><input value={proxy.server || ""} onChange={(e) => setProxy({ server: e.target.value })} placeholder="vpn.example.com или 203.0.113.10" /></label>
            <label><span>Порт</span><input type="number" min="1" max="65535" value={proxy.port || ""} onChange={(e) => setProxy({ port: Number(e.target.value) })} /></label>
            {supportsNetwork && <label><span>Транспорт</span><SelectField value={proxy.network || "tcp"} onChange={(value) => setProxy({ network: value })} options={["tcp", "grpc", "ws", "xhttp"].map((value) => ({ value, label: value.toUpperCase() }))} /></label>}
            <label className="proxyWideField dialerProxyField">
              <span>Подключаться через</span>
              <Combobox
                value={proxy["dialer-proxy"] || ""}
                onChange={(value) => setProxy({ "dialer-proxy": value })}
                options={dialerOptions}
                placeholder="Напрямую (без промежуточного прокси)"
                badges={dialerBadges}
              />
              <small>
                Выбранный прокси станет первым узлом цепочки; внешний IP останется IP этого сервера.
              </small>
            </label>
            {(type === "vless" || type === "vmess") && <label className="proxyWideField"><span>UUID</span><input value={proxy.uuid || ""} onChange={(e) => setProxy({ uuid: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>}
            {(type === "trojan" || type === "ss" || type === "hysteria2") && <label className="proxyWideField"><span>Пароль</span><input type="password" value={proxy.password || ""} onChange={(e) => setProxy({ password: e.target.value })} /></label>}
            {type === "ss" && <label className="proxyWideField"><span>Шифр</span><SelectField value={proxy.cipher || "chacha20-ietf-poly1305"} onChange={(value) => setProxy({ cipher: value })} options={["chacha20-ietf-poly1305", "aes-128-gcm", "aes-256-gcm", "2022-blake3-aes-128-gcm", "2022-blake3-aes-256-gcm"].map((value) => ({ value, label: value }))} /></label>}
            {supportsTls && <label className="toggle compactToggle proxyToggle"><span>TLS</span><input type="checkbox" checked={proxy.tls ?? true} onChange={(e) => setProxy({ tls: e.target.checked })} /></label>}
            <label className="toggle compactToggle proxyToggle"><span>UDP</span><input type="checkbox" checked={proxy.udp ?? true} onChange={(e) => setProxy({ udp: e.target.checked })} /></label>
            {(type === "vless" || type === "vmess") && <label className="proxyWideField"><span>SNI / Server Name</span><input value={proxy.servername || ""} onChange={(e) => setProxy({ servername: e.target.value })} placeholder="www.example.com" /></label>}
            {type === "trojan" && <label className="proxyWideField"><span>SNI</span><input value={proxy.sni || ""} onChange={(e) => setProxy({ sni: e.target.value })} /></label>}
            {type === "hysteria2" && <><label><span>SNI</span><input value={proxy.sni || ""} onChange={(e) => setProxy({ sni: e.target.value })} /></label><label><span>Obfuscation</span><SelectField value={proxy.obfs || ""} onChange={(value) => setProxy({ obfs: value, "obfs-password": value ? proxy["obfs-password"] || "" : "" })} options={[{ value: "", label: "Нет" }, { value: "salamander", label: "Salamander" }]} /></label>{proxy.obfs && <label className="proxyWideField"><span>Пароль обфускации</span><input type="password" value={proxy["obfs-password"] || ""} onChange={(e) => setProxy({ "obfs-password": e.target.value })} /></label>}</>}
            {type === "vless" && <>
              <label><span>Flow</span><input value={proxy.flow || ""} onChange={(e) => setProxy({ flow: e.target.value })} placeholder="xtls-rprx-vision" /></label>
              <label><span>Fingerprint</span><SelectField value={proxy["client-fingerprint"] || "chrome"} onChange={(value) => setProxy({ "client-fingerprint": value })} options={["chrome", "firefox", "safari", "edge", "qq", "randomized"].map((value) => ({ value, label: value }))} /></label>
              <label className="proxyWideField"><span>VLESS Encryption</span><input value={proxy.encryption || ""} onChange={(e) => setProxy({ encryption: e.target.value })} placeholder="none или mlkem768x25519plus..." /></label>
              <label className="proxyWideField"><span>Reality Public Key</span><input value={proxy["reality-opts"]?.["public-key"] || ""} onChange={(e) => setReality({ "public-key": e.target.value })} /></label>
              <label className="proxyWideField"><span>Reality Short ID</span><input value={proxy["reality-opts"]?.["short-id"] || ""} onChange={(e) => setReality({ "short-id": e.target.value })} /></label>
            </>}
            <div className="proxyGroups proxyWideField">
              <span>Добавить в группы исходной подписки</span>
              <div>{availableGroups.map((group) => <label key={group}><input type="checkbox" checked={entry.groups.includes(group)} onChange={(e) => setEntry((current) => ({ ...current, groups: e.target.checked ? [...current.groups, group] : current.groups.filter((item) => item !== group) }))} /> {group}</label>)}</div>
              {!availableGroups.length && <small>В исходной подписке нет групп.</small>}
            </div>
          </div>
        )}
        {probe && (
          <div className="proxyProbePanel">
            <div className="proxyProbeHead">
              <div>
                <b><Activity /> Автоподбор промежуточного прокси</b>
                <small>Сервер проверит полное подключение к добавляемому узлу через каждый прокси исходной подписки.</small>
              </div>
              <button className="secondaryAction" disabled={probing} onClick={runProbe}>
                <Activity className={probing ? "spin" : ""} />
                {probing ? "Проверяю маршруты…" : "Найти лучший маршрут"}
              </button>
            </div>
            {probeError && <div className="error modalError">{probeError}</div>}
            {probeData && (
              <>
                <div className={`proxyProbeSummary ${probing ? "running" : probeData.best ? "success" : "failed"}`}>
                  {probing ? (
                    <><Activity className="pulse" /><span><b>Проверено {probeCompleted} из {probeData.tested}</b><small>Рабочих маршрутов: {probeData.successful}</small></span></>
                  ) : probeData.best ? (
                    <><Check /><span><b>Выбран {probeData.best.name}</b><small>{probeData.best.delay} мс · работают {probeData.successful} из {probeData.tested} маршрутов</small></span></>
                  ) : (
                    <><X /><span><b>Рабочий маршрут не найден</b><small>{probeData.diagnosis || `Проверено прокси: ${probeData.tested}`}</small></span></>
                  )}
                </div>
                <div className="proxyProbeProgress"><i style={{ width: `${probeData.tested ? probeCompleted / probeData.tested * 100 : 0}%` }} /></div>
                <div className="proxyProbeResults">
                  {probeData.results.map((result) => (
                    <button
                      key={result.name}
                      className={proxy["dialer-proxy"] === result.name ? "selected" : ""}
                      disabled={result.status !== "ok"}
                      title={result.error || ""}
                      onClick={() => setEntry((current) => ({
                        ...current,
                        proxy: { ...current.proxy, "dialer-proxy": result.name },
                      }))}
                    >
                      <span>{result.name}</span>
                      {result.status === "ok" ? (
                        <b>{result.delay} мс</b>
                      ) : result.status === "pending" ? (
                        <small className="pending">ожидание</small>
                      ) : result.stage === "upstream" ? (
                        <small>прокси недоступен</small>
                      ) : (
                        <small>{result.upstream_delay ? `цель не отвечает · вход ${result.upstream_delay} мс` : "цель не отвечает"}</small>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {error && <div className="error modalError">{error}</div>}
        <div className="modalActions"><button onClick={close}>Отмена</button><button className="primary" onClick={submit}><Save /> Сохранить сервер</button></div>
      </div>
    </div>,
    document.body,
  );
}

function Editor({
  profile,
  proxies,
  groups,
  ruleProviders,
  sourceYaml,
  back,
  saved,
  saveProfile,
  probeProxy,
  templateMode = false,
}: {
  profile: Profile;
  proxies: string[];
  groups: string[];
  ruleProviders: string[];
  sourceYaml: string;
  back: () => void;
  saved: () => void;
  saveProfile?: (profile: { name: string; modifications: any }) => Promise<void>;
  probeProxy?: (proxy: Record<string, any>, onEvent: (event: ProxyProbeEvent) => void) => Promise<ProxyProbeResponse>;
  templateMode?: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [rules, setRules] = useState<string[]>(
    profile.modifications.rules || [],
  );
  const [ruleIds, setRuleIds] = useState<string[]>(() =>
    (profile.modifications.rules || []).map(() => newRuleId()),
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [ruleMode, setRuleMode] = useState<"builder" | "text">("builder");
  const [ruleType, setRuleType] = useState("DOMAIN-SUFFIX");
  const [ruleValue, setRuleValue] = useState("");
  const [ruleTarget, setRuleTarget] = useState(groups[0] || "DIRECT");
  const [ruleNoResolve, setRuleNoResolve] = useState(false);
  const [ruleText, setRuleText] = useState("");
  const [customProxies, setCustomProxies] = useState<CustomProxyEntry[]>(() =>
    normalizeCustomProxies(profile.modifications.custom_proxies),
  );
  const [editCustomProxyId, setEditCustomProxyId] = useState<string>();
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);
  const ruleRefs = useRef(new Map<string, HTMLDivElement>());
  const previousRulePositions = useRef(new Map<string, number>());
  const [overrides, setOverrides] = useState(
    stringifyYaml(profile.modifications.overrides || {}, { lineWidth: 120 }),
  );
  const [overrideSearch, setOverrideSearch] = useState("");
  const sourceConfig = useMemo<Record<string, any>>(() => {
    try {
      const parsed = parseYaml(sourceYaml);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }, [sourceYaml]);
  const overrideConfig = useMemo<Record<string, any>>(() => {
    try {
      const parsed = parseYaml(overrides);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }, [overrides]);
  const sourceKeys = useMemo(
    () =>
      Object.keys(sourceConfig).filter((key) =>
        key.toLowerCase().includes(overrideSearch.toLowerCase()),
      ),
    [sourceConfig, overrideSearch],
  );
  const currentGeo = profile.modifications.geo || {};
  const [geo, setGeo] = useState(currentGeo.mode ?? true);
  const [geoAuto, setGeoAuto] = useState(currentGeo["geo-auto-update"] ?? true);
  const [geoInterval, setGeoInterval] = useState(
    currentGeo["geo-update-interval"] ?? 24,
  );
  const [geoLoader, setGeoLoader] = useState(
    currentGeo["geodata-loader"] || "memconservative",
  );
  const defaultGeoUrls = {
    geoip:
      "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    geosite:
      "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
    asn: "https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb",
  };
  const [geoUrls, setGeoUrls] = useState({
    ...defaultGeoUrls,
    ...(currentGeo["geox-url"] || {}),
  });
  const [err, setErr] = useState("");
  const customProxyNames = useMemo(
    () => customProxies.map((entry) => String(entry.proxy.name || "")).filter(Boolean),
    [customProxies],
  );
  const targetSuggestions = useMemo(
    () => [
      ...new Set([
        ...groups,
        ...proxies,
        ...customProxyNames,
        "DIRECT",
        "REJECT",
        "REJECT-DROP",
        "PASS",
      ]),
    ],
    [groups, proxies, customProxyNames],
  );
  const targetBadges = useMemo(
    () =>
      Object.fromEntries([
        ...proxies.map((name) => [name, "Прокси"]),
        ...customProxyNames.map((name) => [name, "Свой прокси"]),
        ...groups.map((name) => [name, "Группа"]),
        ...["DIRECT", "REJECT", "REJECT-DROP", "PASS"].map((name) => [
          name,
          "Политика",
        ]),
      ]),
    [groups, proxies, customProxyNames],
  );
  const valueSuggestions = useMemo(() => {
    if (ruleType === "RULE-SET") return ruleProviders;
    if (ruleType === "GEOSITE")
      return ["telegram", "cloudflare", "category-ads-all"];
    if (ruleType === "GEOIP")
      return ["RU", "US", "private", "telegram", "cloudflare"];
    return [];
  }, [ruleType, ruleProviders]);
  const needsValue = ruleType !== "MATCH";
  const supportsNoResolve = [
    "GEOIP",
    "IP-CIDR",
    "IP-CIDR6",
    "SRC-IP-CIDR",
  ].includes(ruleType);
  function snapshotRulePositions() {
    previousRulePositions.current = new Map(
      [...ruleRefs.current.entries()].map(([key, element]) => [
        key,
        element.getBoundingClientRect().top,
      ]),
    );
  }
  useLayoutEffect(() => {
    if (!previousRulePositions.current.size) return;
    const positions = previousRulePositions.current;
    previousRulePositions.current = new Map();
    ruleRefs.current.forEach((element, key) => {
      const previousTop = positions.get(key);
      if (previousTop === undefined) return;
      const delta = previousTop - element.getBoundingClientRect().top;
      if (!delta) return;
      element.style.transition = "none";
      element.style.transform = `translateY(${delta}px)`;
      element.getBoundingClientRect();
      requestAnimationFrame(() => {
        element.style.transition = "";
        element.style.transform = "";
      });
    });
  }, [rules]);
  useEffect(() => {
    setRuleIds((current) =>
      rules.map((_, index) => current[index] || newRuleId()),
    );
  }, [rules.length]);
  function addComposedRule(position: "prepend" | "append" = "append") {
    const candidate =
      ruleMode === "text"
        ? ruleText.trim().replace(/^[-*]\s+/, "")
        : [
            ruleType,
            ...(needsValue ? [ruleValue.trim()] : []),
            ruleTarget.trim(),
            ...(supportsNoResolve && ruleNoResolve ? ["no-resolve"] : []),
          ].join(",");
    const builderIncomplete =
      ruleMode === "builder" &&
      ((needsValue && !ruleValue.trim()) || !ruleTarget.trim());
    if (!candidate || !candidate.includes(",") || builderIncomplete) {
      setErr("Заполните все поля правила");
      return;
    }
    if (rules.includes(candidate)) return;
    setRules((current) =>
      position === "prepend" ? [candidate, ...current] : [...current, candidate],
    );
    setRuleIds((current) =>
      position === "prepend"
        ? [newRuleId(), ...current]
        : [...current, newRuleId()],
    );
    setRuleValue("");
    setRuleText("");
    setErr("");
  }
  function moveRule(from: number, to: number) {
    if (from === to) return;
    if (from < 0 || to < 0 || from >= rules.length || to >= rules.length) {
      return;
    }
    snapshotRulePositions();
    setRules((current) => moveItem(current, from, to));
    setRuleIds((current) => moveItem(current, from, to));
  }
  const parsedBulkRules = useMemo(() => {
    if (!bulkText.trim()) return [];
    try {
      const parsed = parseYaml(bulkText);
      const candidate: unknown[] | null = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.rules)
          ? parsed.rules
          : null;
      if (candidate) {
        return candidate
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.includes(","));
      }
    } catch {
      // Plain Mihomo lists are parsed line-by-line below.
    }
    return bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== "rules:" && !line.startsWith("#"))
      .map((line) => line.replace(/^[-*]\s+/, "").trim())
      .map((line) =>
        /^(['"]).*\1$/.test(line) ? line.slice(1, -1).trim() : line,
      )
      .filter((line) => line.includes(","));
  }, [bulkText]);
  function applyBulkRules(mode: "append" | "replace") {
    if (!parsedBulkRules.length) {
      setErr("Не найдено ни одного правила Mihomo");
      return;
    }
    const nextRules =
      mode === "replace"
        ? [...new Set(parsedBulkRules)]
        : [...new Set([...rules, ...parsedBulkRules])];
    setRules(nextRules);
    setRuleIds(nextRules.map(() => newRuleId()));
    setBulkText("");
    setBulkOpen(false);
    setErr("");
  }
  function toggleOverride(key: string, checked: boolean) {
    try {
      const current = parseYaml(overrides) || {};
      if (typeof current !== "object" || Array.isArray(current)) {
        throw new Error("Корень переопределений должен быть YAML-объектом");
      }
      if (checked) current[key] = structuredClone(sourceConfig[key]);
      else delete current[key];
      setOverrides(stringifyYaml(current, { lineWidth: 120 }));
      setErr("");
    } catch (e: any) {
      setErr(e.message || "Исправьте синтаксис YAML перед выбором ключа");
    }
  }
  async function save() {
    try {
      const parsed = parseYaml(overrides) || {};
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Переопределения должны быть YAML-объектом");
      }
      const updated = {
        name,
        modifications: {
          ...profile.modifications,
          rules,
          custom_proxies: customProxies.map(({ proxy, groups: selectedGroups }) => ({
            proxy,
            groups: selectedGroups,
          })),
          overrides: parsed,
          geo: {
            mode: geo,
            "geodata-loader": geoLoader,
            "geo-auto-update": geoAuto,
            "geo-update-interval": Number(geoInterval),
            "geox-url": geoUrls,
          },
        },
      };
      if (saveProfile) await saveProfile(updated);
      else
        await api(`/profiles/${profile.id}`, {
          method: "PATCH",
          body: JSON.stringify(updated),
        });
      saved();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <div className="page editor">
      <button className="back" onClick={back}>
        ← {templateMode ? "Назад к шаблонам" : "Назад к подписке"}
      </button>
      <div className="sectionTitle">
        <div>
          <h2>{templateMode ? "Настройка шаблона профиля" : "Настройка профиля"}</h2>
          <p>
            {templateMode
              ? "Этот профиль будет автоматически создан в каждой новой подписке"
              : "Изменения применяются при каждом запросе публичной ссылки"}
          </p>
        </div>
        <button className="primary" onClick={save}>
          <Save />
          Сохранить
        </button>
      </div>
      <div className="editGrid">
        <section className="panel form externalResources">
          <div className="externalTitle">
            <div>
              <h3>Внешние Geo-ресурсы</h3>
              <p className="hint">
                Эти ссылки попадут в geox-url итоговой конфигурации Mihomo.
              </p>
            </div>
            <Globe2 />
          </div>
          <div className="resourceRows">
            {(
              [
                ["geoip", "GeoIP Database"],
                ["geosite", "GeoSite Database"],
                ["mmdb", "MMDB Database"],
                ["asn", "ASN Database"],
              ] as const
            ).map(([key, label]) => (
              <label className="resourceRow" key={key}>
                <span>{label}</span>
                <input
                  type="url"
                  value={geoUrls[key]}
                  onChange={(e) =>
                    setGeoUrls({ ...geoUrls, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <div className="geoOptions">
            <label>
              <span>GeoIP Data Mode</span>
              <SelectField
                value={geo ? "dat" : "mmdb"}
                onChange={(value) => setGeo(value === "dat")}
                options={[
                  { value: "dat", label: "DAT" },
                  { value: "mmdb", label: "MMDB" },
                ]}
              />
            </label>
            <label>
              <span>Загрузчик</span>
              <SelectField
                value={geoLoader}
                onChange={setGeoLoader}
                options={[
                  { value: "memconservative", label: "Экономия памяти" },
                  { value: "standard", label: "Стандартный" },
                ]}
              />
            </label>
            <label>
              <span>Интервал обновления, часов</span>
              <input
                type="number"
                min="1"
                max="720"
                value={geoInterval}
                onChange={(e) => setGeoInterval(Number(e.target.value))}
              />
            </label>
            <label className="toggle compactToggle">
              <span>Автообновление</span>
              <input
                type="checkbox"
                checked={geoAuto}
                onChange={(e) => setGeoAuto(e.target.checked)}
              />
            </label>
          </div>
        </section>
        <section className="panel form customProxiesPanel">
          <div className="defaultProfilesHead">
            <div>
              <h3>Собственные прокси-серверы</h3>
              <p className="hint">Добавляются к серверам исходной подписки только в этом профиле. Их можно выбирать напрямую в правилах или включать в существующие группы.</p>
            </div>
            <button
              className="primary"
              onClick={() => {
                const created = defaultCustomProxy();
                setCustomProxies((current) => [...current, created]);
                setEditCustomProxyId(created.id);
              }}
            >
              <CirclePlus /> Добавить сервер
            </button>
          </div>
          {customProxies.length ? (
            <div className="customProxyList">
              {customProxies.map((entry) => (
                <article className="customProxyCard" key={entry.id}>
                  <span className="device"><Server /></span>
                  <div>
                    <b>{entry.proxy.name}</b>
                    <small>{String(entry.proxy.type || "").toUpperCase()} · {entry.proxy.server || "сервер не указан"}:{entry.proxy.port || "—"}</small>
                    {entry.proxy["dialer-proxy"] && (
                      <small>Цепочка: {entry.proxy["dialer-proxy"]} → {entry.proxy.name}</small>
                    )}
                    <small>{entry.groups.length ? `Группы: ${entry.groups.join(", ")}` : "Без привязки к группе"}</small>
                  </div>
                  <div className="customProxyActions">
                    <button onClick={() => setEditCustomProxyId(entry.id)}><Settings /> Настроить</button>
                    <button
                      className="dangerButton"
                      title="Удалить сервер"
                      onClick={() => setCustomProxies((current) => current.filter((item) => item.id !== entry.id))}
                    ><Trash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="customProxyEmpty"><Server /><span><b>Дополнительных серверов пока нет</b><small>Добавьте сервер вручную и сохраните профиль.</small></span></div>
          )}
        </section>
        <section className="panel form">
          <h3>Основное</h3>
          <label>
            Название профиля
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <h3>Правила маршрутизации</h3>
          <p className="hint">
            Формат Mihomo, например: DOMAIN-SUFFIX,google.com,Имя прокси
          </p>
          <div className="ruleComposer">
            <div className="composerTabs">
              <button
                className={ruleMode === "builder" ? "active" : ""}
                onClick={() => setRuleMode("builder")}
              >
                <Settings /> Билдер
              </button>
              <button
                className={ruleMode === "text" ? "active" : ""}
                onClick={() => setRuleMode("text")}
              >
                <Code2 /> Строка
              </button>
            </div>
            {ruleMode === "builder" ? (
              <div className="builderFields">
                <label>
                  <span>Тип правила</span>
                  <SelectField
                    value={ruleType}
                    onChange={(value) => {
                      setRuleType(value);
                      setRuleNoResolve(false);
                    }}
                    options={RULE_TYPES.map((type) => ({
                      value: type,
                      label: type,
                    }))}
                  />
                </label>
                {needsValue && (
                  <label>
                    <span>Значение</span>
                    <Combobox
                      value={ruleValue}
                      onChange={setRuleValue}
                      options={valueSuggestions}
                      placeholder={
                        ruleType.includes("CIDR")
                          ? "1.1.1.1/32"
                          : ruleType === "IP-ASN"
                            ? "13335"
                            : ruleType === "RULE-SET"
                              ? "Имя rule-provider"
                              : "example.com"
                      }
                    />
                  </label>
                )}
                <label>
                  <span>Прокси или группа</span>
                  <Combobox
                    value={ruleTarget}
                    onChange={setRuleTarget}
                    options={targetSuggestions}
                    placeholder="Выберите политику"
                    badges={targetBadges}
                  />
                </label>
                {supportsNoResolve && (
                  <label className="noResolveField">
                    <span>DNS</span>
                    <button
                      className={
                        ruleNoResolve ? "optionToggle on" : "optionToggle"
                      }
                      onClick={() => setRuleNoResolve(!ruleNoResolve)}
                    >
                      <i /> no-resolve
                    </button>
                  </label>
                )}
              </div>
            ) : (
              <div className="textRuleField">
                <Code2 />
                <input
                  value={ruleText}
                  onChange={(e) => setRuleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addComposedRule("append");
                  }}
                  placeholder="DOMAIN-SUFFIX,example.com,🚀 Main"
                  autoFocus
                />
              </div>
            )}
            <div className="composerPreview">
              <code>
                {ruleMode === "text"
                  ? ruleText || "Готовое правило появится здесь"
                  : [
                      ruleType,
                      ...(needsValue ? [ruleValue || "…"] : []),
                      ruleTarget || "…",
                      ...(supportsNoResolve && ruleNoResolve
                        ? ["no-resolve"]
                        : []),
                    ].join(",")}
              </code>
              <div className="composerActions">
                <button
                  className="secondaryAction"
                  onClick={() => addComposedRule("prepend")}
                >
                  <ArrowUpToLine /> В начало
                </button>
                <button
                  className="primary"
                  onClick={() => addComposedRule("append")}
                >
                  <ArrowDownToLine /> В конец
                </button>
              </div>
            </div>
          </div>
          <div className="bulkRules">
            <button
              className={bulkOpen ? "bulkToggle active" : "bulkToggle"}
              onClick={() => setBulkOpen(!bulkOpen)}
            >
              <Clipboard /> Вставить список правил
            </button>
            {bulkOpen && (
              <div className="bulkPanel">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    "- DOMAIN,example.com,🚀 Main\n- GEOSITE,telegram,🚀 Main\n- MATCH,DIRECT"
                  }
                  spellCheck={false}
                  autoFocus
                />
                <div className="bulkFooter">
                  <span>
                    Распознано: <b>{parsedBulkRules.length}</b>
                  </span>
                  <div>
                    <button
                      disabled={!parsedBulkRules.length}
                      onClick={() => applyBulkRules("replace")}
                    >
                      Заменить текущие
                    </button>
                    <button
                      className="primary"
                      disabled={!parsedBulkRules.length}
                      onClick={() => applyBulkRules("append")}
                    >
                      <CirclePlus /> Добавить без дублей
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {rules.map((r, i) => (
            <div
              className={
                draggedRuleId === ruleIds[i] ? "rule draggingRule" : "rule"
              }
              key={ruleIds[i]}
              ref={(element) => {
                const key = ruleIds[i];
                if (!key) return;
                if (element) ruleRefs.current.set(key, element);
                else ruleRefs.current.delete(key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const from = draggedRuleId
                  ? ruleIds.indexOf(draggedRuleId)
                  : -1;
                if (from >= 0 && from !== i) {
                  const box = e.currentTarget.getBoundingClientRect();
                  const cursorY = e.clientY - box.top;
                  const movingDown = from < i;
                  const shouldMove = movingDown
                    ? cursorY > box.height * 0.65
                    : cursorY < box.height * 0.35;
                  if (!shouldMove) return;
                  moveRule(from, i);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggedRuleId(null);
              }}
              onDragEnd={() => setDraggedRuleId(null)}
            >
              <button
                className="dragHandle"
                type="button"
                draggable
                aria-label="Перетащить правило"
                title="Перетащить"
                onDragStart={(e) => {
                  setDraggedRuleId(ruleIds[i]);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", ruleIds[i]);
                }}
              >
                <GripVertical />
              </button>
              <input
                value={r}
                aria-label={`Правило ${i + 1}`}
                onChange={(e) =>
                  setRules(rules.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
              <button
                aria-label={`Удалить правило ${i + 1}`}
                onClick={() => {
                  setRules(rules.filter((_, j) => j !== i));
                  setRuleIds(ruleIds.filter((_, j) => j !== i));
                }}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </section>
        <section className="panel form yamlOverride">
          <h3>Переопределения YAML</h3>
          <p className="hint">
            Выберите секции исходной подписки слева, затем измените их значения
            в редакторе. Значение null удаляет ключ.
          </p>
          <div className="overrideWorkspace">
            <aside className="overrideKeys">
              <div className="overrideKeysTitle">КЛЮЧИ КОНФИГА</div>
              <input
                value={overrideSearch}
                onChange={(e) => setOverrideSearch(e.target.value)}
                placeholder="Поиск ключа..."
              />
              <div className="overrideKeyList">
                {sourceKeys.map((key) => (
                  <label key={key} title={key}>
                    <input
                      type="checkbox"
                      checked={Object.prototype.hasOwnProperty.call(
                        overrideConfig,
                        key,
                      )}
                      onChange={(e) => toggleOverride(key, e.target.checked)}
                    />
                    <code>{key}</code>
                  </label>
                ))}
              </div>
            </aside>
            <div className="monacoPane">
              <div className="editorTab">
                <Code2 /> overrides.yaml
                <span>{Object.keys(overrideConfig).length} секций</span>
              </div>
              <MonacoEditor
                height="430px"
                language="yaml"
                theme={
                  document.documentElement.dataset.theme === "light"
                    ? "light"
                    : "vs-dark"
                }
                value={overrides}
                onChange={(value) => setOverrides(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineHeight: 21,
                  tabSize: 2,
                  insertSpaces: true,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
              />
            </div>
          </div>
          {err && <div className="error" role="alert">{err}</div>}
          <div className="callout">
            <Shield />
            <div>
              <b>Безопасное применение</b>
              <p>
                Исходная подписка не изменяется. Ошибки можно отменить, очистив
                переопределения.
              </p>
            </div>
          </div>
        </section>
      </div>
      {editCustomProxyId && (() => {
        const selected = customProxies.find((entry) => entry.id === editCustomProxyId);
        if (!selected) return null;
        return (
          <CustomProxyModal
            key={selected.id}
            initial={selected}
            availableGroups={groups}
            existingNames={[...proxies, ...customProxyNames]}
            probe={probeProxy}
            close={() => {
              if (!selected.proxy.server)
                setCustomProxies((current) => current.filter((entry) => entry.id !== selected.id));
              setEditCustomProxyId(undefined);
            }}
            save={(updated) => {
              setCustomProxies((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
              setEditCustomProxyId(undefined);
            }}
          />
        );
      })()}
    </div>
  );
}

function Admin({
  onRuleSetsChange,
}: {
  onRuleSetsChange: (ruleSets: CustomRuleSet[]) => void;
}) {
  const [pass, setPass] = useState(sessionStorage.getItem("admin") || "");
  const [data, setData] = useState<any>();
  const [defaultProfiles, setDefaultProfiles] = useState<DefaultProfile[]>([]);
  const [customRuleSets, setCustomRuleSets] = useState<CustomRuleSet[]>([]);
  const [customRuleSetIds, setCustomRuleSetIds] = useState<string[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number>(0);
  const [editTemplate, setEditTemplate] = useState<number>();
  const [editSubscriptionId, setEditSubscriptionId] = useState<number>();
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const x = await api("/admin/overview", {
        headers: { "X-Admin-Password": pass },
      });
      sessionStorage.setItem("admin", pass);
      setData(x);
      setDefaultProfiles(x.default_profiles || []);
      setCustomRuleSets(x.custom_rule_sets || []);
      setCustomRuleSetIds((x.custom_rule_sets || []).map(() => newRuleId()));
      onRuleSetsChange(x.custom_rule_sets || []);
      setSelectedSourceId((current) => current || x.subscriptions[0]?.id || 0);
      return x;
    } catch (e: any) {
      alert(e.message);
    }
  }
  async function saveTemplates(next: DefaultProfile[]) {
    const saved = await api("/admin/default-profiles", {
      method: "PUT",
      headers: { "X-Admin-Password": pass },
      body: JSON.stringify(next),
    });
    setDefaultProfiles(saved);
    setMessage("Шаблоны профилей сохранены");
    return saved;
  }
  async function saveRuleSets(next: CustomRuleSet[], nextIds?: string[]) {
    const saved = (await api("/admin/rule-sets", {
      method: "PUT",
      headers: { "X-Admin-Password": pass },
      body: JSON.stringify(next),
    })) as CustomRuleSet[];
    setCustomRuleSets(saved);
    setCustomRuleSetIds((current) =>
      saved.map((_, index) => nextIds?.[index] || current[index] || newRuleId()),
    );
    onRuleSetsChange(saved);
    setMessage("Rule sets сохранены");
    return saved;
  }
  const templateSource: Sub | undefined = data?.subscriptions.find(
    (subscription: Sub) => subscription.id === selectedSourceId,
  );
  const templateCatalog = useMemo(
    () => catalogFromYaml(templateSource?.yaml || ""),
    [templateSource?.yaml],
  );
  if (data && editSubscriptionId !== undefined) {
    const subscription = data.subscriptions.find(
      (item: Sub) => item.id === editSubscriptionId,
    );
    if (subscription)
      return (
        <Subscription
          sub={subscription}
          reload={load}
          customRuleSets={customRuleSets}
          adminPassword={pass}
          backToAdmin={() => setEditSubscriptionId(undefined)}
        />
      );
  }
  if (data && editTemplate !== undefined) {
    const template = defaultProfiles[editTemplate];
    if (template)
      return (
        <Editor
          profile={{
            id: -(editTemplate + 1),
            name: template.name,
            modifications: template.modifications,
            enabled: template.enabled,
            slug: "",
            url: "",
          }}
          proxies={templateCatalog.proxies}
          groups={templateCatalog.groups}
          ruleProviders={[
            ...new Set([
              ...customRuleSets.map((ruleSet) => ruleSet.name),
              ...templateCatalog.ruleProviders,
            ]),
          ]}
          sourceYaml={templateSource?.yaml || ""}
          templateMode
          back={() => setEditTemplate(undefined)}
          saveProfile={async (updated) => {
            const next = defaultProfiles.map((item, index) =>
              index === editTemplate ? { ...item, ...updated } : item,
            );
            await saveTemplates(next);
          }}
          saved={() => setEditTemplate(undefined)}
        />
      );
  }
  if (!data)
    return (
      <div className="adminLogin panel">
        <Shield />
        <h2>Администрирование</h2>
        <p>Введите пароль из переменной ADMIN_PASSWORD.</p>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Пароль администратора"
        />
        <button className="primary" onClick={load}>
          Войти
        </button>
      </div>
    );
  return (
    <div className="page">
      <section className="metrics">
        <Metric icon={<Database />} name="Аккаунтов" value={data.accounts} />
        <Metric
          icon={<Server />}
          name="Подписок"
          value={data.subscriptions.length}
        />
        <Metric icon={<FileCog />} name="Профилей" value={data.profiles} />
      </section>
      <div className="editGrid">
        <section className="panel form">
          <h3>Все подписки</h3>
          {data.subscriptions.map((s: Sub) => (
            <div className="adminRow" key={s.id}>
              <div>
                <b>{s.name}</b>
                <small>{s.source_url}</small>
              </div>
              <div className="adminSubscriptionActions">
                <span>{s.source_meta.proxy_count} узлов</span>
                <button
                  className="adminManageButton"
                  onClick={() => setEditSubscriptionId(s.id)}
                >
                  <Settings /> Управлять
                </button>
                <button
                  onClick={async () => {
                    const templates = s.profiles.map((profile) => ({
                      name: profile.name,
                      modifications: structuredClone(profile.modifications),
                      enabled: profile.enabled,
                    }));
                    await saveTemplates(templates);
                    setSelectedSourceId(s.id);
                    setMessage(`Профили «${s.name}» назначены шаблонами`);
                  }}
                >
                  <Clipboard /> Взять профили как шаблон
                </button>
              </div>
            </div>
          ))}
        </section>
        <section className="panel form defaultProfilesPanel">
          <div className="defaultProfilesHead">
            <div>
              <h3>Профили новых подписок</h3>
              <p className="hint">
                Создаются автоматически вместе с каждой новой подпиской.
              </p>
            </div>
            <button
              className="primary"
              onClick={async () => {
                const next = [
                  ...defaultProfiles,
                  {
                    name: "Новый профиль",
                    modifications: { rules: [], overrides: {} },
                    enabled: true,
                  },
                ];
                await saveTemplates(next);
                setEditTemplate(next.length - 1);
              }}
            >
              <CirclePlus /> Добавить профиль
            </button>
          </div>
          <label className="templateSourceSelect">
            <span>Исходная подписка для подсказок в редакторе</span>
            <SelectField
              value={String(selectedSourceId)}
              onChange={(value) => setSelectedSourceId(Number(value))}
              options={data.subscriptions.map((subscription: Sub) => ({
                value: String(subscription.id),
                label: subscription.name,
              }))}
            />
          </label>
          <div className="defaultProfileList">
            {defaultProfiles.map((profile, index) => (
              <article className="defaultProfileCard" key={`${profile.name}-${index}`}>
                <div>
                  <FileCog />
                  <span>
                    <b>{profile.name}</b>
                    <small>
                      {(profile.modifications.rules || []).length} правил · {Object.keys(profile.modifications.overrides || {}).length} переопределений · {(profile.modifications.custom_proxies || []).length} своих серверов
                    </small>
                  </span>
                </div>
                <div>
                  <button onClick={() => setEditTemplate(index)}>
                    <Settings /> Настроить
                  </button>
                  <button
                    className="dangerButton"
                    disabled={defaultProfiles.length === 1}
                    onClick={() =>
                      saveTemplates(
                        defaultProfiles.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {message && <div className="callout"><Check /><b>{message}</b></div>}
        </section>
        <section className="panel form ruleSetsPanel">
          <div className="defaultProfilesHead">
            <div>
              <h3>Custom rule sets</h3>
              <p className="hint">
                Публикуются как rule-providers и доступны в билдере RULE-SET.
              </p>
            </div>
            <button
              className="primary"
              onClick={() => {
                const next: CustomRuleSet[] = [
                  ...customRuleSets,
                  {
                    name: `custom-${customRuleSets.length + 1}`,
                    behavior: "classical",
                    payload: "DOMAIN-SUFFIX,example.com\n",
                    enabled: true,
                  },
                ];
                saveRuleSets(next, [...customRuleSetIds, newRuleId()]);
              }}
            >
              <CirclePlus /> Добавить набор
            </button>
          </div>
          <div className="ruleSetList">
            {customRuleSets.map((ruleSet, index) => (
              <article
                className="ruleSetCard"
                key={customRuleSetIds[index] || `rule-set-${index}`}
              >
                <div className="ruleSetHead">
                  <label>
                    <span>Имя</span>
                    <input
                      value={ruleSet.name}
                      onChange={(e) => {
                        const next = customRuleSets.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: e.target.value }
                            : item,
                        );
                        setCustomRuleSets(next);
                      }}
                    />
                  </label>
                  <label>
                    <span>Behavior</span>
                    <SelectField
                      value={ruleSet.behavior}
                      onChange={(value) => {
                        const next = customRuleSets.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                behavior: value as CustomRuleSet["behavior"],
                              }
                            : item,
                        );
                        setCustomRuleSets(next);
                      }}
                      options={[
                        { value: "classical", label: "classical" },
                        { value: "domain", label: "domain" },
                        { value: "ipcidr", label: "ipcidr" },
                      ]}
                    />
                  </label>
                  <label className="toggle compactToggle">
                    <span>Включён</span>
                    <input
                      type="checkbox"
                      checked={ruleSet.enabled}
                      onChange={(e) => {
                        const next = customRuleSets.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, enabled: e.target.checked }
                            : item,
                        );
                        setCustomRuleSets(next);
                      }}
                    />
                  </label>
                </div>
                <textarea
                  value={ruleSet.payload}
                  onChange={(e) => {
                    const next = customRuleSets.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, payload: e.target.value }
                        : item,
                    );
                    setCustomRuleSets(next);
                  }}
                  placeholder={"DOMAIN-SUFFIX,example.com\nGEOSITE,telegram"}
                  spellCheck={false}
                />
                <div className="ruleSetActions">
                  <code>/rule-sets/{encodeURIComponent(ruleSet.name)}.list</code>
                  <button
                    className="dangerButton"
                    onClick={() => {
                      const nextIds = customRuleSetIds.filter(
                        (_, itemIndex) => itemIndex !== index,
                      );
                      saveRuleSets(
                        customRuleSets.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                        nextIds,
                      );
                    }}
                  >
                    <Trash2 /> Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            className="primary"
            disabled={
              new Set(customRuleSets.map((item) => item.name.trim())).size !==
              customRuleSets.length
            }
            onClick={() => saveRuleSets(customRuleSets)}
          >
            <Save /> Сохранить rule sets
          </button>
        </section>
      </div>
    </div>
  );
}
const publicSubscriptionMatch = window.location.pathname.match(/^\/subscription\/([^/]+)\/?$/);
createRoot(document.getElementById("root")!).render(
  publicSubscriptionMatch
    ? <SubscriptionPage slug={decodeURIComponent(publicSubscriptionMatch[1])} />
    : <App />,
);
