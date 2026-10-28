# Nivo Client

Minecraft-Launcher für Mods und Modpacks. Öffentliche Beta **0.6.0** mit direktem Microsoft-Spielstart, großer Live-Konsole, Skin-Sammlung und integrierter Nivo-Core-Mod.

- [Website und aktueller Download](https://nivo-client.pages.dev/)
- [GitHub Releases](https://github.com/Jonaz123187/Nivo-Client/releases)
- [Nivo Client 0.6.0](https://github.com/Jonaz123187/Nivo-Client/releases/tag/v0.6.0): Nivo Core für drei Versionen, eigene Mod-Presets, Sicherungen, Mod-Updates und überarbeitete Skin-Sammlung.
- [Discord: Hilfe, Fehler und Vorschläge](https://discord.gg/YBmWn3EeKz)

## Funktionen

Instanzen und Versionen verwalten, Mods/Shader/Ressourcenpakete über Modrinth suchen, erforderliche Abhängigkeiten laden und Modpacks importieren. Optionale Nivo Essentials und eigene Mod-Presets, automatische lokale Weltsicherungen, gesicherte Mod-Updates, Setup-Vergleich, lokale Leistungsberichte, eigene Instanzbilder, animierter Skin, einstellbares Glasdesign und Discord Rich Presence.

Downloads werden mit Prüfsummen kontrolliert. Der Launcher-Updater verlangt eine gültige Signatur einschließlich Versionsnummer. Die Microsoft-Anmeldung verwendet Systembrowser und PKCE; Refresh-Tokens liegen im Windows Credential Manager. Die Minecraft-App ist freigegeben; der authentifizierte direkte Start mit Fabric 26.3 wurde getestet.

## Aktuelle Einschränkungen

Minecraft startet direkt über Nivo. Die zusätzlichen Ingame-Funktionen von Nivo Core sind derzeit für Fabric 26.3, 26.2 und 1.21.11 verfügbar; andere Versionen benötigen eigene Portierungen.

Der Profildienst nimmt Minecraft-verifizierte Konten öffentlich an. Die Verbindung erfolgt nach dem Beitritt automatisch. Der Cape-Datentransport ist korrigiert; ein gemeinsamer Test mit zwei echten Konten steht noch aus.

Die Nivo-Core-Mod wird nicht als separater öffentlicher Download angeboten; eigenständige Mod-Tests bleiben privat. Capes werden im Nivo-Launcher geändert. Freecam und ähnliche Funktionen können auf Servern verboten sein; Serverregeln beachten. Das Setup besitzt noch kein Windows-Herausgeberzertifikat.

## Website und Veröffentlichung

`website/` enthält die aktuelle Website. `deployment/` bereitet signierte Veröffentlichungen aus GitHub Releases für das bestehende Cloudflare-Pages-Projekt vor.

Die Cloudflare-Verbindung ist eingerichtet und wurde mit einer erfolgreichen Veröffentlichung geprüft:

**Signierten Release auf GitHub veröffentlichen → Website, Download und Update-Feed werden automatisch aktualisiert.**

Website-Änderungen auf `main` werden ebenfalls automatisch bereitgestellt. Vor dem ersten GitHub Release nutzt die Prüfung die bereits veröffentlichte, fest hinterlegte 0.4.0. Ohne Cloudflare-Secrets werden nur die Prüfungen ausgeführt; es wird keine Veröffentlichung behauptet.

Die Website liegt unter **nivo-client.pages.dev**. Die alte Startseite leitet dorthin weiter; alte Download- und Update-Adressen bleiben für bereits installierte Launcher erreichbar. Beide Pages-Projekte werden vom selben Workflow aktualisiert.

[Einmalige Einrichtung und Ablauf](deployment/EINRICHTEN.md) · [Veröffentlichungsprüfung](https://github.com/Jonaz123187/Nivo-Client/actions/workflows/publish-website.yml)

Der private Signierschlüssel bleibt auf dem Entwickler-PC. Dieser öffentliche Quellstand enthält Website und Veröffentlichungswerkzeuge; keine persönlichen Kontodaten, privaten Schlüssel oder Launcher-Entwicklungsordner.

## For reviewers

Nivo Client, formerly Cryo Client, uses its own Microsoft application registration. Mojang has reported approval; Microsoft login and direct launch with Fabric 26.3 have been tested locally. Prism is no longer needed. Standalone Fabric-mod builds remain private. The profile service requires verified Minecraft sessions.

Nivo ist ein unabhängiges Projekt von [Jonaz123187](https://github.com/Jonaz123187) und steht nicht mit Mojang Studios oder Microsoft in Verbindung.
