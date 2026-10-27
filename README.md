# Nivo Client

Minecraft-Launcher für Mods und Modpacks. Öffentliche Alpha **0.4.4** mit Cape-Editor, Erststart-Einrichtung und separater Nivo-Core-Mod.

- [Website und aktueller Download](https://nivo-client.pages.dev/)
- [GitHub Releases](https://github.com/Jonaz123187/Nivo-Client/releases)
- [Nivo Client 0.4.4](https://github.com/Jonaz123187/Nivo-Client/releases/tag/v0.4.4): neue Cape-Bibliothek, animierter Skin, Bildeditor und aufgeräumter Startbereich.
- [Discord: Hilfe, Fehler und Vorschläge](https://discord.gg/YBmWn3EeKz)

## Funktionen

Instanzen und Versionen verwalten, Mods/Shader/Ressourcenpakete über Modrinth suchen, erforderliche Abhängigkeiten laden und Modpacks importieren. Optionale Nivo Essentials, eigene Instanzbilder, animierter Skin, einstellbares Glasdesign und Discord Rich Presence.

Downloads werden mit Prüfsummen kontrolliert. Der Launcher-Updater verlangt eine gültige Signatur einschließlich Versionsnummer. Die Microsoft-Anmeldung verwendet Systembrowser und PKCE; Refresh-Tokens liegen im Windows Credential Manager. Die Minecraft-App-Freigabe und der vollständige Kontotest stehen noch aus.

## Aktuelle Einschränkungen

Der vorläufige Spielstart im öffentlichen Installer 0.4.4 über Prism funktioniert weiterhin nicht zuverlässig. Nutze vorerst deinen bisherigen Launcher.

Der Profildienst nimmt inzwischen Minecraft-verifizierte Konten außerhalb des bisherigen Testkreises an. Die automatische Verbindung und der direkte Spielstart werden mit dem kommenden Launcher-Update noch lokal getestet; der öffentliche Installer bleibt vorerst 0.4.4.

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

Nivo Client, formerly Cryo Client, uses its own Microsoft application registration. Mojang has reported approval; the complete login and direct-launch flow is being tested locally for the next release. Public version 0.4.4 still has an unreliable temporary Prism bridge. No Prism credentials are imported. Standalone Fabric-mod tests remain private. The profile service requires verified Minecraft sessions.

Nivo ist ein unabhängiges Projekt von [Jonaz123187](https://github.com/Jonaz123187) und steht nicht mit Mojang Studios oder Microsoft in Verbindung.
