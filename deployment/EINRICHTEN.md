# Automatische Veröffentlichung einrichten

Die Website läuft unter https://nivo-client.pages.dev/. Der bestehende Host cryo-client.pages.dev bleibt erhalten, damit ältere Launcher ihren Update-Endpunkt erreichen. Seine Startseite leitet zur neuen Adresse weiter.

## Einmalig: Cloudflare mit GitHub verbinden

Diese Zugangsschritte bitte direkt in den jeweiligen Portalen selbst ausführen. Den Token nicht im Chat, Quellcode oder einer Datei ablegen.

1. In Cloudflare die API-Tokens öffnen und einen benutzerdefinierten Token für Nivo erstellen.
2. Berechtigung: Account → Cloudflare Pages → Edit. Auf das eigene benötigte Konto begrenzen. Diese Cloudflare-Berechtigung gilt auf Kontoebene, nicht nur für eine einzelne Pages-Seite.
3. Die Account ID des bestehenden Pages-Projekts kopieren.
4. Im GitHub-Repository Settings → Secrets and variables → Actions öffnen.
5. Zwei Repository-Secrets anlegen: CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID.
6. Unter Actions den Ablauf „Publish Nivo website“ öffnen und einmal „Run workflow“ ausführen.

Die kostenlosen Pages-Projekte nivo-client und cryo-client sind bereits angelegt und mit demselben Workflow verbunden. Ohne diese beiden Werte prüft der Ablauf die Dateien und meldet ausdrücklich, dass die Verbindung noch fehlt. Für neue Releases ist kein manueller Cloudflare-Upload mehr nötig.

Offizielle Anleitung: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

## Ein neuer Launcher-Release

Auf dem eingerichteten Entwickler-PC übernimmt `npm run release:publish` nach Build, `release:prepare` und `release:verify` den Upload. Die lokale GitHub CLI muss einmal angemeldet sein. Das Skript erstellt zuerst einen Entwurf, lädt Installer, stabile Downloadkopie, Signatur, Website-Paket, GitHub-Feed und Prüfsummen hoch und veröffentlicht zuletzt. Ein manueller Cloudflare-Upload entfällt.

Alternativ lässt sich der Release im GitHub-Portal anlegen:

1. Neue Launcher-Version lokal bauen und signieren. Der private Signierschlüssel bleibt auf dem Entwickler-PC.
2. Im Launcher-Projekt release:prepare und release:verify ausführen.
3. Auf GitHub einen stabilen Release mit Tag vX.Y.Z erstellen.
4. Die Datei Nivo-Website-X.Y.Z-Cloudflare.zip, den Installer und seine .sig-Datei an den Release anhängen. Das Website-Paket muss vor dem Veröffentlichen vollständig hochgeladen sein.
5. Den Release veröffentlichen. Der Workflow lädt das passende Paket, vergleicht Hash/Version/Dateien und prüft die Signatur gegen den öffentlichen Schlüssel im Repository.
6. Erst nach bestandenen Prüfungen werden Website, Download und Update-Feed in Cloudflare bereitgestellt. Entwürfe und Vorabversionen werden nicht automatisch produktiv veröffentlicht.

Für 0.4.1 heißen die Dateien Nivo-Website-0.4.1-Cloudflare.zip, Nivo-Client-0.4.1-Setup.exe und Nivo-Client-0.4.1-Setup.exe.sig. Im lokalen Ordner releases/0.4.1 liegen die vorbereiteten Dateien.

## Website-Änderungen

HTML, CSS, JavaScript und Bilder unter website/ bearbeiten und auf main übernehmen. Derselbe Workflow verbindet diese Quellen mit dem neuesten stabilen GitHub Release. Kein erneuter ZIP-Upload in Cloudflare nötig.

Vor dem ersten GitHub Release dient die bereits veröffentlichte 0.4.0 als Bootstrap. Ihr Installer ist über eine feste SHA-256-Prüfsumme und die bestehende Update-Signatur gebunden. Sobald ein GitHub Release existiert, wird dieser verwendet.

## Schutz und Grenzen

Archivpfade, doppelte Dateinamen, Links, Größen, SHA-256, Update-Adresse und Version werden geprüft. Aus Release-Archiven werden keine Skripte ausgeführt. Nur der geprüfte Installer und seine Metadaten werden mit den Website-Quellen zusammengeführt. Die Signaturprüfung nutzt dieselbe Minisign-Bibliothek wie Tauri und prüft auch die signierte Versionsnummer.

Der Workflow läuft nicht für fremde Pull Requests. Externe Actions sind auf konkrete Commit-SHAs festgelegt. Cloudflare erhält nur den fertigen Ordner deployment/out; private Schlüssel und Kontodaten gehören dort nicht hinein.

Lokale Prüfungen: python -m unittest discover -s deployment -p test_*.py -v
Signaturprüfung: cargo run --locked --manifest-path deployment/signature-check/Cargo.toml -- deployment/out deployment/updater-public.key

Ein grüner Prüflauf ohne Cloudflare-Secrets bedeutet „Dateien geprüft, Verbindung fehlt“, nicht „Website veröffentlicht“. Der letzte Schritt und die Zusammenfassung nennen eine tatsächlich ausgeführte Veröffentlichung gesondert.
