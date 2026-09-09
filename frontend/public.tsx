import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clipboard,
  Clock3,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Laptop,
  Moon,
  Pause,
  RefreshCw,
  Route,
  Shield,
  Sun,
  Wifi,
} from "lucide-react";
import { MonacoEditor, formatBytes, useCopyAction } from "./shared";

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

export default function SubscriptionPage({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicProfileInfo>();
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [tab, setTab] = useState<"install" | "yaml">("install");
  const [platform, setPlatform] = useState("windows");
  const [clientId, setClientId] = useState("verge");
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
          <h1>{data.title}</h1>
          <p>Готовая конфигурация для ваших устройств. Установите клиент, добавьте ссылку и подключайтесь.</p>
        </section>

        <section className="publicSubscriptionCard">
          <div className="publicSubIdentity">
            <span className={data.enabled ? "publicStatusIcon" : "publicStatusIcon off"}>{data.enabled ? <Check /> : <Pause />}</span>
            <div><b>{data.profile_name}</b><p>{data.enabled ? "Активен" : "Отключён владельцем"} · обновлён {new Date(data.updated_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
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
              <div><h2>Подключение за пару минут</h2></div>
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

            <ol className="publicSteps">
              <li><div><h3>Установите {selectedClient?.name}</h3><p>Скачайте актуальную версию клиента для {PUBLIC_PLATFORMS.find((item) => item.id === platform)?.label}.</p>{selectedClient?.href ? <a href={selectedClient.href} target="_blank" rel="noreferrer"><Download /> Скачать приложение <ExternalLink /></a> : <div className="publicInstalled"><Check /> Уже установлен</div>}</div></li>
              <li><div><h3>Скопируйте ссылку</h3><p>Универсальная ссылка подходит для импорта и открывает эту страницу в браузере. Не передавайте персональные ссылки другим людям.</p><div className="publicLinkGroup"><label><span>Универсальная</span><div className="publicLinkBox"><code>{data.subscription_url}</code><button onClick={copySubscription} aria-label="Скопировать универсальную ссылку">{copied ? <Check /> : <Copy />}</button></div></label><label><span>Только конфиг</span><div className="publicLinkBox"><code>{data.config_url}</code><button onClick={copyConfig} aria-label="Скопировать ссылку только на конфиг">{configCopied ? <Check /> : <Copy />}</button></div></label></div></div></li>
              <li><div><h3>Добавьте профиль</h3><p>Откройте раздел профилей в приложении, выберите импорт по URL и вставьте скопированную ссылку.</p><button className="publicPrimary" onClick={copySubscription}>{copied ? <Check /> : <Clipboard />} {copied ? "Ссылка скопирована" : "Скопировать для импорта"}</button></div></li>
            </ol>
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
