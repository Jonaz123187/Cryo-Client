const featureContent = {
  instances: {
    breadcrumb: "BIBLIOTHEK / INSTANZEN",
    footer: "Jede Instanz behält ihre eigene Modauswahl.",
    html: '<h3>Mehrere Instanzen verwalten</h3><p class="panel-description">Lege Version und Modloader pro Instanz fest. Mods und Konfigurationen bleiben getrennt.</p><div class="instance-row"><img class="instance-thumbnail" src="/assets/overworld.webp" alt=""><span><strong>Survival</strong><small>Fabric · 1.21.1 · Nivo Essentials</small></span><span class="tag">17 MODS</span></div><div class="instance-row"><img class="instance-thumbnail" src="/assets/cherry-grove.webp" alt=""><span><strong>Server-Modpack</strong><small>Fabric · 1.20.1 · Eigene Modauswahl</small></span><span class="tag">MODPACK</span></div><div class="instance-row"><img class="instance-thumbnail" src="/assets/alpine-dusk.webp" alt=""><span><strong>Vanilla</strong><small>Minecraft · Ohne zusätzliche Mods</small></span><span class="tag">VANILLA</span></div>',
  },
  mods: {
    breadcrumb: "ENTDECKEN / MODRINTH",
    footer: "Passende Versionen und erforderliche Abhängigkeiten.",
    html: '<h3>Mods direkt über Modrinth finden</h3><p class="panel-description">Suche Mods, Shader und Ressourcenpakete für deine Instanz oder importiere ein Modrinth-Modpack.</p><div class="mod-row"><i class="mod-symbol">S</i><span><strong>Sodium</strong><small>Rendering & Performance</small></span><svg><use href="#i-check"/></svg></div><div class="mod-row"><i class="mod-symbol">I</i><span><strong>Iris</strong><small>Shader-Unterstützung</small></span><svg><use href="#i-check"/></svg></div><div class="mod-row"><i class="mod-symbol">L</i><span><strong>Lithium</strong><small>Spieloptimierungen</small></span><svg><use href="#i-check"/></svg></div>',
  },
  essentials: {
    breadcrumb: "INSTANZ ERSTELLEN / NIVO ESSENTIALS",
    footer: "Die Auswahl hängt von Minecraft-Version und Modloader ab.",
    html: '<h3>Performance-Mods als Startpunkt</h3><p class="panel-description">Nivo Essentials ist eine optionale Auswahl aus Performance- und Komfortmods für neue Instanzen.</p><div class="preset-chips"><span>Sodium</span><span>Iris</span><span>Lithium</span><span>Fabric API</span><span>Entity Culling</span><span>FerriteCore</span><span>Mod Menu</span><span>ImmediatelyFast</span></div><div class="preset-toggle"><span>Nivo Essentials bei der Instanzerstellung</span><i class="decorative-switch" aria-hidden="true"></i></div><p class="panel-description" style="margin-top:17px;margin-bottom:0">Du wählst aus, was dabei sein soll. Nivo sucht passende Versionen und lädt erforderliche Abhängigkeiten mit.</p>',
  },
};

const tabs = [...document.querySelectorAll("[data-feature]")];
function setFeature(tab, focus = false) {
  const content = featureContent[tab.dataset.feature];
  if (!content) return;
  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  document.querySelector("#panel-content").innerHTML = content.html;
  if (!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
    document.querySelector("#panel-content").animate?.([{opacity:0,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:280,easing:"ease-out"});
  document.querySelector("#panel-breadcrumb").textContent = content.breadcrumb;
  document.querySelector("#panel-footer-text").textContent = content.footer;
  document
    .querySelector("#feature-panel")
    .setAttribute("aria-labelledby", tab.id);
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setFeature(tab));
  tab.addEventListener("keydown", (event) => {
    let target;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      target = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      target = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = tabs.length - 1;
    if (target !== undefined) {
      event.preventDefault();
      setFeature(tabs[target], true);
    }
  });
});
setFeature(tabs[0]);

const menu = document.querySelector(".menu-toggle");
const links = document.querySelector("#nav-links");
function closeMenu() {
  links.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", "Menü öffnen");
}
menu.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
});
document
  .querySelectorAll(".nav a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav")) closeMenu();
});

let release;
let pendingRelease;
let lastCheck = 0;
const checksum = document.querySelector("#checksum-value");
const copyButton = document.querySelector("#copy-checksum");
function refreshRelease() {
  if (pendingRelease) return pendingRelease;
  lastCheck = Date.now();
  release = undefined;
  copyButton.disabled = true;
  checksum.textContent = "Prüfsumme wird geladen …";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  pendingRelease = (async () => {
    try {
      const response = await fetch("/release.json", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Release-Information nicht erreichbar");
      const data = await response.json();
      if (
        !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data.version) ||
        !/^\/downloads\/Nivo-Client-[A-Za-z0-9._-]+\.exe$/.test(data.file) ||
        !/^[a-f0-9]{64}$/.test(data.sha256) ||
        !Number.isSafeInteger(data.bytes) ||
        data.bytes <= 0
      )
        throw new Error("Ungültiger Release");
      release = data;
      checksum.textContent = data.sha256;
      copyButton.disabled = false;
      document.querySelectorAll("[data-release-version]").forEach((node) => {
        node.textContent = data.version;
      });
      document.querySelector("#download-size").textContent =
        `${(data.bytes / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB · Version ${data.version}`;
      const list = document.querySelector("#release-highlights");
      const highlights = Array.isArray(data.highlights)
        ? data.highlights
            .filter((text) => typeof text === "string" && text.length <= 180)
            .slice(0, 8)
        : [];
      list.replaceChildren(
        ...highlights.map((text) => {
          const item = document.createElement("li");
          item.textContent = text;
          return item;
        }),
      );
      list.parentElement.hidden = !highlights.length;
    } catch {
      checksum.textContent = "Prüfsumme momentan nicht verfügbar.";
    } finally {
      clearTimeout(timeout);
      pendingRelease = undefined;
    }
  })();
  return pendingRelease;
}
// Keep the stable URL even in tabs that stay open across a new deployment.
// Cloudflare serves this alias with no-store; metadata is refreshed separately.
for (const link of document.querySelectorAll("a[download]")) {
  link.href = "/downloads/Nivo-Client-Setup.exe";
  link.addEventListener("click", () => {
    void refreshRelease();
  });
}
window.addEventListener("focus", () => {
  if (Date.now() - lastCheck > 30000) void refreshRelease();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastCheck > 30000) void refreshRelease();
});
void refreshRelease();
copyButton.addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  if (!release) {
    status.textContent = "Prüfsumme wird noch geladen.";
    return;
  }
  try {
    await navigator.clipboard.writeText(release.sha256);
    status.textContent = "Prüfsumme kopiert.";
  } catch {
    status.textContent =
      "Bitte die angezeigte Prüfsumme markieren und kopieren.";
  }
});

if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('reveal-visible');observer.unobserve(entry.target);}},{threshold:.08});
 document.querySelectorAll('.feature-section,.community,.development,.download-section').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
}
