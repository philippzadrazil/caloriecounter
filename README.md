# Calorie Counter

Kleine PWA zum Tracken von Gewicht, Kalorienaufnahme und -verbrauch pro Tag.

## Features

- **Eingabe**: Gewicht, Frühstück, Mittagessen, Abendessen, Snack sowie Kalorien Ruhe/Aktiv pro Tag, inkl. automatischer Summen und Bilanz. Zwischen Tagen per Wischgeste, Pfeiltasten oder Datumsauswahl navigieren.
- **Liste**: Alle erfassten Tage mit Aufnahme, Verbrauch und Bilanz.
- **Grafik**: Balkendiagramm (Aufnahme vs. Verbrauch) und Liniendiagramm (Gewicht) über 7/30/90 Tage oder den gesamten Zeitraum.

Alle Daten werden ausschließlich lokal im Browser (`localStorage`) gespeichert, es gibt kein Backend.

## Lokal starten

Da die App einen Service Worker registriert, muss sie über `http(s)://` (nicht `file://`) geladen werden, z. B.:

```bash
python3 -m http.server 8080
```

Danach im Browser `http://localhost:8080` öffnen.

## Deployment (GitHub Pages)

1. Repo auf GitHub pushen (Branch `main`).
2. In den Repo-Settings unter **Pages** als Quelle den Branch `main` (Ordner `/`) auswählen.
3. Die App ist danach unter `https://<user>.github.io/caloriecounter/` erreichbar und kann auf dem iPhone über "Zum Home-Bildschirm" installiert werden.
