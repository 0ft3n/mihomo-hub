import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ChevronRight,
  CirclePlus,
  Clipboard,
  Code2,
  Database,
  ExternalLink,
  FileCog,
  Globe2,
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
} from "lucide-react";
import MonacoEditor from "@monaco-editor/react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import "./style.css";

const API = "/api";
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
          <button
            className="subtle"
            onClick={async () => {
              const u = prompt("URL новой подписки");
              if (u) {
                await api("/subscriptions", {
                  method: "POST",
                  body: JSON.stringify({ url: u }),
                });
                load();
              }
            }}
          >
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
  if (edit)
    return (
      <Editor
        profile={edit}
        proxies={data.source_meta.proxy_names || []}
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
  sourceYaml,
  back,
  saved,
}: {
  profile: Profile;
  proxies: string[];
  sourceYaml: string;
  back: () => void;
  saved: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [rules, setRules] = useState<string[]>(
    profile.modifications.rules || [],
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
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
  const suggestions = useMemo(() => proxies.slice(0, 60), [proxies]);
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
    setRules(
      mode === "replace"
        ? [...new Set(parsedBulkRules)]
        : [...new Set([...rules, ...parsedBulkRules])],
    );
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
      await api(`/profiles/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({
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
        }),
      });
      saved();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <div className="page editor">
      <button className="back" onClick={back}>
        ← Назад к подписке
      </button>
      <div className="sectionTitle">
        <div>
          <h2>Настройка профиля</h2>
          <p>Изменения применяются при каждом запросе публичной ссылки</p>
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
              <select
                value={geo ? "dat" : "mmdb"}
                onChange={(e) => setGeo(e.target.value === "dat")}
              >
                <option value="dat">DAT</option>
                <option value="mmdb">MMDB</option>
              </select>
            </label>
            <label>
              <span>Загрузчик</span>
              <select
                value={geoLoader}
                onChange={(e) => setGeoLoader(e.target.value)}
              >
                <option value="memconservative">Экономия памяти</option>
                <option value="standard">Стандартный</option>
              </select>
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
            <div className="rule" key={i}>
              <input
                value={r}
                list="proxy-list"
                onChange={(e) =>
                  setRules(rules.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
              <button onClick={() => setRules(rules.filter((_, j) => j !== i))}>
                <Trash2 />
              </button>
            </div>
          ))}
          <datalist id="proxy-list">
            {suggestions.map((x) => (
              <option value={`DOMAIN-SUFFIX,example.com,${x}`} key={x} />
            ))}
          </datalist>
          <button
            onClick={() =>
              setRules([...rules, "DOMAIN-SUFFIX,example.com,DIRECT"])
            }
          >
            <CirclePlus />
            Добавить правило
          </button>
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
  const [defaults, setDefaults] = useState("{}");
  async function load() {
    try {
      const x = await api("/admin/overview", {
        headers: { "X-Admin-Password": pass },
      });
      sessionStorage.setItem("admin", pass);
      setData(x);
      setDefaults(JSON.stringify(x.defaults, null, 2));
    } catch (e: any) {
      alert(e.message);
    }
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
              <span>{s.source_meta.proxy_count} узлов</span>
            </div>
          ))}
        </section>
        <section className="panel form">
          <h3>Модификаторы по умолчанию</h3>
          <p className="hint">Применяются к первому профилю новых подписок.</p>
          <textarea
            value={defaults}
            onChange={(e) => setDefaults(e.target.value)}
          />
          <button
            className="primary"
            onClick={async () => {
              await api("/admin/defaults", {
                method: "PUT",
                headers: { "X-Admin-Password": pass },
                body: defaults,
              });
              alert("Сохранено");
            }}
          >
            <Save />
            Сохранить
          </button>
        </section>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
