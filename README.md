# Cryo Client

**Deine Welten. Deine Regeln.**

Cryo ist ein unabhängiger Windows-Launcher und Instanz-/Modpack-Manager für **Minecraft: Java Edition**, aktuell in früher Entwicklung. Dieses Repository ist die öffentliche Projektübersicht.

## Website und Download

- **[Cryo-Website](https://cryo-client.pages.dev)**
- **[Windows-Alpha 0.2.3 herunterladen](https://cryo-client.pages.dev/downloads/Cryo-Client-0.2.3-Setup.exe)**

Die Website zeigt den aktuellen Entwicklungsstand und enthält die SHA-256-Prüfsumme des Installers.

## Aktueller Stand

**Entwicklungs-Alpha: Der eigentliche Minecraft-Spielstart ist noch nicht implementiert.** Die Version dient zum Kennenlernen der Oberfläche und zum Verwalten von Instanzen und Mods.

Bereits umgesetzt:

- Instanzen mit eigener Minecraft-Version, Modloader-Auswahl und Modkonfiguration.
- Versionssuche mit dem offiziellen Minecraft-Versionsmanifest.
- Mods, Modpacks, Shader und Ressourcenpakete über die offizielle Modrinth-API entdecken.
- Modrinth-Modpacks importieren und ihre Inhalte verwalten.
- Optionales **Cryo Essentials** mit Fabric API, Sodium, Iris, Entity Culling, FerriteCore, Mod Menu, Lithium und ImmediatelyFast, soweit kompatibel.
- Mods mit Prüfsummen herunterladen sowie einzeln aktivieren und deaktivieren.
- Dunkles Glasdesign mit dem silbernen Cryo-Logo und farbigen Landschaften.

## Microsoft- und Minecraft-Anmeldung

Cryo verwendet seine eigene registrierte Microsoft-App. Die Anmeldung läuft über die offizielle Microsoft-Seite im Standardbrowser mit Authorization Code und PKCE. Cryo fragt nicht nach dem Microsoft-Passwort.

Der aktuelle Kontotest erreicht Minecraft Services, wird dort jedoch abgewiesen. Die zusätzliche App-Freigabe beziehungsweise die konkrete Ursache des Zugriffsfehlers ist noch zu klären. Ein vollständig funktionierender Login wird daher noch nicht zugesagt.

Refresh-Tokens werden in der Windows-Anmeldeinformationsverwaltung gespeichert; Zugangstokens werden nicht im normalen Konfigurationsspeicher oder in der Website abgelegt.

## Nächste Entwicklungsschritte

- Minecraft-Services-Zugriff abschließend klären und den vollständigen Kontotest durchführen.
- Minecraft-Spielstart sowie automatische Verwaltung von Java und Modloadern.
- Eigener Ingame-Mod und weitere Client-Funktionen.

## For reviewers

Cryo Client is an independent Windows desktop application under development. It uses its own Microsoft application registration and the system browser for OAuth sign-in. The current alpha does not launch Minecraft or connect to game servers. Before gameplay is enabled, successful authentication and verification of game ownership will be required. The design preview provides access to the interface only and does not bypass authentication or license checks for gameplay.

## Projekt und Kontakt

[Discord: Community, Feedback und Verbesserungsvorschläge](https://discord.gg/YBmWn3EeKz).

Projektbetreiber: [Jonaz123187](https://github.com/Jonaz123187).

Cryo Client ist ein unabhängiges Community-Projekt und steht in keiner Verbindung zu Mojang Studios oder Microsoft. Minecraft und die genannten Modprojekte gehören ihren jeweiligen Rechteinhabern.

