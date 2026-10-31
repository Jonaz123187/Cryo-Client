const capture=(image,caption)=>`<figure class="product-capture"><img src="/assets/${image}" alt="${caption}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
const featureContent = {
 instances:{breadcrumb:"BIBLIOTHEK / INSTANZEN",footer:"Eigene Minecraft-Versionen und getrennte Mods.",html:capture("instance-081.png","Echte Instanzansicht mit neutralen Beispieldaten.")},
 mods:{breadcrumb:"INHALTE / MODRINTH",footer:"Passend zu Minecraft-Version und Modloader.",html:capture("mods-081.png","Mods direkt im Launcher entdecken und installieren.")},
 essentials:{breadcrumb:"INSTANZEN / NIVO ESSENTIALS",footer:"Optionales Mod-Paket und eigene Mod-Presets.",html:capture("essentials-081.png","Nivo Essentials bei der Instanzerstellung auswählen.")},
 banners:{breadcrumb:"PROFIL / BANNER",footer:"Eigene Bilder hochladen. Andere Nivo-Spieler sehen dein Cape.",html:capture("banner-081.png","Lade dein eigenes Bild hoch und trage es als Cape. Alle anderen Spieler mit passendem Nivo Client sehen dein ausgewähltes Banner nach dem automatischen Profilabgleich.")},
 ingame:{breadcrumb:"MINECRAFT / NIVO-MENÜ",footer:"Mit Right Shift öffnen. Fabric 26.3, 26.2 und 1.21.11.",html:capture("ingame-081.png","Das überarbeitete Nivo-Menü direkt im Spiel.")}
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
      checksum.textContent = data.bootstrap?.sha256 ?? data.sha256;
      copyButton.disabled = false;
      document.querySelectorAll("[data-release-version]").forEach((node) => {
        node.textContent = data.version;
      });
      document.querySelector("#download-size").textContent =
        `${((data.bootstrap?.bytes ?? data.bytes) / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB · Version ${data.version}`;
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
      const overview=document.querySelector("#latest-release-notes");
      if(overview)overview.replaceChildren(...highlights.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      const date=document.querySelector("#release-date");
      if(date&&data.publishedAt&&!Number.isNaN(Date.parse(data.publishedAt)))date.textContent=new Date(data.publishedAt).toLocaleDateString("de-DE",{day:"numeric",month:"long",year:"numeric"});
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
    await navigator.clipboard.writeText(release.bootstrap?.sha256 ?? release.sha256);
    status.textContent = "Prüfsumme kopiert.";
  } catch {
    status.textContent =
      "Bitte die angezeigte Prüfsumme markieren und kopieren.";
  }
});

if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('reveal-visible');observer.unobserve(entry.target);}},{threshold:.08});
 document.querySelectorAll('.feature-section,.community,.development,#download').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
}
