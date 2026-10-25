# Nivo Client

Minecraft-Launcher für Mods und Modpacks. Nivo befindet sich in der Alpha; Minecraft-Spielstart, automatische Java-/Loader-Installation und der eigene Ingame-Mod werden noch entwickelt.

- [Website und aktueller Download](https://cryo-client.pages.dev/)
- [GitHub Releases](https://github.com/Jonaz123187/Nivo-Client/releases)
- [Nivo Client 0.4.1](https://github.com/Jonaz123187/Nivo-Client/releases/tag/v0.4.1): aufgeräumte Skin-Vorschau und einzelne Schalter für eigene Mods, Ressourcenpakete und Shader.
- [Discord: Hilfe, Fehler und Vorschläge](https://discord.gg/YBmWn3EeKz)

## Funktionen

Instanzen und Versionen verwalten, Mods/Shader/Ressourcenpakete über Modrinth suchen, erforderliche Abhängigkeiten laden und Modpacks importieren. Optionale Nivo Essentials, eigene Instanzbilder, animierter Skin, einstellbares Glasdesign und Discord Rich Presence.

Downloads werden mit Prüfsummen kontrolliert. Der Launcher-Updater verlangt eine gültige Signatur einschließlich Versionsnummer. Die Microsoft-Anmeldung verwendet Systembrowser und PKCE; Refresh-Tokens liegen im Windows Credential Manager. Die Minecraft-App-Freigabe und der vollständige Kontotest stehen noch aus. Die Vorschau erlaubt keinen Minecraft-Spielstart.

## Website und Veröffentlichung

`website/` enthält die aktuelle Website. `deployment/` bereitet signierte Veröffentlichungen aus GitHub Releases für das bestehende Cloudflare-Pages-Projekt vor.

Die Cloudflare-Verbindung ist eingerichtet und wurde mit einer erfolgreichen Veröffentlichung geprüft:

**Signierten Release auf GitHub veröffentlichen → Website, Download und Update-Feed werden automatisch aktualisiert.**

Website-Änderungen auf `main` werden ebenfalls automatisch bereitgestellt. Vor dem ersten GitHub Release nutzt die Prüfung die bereits veröffentlichte, fest hinterlegte 0.4.0. Ohne Cloudflare-Secrets werden nur die Prüfungen ausgeführt; es wird keine Veröffentlichung behauptet.

[Einmalige Einrichtung und Ablauf](deployment/EINRICHTEN.md) · [Veröffentlichungsprüfung](https://github.com/Jonaz123187/Nivo-Client/actions/workflows/publish-website.yml)

Der private Signierschlüssel bleibt auf dem Entwickler-PC. Dieser öffentliche Quellstand enthält Website und Veröffentlichungswerkzeuge; keine persönlichen Kontodaten, privaten Schlüssel oder Launcher-Entwicklungsordner.

## For reviewers

Nivo Client, formerly Cryo Client, uses its own existing Microsoft application registration. Its current alpha does not launch Minecraft or connect to game servers. Successful authentication and verification of game ownership will be required before gameplay is enabled. The preview only provides access to the launcher interface.

Nivo ist ein unabhängiges Projekt von [Jonaz123187](https://github.com/Jonaz123187) und steht nicht mit Mojang Studios oder Microsoft in Verbindung.
