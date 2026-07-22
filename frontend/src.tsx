import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Clipboard,
  Code2,
  Database,
  ExternalLink,
  FileCog,
  Globe2,
  GripVertical,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Route,
  Save,
  Server,
  Settings,
  Shield,
  Sun,
  Trash2,
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

function App() {
  const [authed, setAuthed] = useState(!!token());
  const [subs, setSubs] = useState<Sub[]>([]);
  const [active, setActive] = useState<number>();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [admin, setAdmin] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSubscriptionUrl, setNewSubscriptionUrl] = useState("");
  const [addError, setAddError] = useState("");
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
    api("/subscriptions")
      .then((x) => {
        setSubs(x);
        if (!active && x[0]) setActive(x[0].id);
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
          <Admin key="admin" />
        ) : sub ? (
          <Subscription key={sub.id} sub={sub} reload={load} />
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
            <h2>Добавить подписку</h2>
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
            {addError && <div className="error modalError">{addError}</div>}
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
  return (
    <div className={open ? "customSelect open" : "customSelect"}>
      {open && (
        <button
          type="button"
          className="selectDismiss"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        className="selectTrigger"
        aria-expanded={open}
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
  const filtered = options
    .filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 80);
  return (
    <div className={open ? "comboBox open" : "comboBox"}>
      {open && (
        <button
          type="button"
          className="selectDismiss"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="comboInput">
        <input
          value={value}
          placeholder={placeholder}
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
          onClick={() => {
            setQuery("");
            setOpen(!open);
          }}
        >
          <ChevronDown />
        </button>
      </div>
      {open && (
        <div className="selectMenu comboMenu">
          {filtered.length ? (
            filtered.map((option) => (
              <button
                type="button"
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
      <button className="theme" onClick={flip}>
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
          <label>Ссылка на подписку</label>
          <div className="urlInput">
            <Globe2 />
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://provider.example/subscription"
            />
            <button disabled={busy}>
              {busy ? <RefreshCw className="spin" /> : <ChevronRight />}
            </button>
          </div>
          {err && <div className="error">{err}</div>}
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

function Subscription({ sub, reload }: { sub: Sub; reload: () => void }) {
  const [tab, setTab] = useState("overview");
  const [full, setFull] = useState<Sub>();
  const [edit, setEdit] = useState<Profile>();
  const [renaming, setRenaming] = useState(false);
  const [subscriptionName, setSubscriptionName] = useState(sub.name);
  useEffect(() => {
    api(`/subscriptions/${sub.id}`).then(setFull);
    setSubscriptionName(sub.name);
    setRenaming(false);
  }, [sub.id]);
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
            ...(data.source_meta.rule_provider_names || []),
            ...sourceCatalog.ruleProviders,
          ]),
        ]}
        sourceYaml={data.yaml || ""}
        back={() => setEdit(undefined)}
        saved={() => {
          setEdit(undefined);
          reload();
          api(`/subscriptions/${sub.id}`).then(setFull);
        }}
      />
    );
  return (
    <div className="page">
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
            <Metric icon={<Activity />} name="Статус" value="Активна" good />
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
                    onClick={async () => {
                      const updated = await api(
                        `/subscriptions/${sub.id}/reset-name`,
                        { method: "POST" },
                      );
                      setSubscriptionName(updated.name);
                      setFull({ ...data, ...updated, yaml: data.yaml });
                      setRenaming(false);
                      reload();
                    }}
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
                    disabled={!subscriptionName.trim()}
                    onClick={async () => {
                      const updated = await api(`/subscriptions/${sub.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ name: subscriptionName.trim() }),
                      });
                      setFull({ ...data, ...updated, yaml: data.yaml });
                      setRenaming(false);
                      reload();
                    }}
                  >
                    <Save /> Сохранить имя
                  </button>
                </>
              ) : (
                <button onClick={() => setRenaming(true)}>
                  <Settings /> Переименовать
                </button>
              )}
              <button
                onClick={async () => {
                  const refreshed = await api(
                    `/subscriptions/${sub.id}/refresh`,
                    { method: "POST" },
                  );
                  setFull(refreshed);
                  setSubscriptionName(refreshed.name);
                  reload();
                }}
              >
                <RefreshCw /> Обновить
              </button>
            </div>
          </section>
          <div className="sectionTitle">
            <div>
              <h3>Профили конфигурации</h3>
              <p>Независимые настройки для каждого устройства или сценария</p>
            </div>
            <button
              className="primary"
              onClick={async () => {
                const p = await api(`/subscriptions/${sub.id}/profiles`, {
                  method: "POST",
                  body: JSON.stringify({
                    name: `Новый профиль ${sub.profiles.length + 1}`,
                    modifications: { rules: [], overrides: {} },
                  }),
                });
                reload();
                setEdit(p);
              }}
            >
              <CirclePlus />
              Новый профиль
            </button>
          </div>
          <div className="cards">
            {sub.profiles.map((p) => (
              <article className="profile" key={p.id}>
                <div className="profileTop">
                  <span className="device">
                    <Settings />
                  </span>
                  <span className="activeTag">
                    <i /> Активен
                  </span>
                </div>
                <h3>{p.name}</h3>
                <p>
                  {(p.modifications.rules || []).length} правил ·{" "}
                  {Object.keys(p.modifications.overrides || {}).length}{" "}
                  переопределений
                </p>
                <div className="link">
                  <code>{p.url}</code>
                  <button onClick={() => navigator.clipboard.writeText(p.url)}>
                    <Clipboard />
                  </button>
                </div>
                <div className="profileBtns">
                  <button onClick={() => setEdit(p)}>
                    <FileCog />
                    Настроить
                  </button>
                  <a href={p.url} target="_blank">
                    <ExternalLink />
                  </a>
                </div>
              </article>
            ))}
          </div>
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
  return (
    <section className="panel yaml">
      <div className="yamlHead">
        <div>
          <Code2 />
          <h3>Исходная конфигурация</h3>
        </div>
        <button onClick={() => navigator.clipboard.writeText(text)}>
          <Clipboard />
          Копировать
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

function Editor({
  profile,
  proxies,
  groups,
  ruleProviders,
  sourceYaml,
  back,
  saved,
  saveProfile,
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
  const targetSuggestions = useMemo(
    () => [
      ...new Set([
        ...groups,
        ...proxies,
        "DIRECT",
        "REJECT",
        "REJECT-DROP",
        "PASS",
      ]),
    ],
    [groups, proxies],
  );
  const targetBadges = useMemo(
    () =>
      Object.fromEntries([
        ...proxies.map((name) => [name, "Прокси"]),
        ...groups.map((name) => [name, "Группа"]),
        ...["DIRECT", "REJECT", "REJECT-DROP", "PASS"].map((name) => [
          name,
          "Политика",
        ]),
      ]),
    [groups, proxies],
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
                onChange={(e) =>
                  setRules(rules.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
              <button
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
          {err && <div className="error">{err}</div>}
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
    </div>
  );
}

function Admin() {
  const [pass, setPass] = useState(sessionStorage.getItem("admin") || "");
  const [data, setData] = useState<any>();
  const [defaultProfiles, setDefaultProfiles] = useState<DefaultProfile[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<number>(0);
  const [editTemplate, setEditTemplate] = useState<number>();
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const x = await api("/admin/overview", {
        headers: { "X-Admin-Password": pass },
      });
      sessionStorage.setItem("admin", pass);
      setData(x);
      setDefaultProfiles(x.default_profiles || []);
      setSelectedSourceId(x.subscriptions[0]?.id || 0);
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
  const templateSource: Sub | undefined = data?.subscriptions.find(
    (subscription: Sub) => subscription.id === selectedSourceId,
  );
  const templateCatalog = useMemo(
    () => catalogFromYaml(templateSource?.yaml || ""),
    [templateSource?.yaml],
  );
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
          ruleProviders={templateCatalog.ruleProviders}
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
                      {(profile.modifications.rules || []).length} правил · {Object.keys(profile.modifications.overrides || {}).length} переопределений
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
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
