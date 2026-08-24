> **Fassung 2 «weich» (August 2026).** Auf Entscheid des Besitzers wurde die
> Gestaltung auf eine weiche, monochrome Anmutung im Stil der Uber-App
> umgestellt. Damit sind aus diesem Dokument **überholt**: das Band-Signet
> samt 42-Grad-Schnitt (ersetzt durch die reine Wortmarke «Basislager 4.0»
> und ein schwarzes B-Icon), das dunkle Kopfband (ersetzt durch weissen Kopf
> mit Wortmarke), Kartenrahmen und -schatten (Karten sind jetzt hellgraue
> Flächen mit Radius 20 auf weissem Grund), der signalrote Suchknopf
> (Primäraktionen sind schwarz; Signal-Rot meldet nur noch Zustände) und
> die alten Radien-/Schattenwerte. Gültige Werte: `assets/tokens.css`.
> Die Grundprinzipien — knapper Akzent, Hierarchie durch Weissraum,
> 44-Pixel-Tippflächen, alles aus Tokens — gelten unverändert.

# Basislager 4.0 — Corporate Design

Umsetzungsauftrag für Claude Code. Diese Datei ist verbindlich: bei Widersprüchen zwischen bestehendem Code und diesem Dokument gilt dieses Dokument.

**Projekt:** privates Bordbuch für den Niesmann + Bischoff Arto 88 LE, Familie Hofmann
**Repository:** `hofmannchristoph/Basislager4.0`, deployed über GitHub Pages
**Nutzung:** iPhone und iPad im Fahrzeug, häufig bei Sonnenlicht, oft einhändig, teilweise ohne Empfang
**Aufgabe der Oberfläche:** eine Information in unter zehn Sekunden finden

---

## 1. Gestaltungsprinzip

Das System hat zwei Quellen, und sie teilen sich die Arbeit sauber auf:

- **Die Farbe und die Struktur kommen von Airbnb.** Weisse Flächen, grosszügiger Weissraum, weiche Rundungen, ein einziger warmer Akzent, sonst Graustufen.
- **Die Form kommt vom Fahrzeug.** Aus dem Arto 88 LE selbst, nicht aus einer Abbildung davon.

Vier Regeln, die alles andere ableiten:

1. **Der Akzent ist knapp.** Pro Bildschirm höchstens eine signalrote Fläche. Rot markiert die Primäraktion, nichts sonst. Keine roten Überschriften, keine roten Links, keine roten Warnungen.
2. **Hierarchie durch Grösse und Weissraum, nicht durch Farbe oder Rahmen.** Ein Abschnitt wird durch Abstand abgegrenzt, nicht durch eine Box.
3. **Gliederung innerhalb einer Card mit Haarlinien.** Nie verschachtelte Cards.
4. **Alles ist eine Tap-Fläche von mindestens 44 Pixeln.** Das Bordbuch wird einhändig bedient, oft mit Handschuhen.

---

## 2. Formsprache

Die Gestaltung leitet sich aus vier Beobachtungen am Fahrzeug ab. Das ist der Teil, der dieses Bordbuch von einem beliebigen Airbnb-Klon unterscheidet.

### Das Band

Der Arto hat eine einzige definierende Linie: das dunkle Glasband. Es steigt aus der Frontscheibe, bricht an der A-Säule um und läuft schnurgerade bis zum Heck. Ein Knick, zwei Segmente.

Im Interface wird daraus das Strukturelement:

- **Kopfband** — durchlaufendes dunkles Band in `--bl-ink` am oberen Rand, 60 px hoch, enthält Marke und Wortmarke
- **Sektions-Tab** — der 42-Grad-Schnitt, siehe unten
- **Haarlinien** — gliedern innerhalb einer Card, nie Rahmen

### Der 42-Grad-Schnitt

Die Frontscheibe des Arto steht bei rund 42 Grad. Dieser Winkel ist die Signatur des ganzen Systems. Jeder Schnitt, jede Fase, jede Abschrägung im Interface nutzt **genau** diesen Winkel — nie 30, nie 45.

Umsetzung als anschneidende Kante an der **führenden** (linken) Seite eines Elements:

```css
clip-path: polygon(var(--bl-cut) 0, 100% 0, 100% 100%, 0 100%);
```

`--bl-cut` ist der waagrechte Versatz und hängt an der Höhe: `Versatz = Höhe / tan(42°) = Höhe / 0.9004`. Bei 30 px Höhe sind das 33 px. Wird ein Element höher oder tiefer, muss `--bl-cut` mitgerechnet werden — sonst stimmt der Winkel nicht mehr, und der Winkel ist der ganze Punkt.

Der Schnitt liegt immer links und läuft von unten-links nach oben-rechts, wie die Scheibe. Nie gespiegelt.

### Glattflächigkeit

Der Aufbau des Arto ist fugenlos: GFK und Aluminium, keine sichtbaren Nähte, keine Zierleisten. Im Interface heisst das grosse ununterbrochene Flächen, keine Boxen in Boxen, kein sichtbares Raster. Weissraum trennt, nicht Linien.

### Eine Zierlinie

Am ganzen Fahrzeug gibt es genau eine Chromleiste. Im Interface gibt es genau einen Akzent pro Bildschirm. Dieselbe Regel, zweimal begründet.

---

## 3. Marke

### Das Signet ist das Band

Kein Fahrzeugbild, keine Silhouette, kein Piktogramm. Das Zeichen ist die Linie selbst: ein waagrechtes Band, dessen führendes Ende bei 42 Grad nach unten links abknickt.

Geometrie, verbindlich:

| Grösse | Strichstärke | Winkel | Schenkel | Knick | Ende |
|---|---|---|---|---|---|
| Lang, für Kopfzeile und Lockup | 26 | 42° | 58 | 64 / 30 | 198 |
| Kompakt, für Icon und Favicon | 30 | 42° | 60 | 66 / 32 | 150 |

Gezeichnet als Kontur mit `stroke-linejoin="round"` und `stroke-linecap="butt"`. Die stumpfen Enden sind Absicht: das schräge Ende unten liest sich als Scheibenkante, ein rundes Ende macht daraus eine Tablette.

Zwei optische Grössen, keine skalierte. Die lange Variante wird unter etwa 40 Pixel zu einem Strich; die kompakte hält bis 16.

| Datei | Einsatz |
|---|---|
| `logo/mark-band.svg` | Kopfzeile, erbt `currentColor` |
| `logo/mark-band-compact.svg` | kleine Anwendungen, erbt `currentColor` |
| `logo/lockup-horizontal.svg` | Marke plus Wortmarke, Druck und Titel |
| `logo/favicon.svg` | Browser-Tab, kompakte Marke auf Signal-Rot |
| `logo/favicon-32.png` / `-16.png` | Fallback |
| `logo/icon-app-1024.png` / `-512.png` / `-180.png` | App-Icon, quadratisch ohne Rundung |

Die App-Icons sind **ohne Rundung**. iOS und Android legen ihre eigene Maske darüber; eine mitgelieferte Rundung ergibt einen doppelten Rand. Das Favicon dagegen ist gerundet, weil Browser nicht maskieren.

### Verworfen, und warum

Damit niemand — auch kein späterer Durchgang mit Claude Code — wieder dort anfängt:

- **Fahrzeugsilhouette.** Der Arto ist im Profil ein langer tiefer Kasten. Das Unterscheidende steckt in Radlaufausformung und Schürzenkante und verschwindet unter 100 Pixeln. Ergebnis sah in drei Durchgängen nach Reisebus aus.
- **Frontgesicht flach reduziert.** Zwei Leuchten und ein Grill hat jedes Fahrzeug. Was den Arto vorne ausmacht — Chromglanz, Oberfläche, Reflex — lässt sich nicht in zwei Farben übersetzen.
- **Foto als Icon.** Keine Gestaltung, sondern der Verzicht darauf. Ausserdem: helles Fahrzeug vor hellem Himmel, bei 44 Pixeln ein grauer Fleck.
- **Die Lilie von Niesmann + Bischoff.** Steht für den Hersteller. Dieses Bordbuch ergänzt die Werksunterlagen und ersetzt sie nicht.

### Wortmarke

`Basislager` in Figtree ExtraBold, Laufweite −2 %. Darunter `4.0 · ARTO 88 LE` in Figtree Medium, 13 px, Laufweite +1.6, in `--bl-muted`.

`lockup-horizontal.svg` enthält die Schrift als `<text>` und braucht geladenes Figtree. Für Druck ohne Fontzugriff vorher in Pfade wandeln.

### Schutzraum

Rings um Marke und Lockup mindestens die halbe Höhe der Marke freihalten.

---

## 4. Farbe

Alle Werte liegen in `tokens.css`. **Keine Farbe wird im Bordbuch hartcodiert.** Jede Farbangabe referenziert eine Custom Property.

### Akzent

| Token | Hex | Einsatz |
|---|---|---|
| `--bl-signal` | `#E8503C` | Suchknopf, Primäraktion. Höchstens einmal pro Bildschirm. |
| `--bl-signal-hover` | `#D0432F` | Hover und Active des Signal-Knopfs |
| `--bl-signal-bg` / `--bl-signal-text` | `#FDEDEA` / `#A8321F` | Fläche und Text bei Signal-Hinweisen |
| `--bl-retro` / `--bl-retro-bg` / `--bl-retro-text` | `#007A78` / `#E6F4F3` / `#005E5C` | Badge «Nachgerüstet» |
| `--bl-warn` / `--bl-warn-bg` / `--bl-warn-text` | `#B35309` / `#FFF8E6` / `#7A3A06` | Warn- und Achtungsboxen |

### Neutral

| Token | Hex | Einsatz |
|---|---|---|
| `--bl-ink` | `#222222` | Überschriften, Kennzahlen |
| `--bl-text` | `#484848` | Lauftext |
| `--bl-muted` | `#717171` | Label, Bildlegende, Metazeile |
| `--bl-border` | `#DDDDDD` | Rahmen von Cards und Buttons |
| `--bl-hairline` | `#EBEBEB` | Trennlinie innerhalb einer Card |
| `--bl-surface` | `#FFFFFF` | Card |
| `--bl-canvas` | `#F7F7F7` | Seitenhintergrund, Sektionsfläche |

### Regeln

- Text auf farbiger Fläche nimmt immer den dunkelsten Ton derselben Familie, nie Schwarz und nie Grau. Warntext auf `--bl-warn-bg` ist `--bl-warn-text`, nicht `--bl-text`.
- `--bl-border` und `--bl-hairline` sind nicht austauschbar: `--bl-border` umschliesst, `--bl-hairline` gliedert innen.
- Kein Dark Mode. Das Bordbuch wird bei Sonnenlicht gelesen; ein hellgraues Weiss mit dunklem Text ist dort besser lesbar als eine dunkle Oberfläche. `color-scheme: light` explizit setzen, damit iOS nichts invertiert.

---

## 5. Typografie

Figtree, variabel, selbst gehostet unter `assets/fonts/` mit `font-display: swap`. Nicht von Google Fonts laden — das Bordbuch muss ohne Empfang funktionieren.

| Rolle | Grösse | Gewicht | Zeilenhöhe | Laufweite |
|---|---|---|---|---|
| Display, Seitentitel | 32 px | 800 | 1.2 | −0.02em |
| H1, Bereichstitel | 26 px | 700 | 1.2 | −0.02em |
| H2, Kapiteltitel | 22 px | 700 | 1.35 | 0 |
| H3, Abschnittstitel | 18 px | 600 | 1.35 | 0 |
| Lauftext | 16 px | 400 | 1.6 | 0 |
| Label, Legende | 14 px | 400 | 1.5 | 0 |
| Meta, Pill, Badge | 13 px | 500 | 1.4 | 0 |
| Zahlenwert in Stat-Zeile | 22 px | 700 | 1.2 | 0 |

Regeln:

- Nie unter 13 px. Kennzahlen und Sicherungswerte nie unter 16 px.
- Negative Laufweite erst ab 26 px. Bei 16 px zerstört sie die Lesbarkeit.
- Lauftext nie über 760 px Breite (`--bl-content-width`).
- Grossbuchstaben nur an zwei Stellen: in der Zeile `4.0 · ARTO 88 LE` der Wortmarke und im Sektions-Tab mit dem 42-Grad-Schnitt. Sonst nirgends.
- Zahlenwerte mit `font-variant-numeric: tabular-nums`, damit Tabellenspalten stehen.

---

## 6. Form

### Radien

| Token | Wert | Einsatz |
|---|---|---|
| `--bl-radius-sm` | 8 px | Button, Eingabefeld, Copy-Feld |
| `--bl-radius-md` | 12 px | Card, Bild, Hinweisbox |
| `--bl-radius-lg` | 16 px | Sektionsfläche, Modal |
| `--bl-radius-pill` | 999 px | Pill, Badge, Suchfeld |

Kein Radius an einseitigen Rahmen. Wer `border-left` als Akzent setzt, setzt `border-radius: 0`.

### Schatten

| Token | Wert | Einsatz |
|---|---|---|
| `--bl-shadow-sm` | `0 1px 2px rgba(0,0,0,.08)` | Button in Ruhe |
| `--bl-shadow-md` | `0 2px 8px rgba(0,0,0,.10)` | Card |
| `--bl-shadow-lg` | `0 6px 20px rgba(0,0,0,.12)` | Suchfeld, Modal, Bottom-Nav |

`--bl-shadow-lg` höchstens zweimal pro Bildschirm. Mehr Schatten heisst nicht mehr Tiefe, sondern Unruhe.

### Abstände

4er-Raster: 4, 8, 12, 16, 24, 32, 48, 64. Keine Zwischenwerte.

- Zwischen Kapiteln: 48 px
- Zwischen Abschnitten innerhalb eines Kapitels: 32 px
- Innenabstand Card: 20 px waagrecht, 18 px senkrecht
- Zwischen Zeilen einer Definitionsliste: 12 px

---

## 7. Komponenten

Die Bausteine, die im Bordbuch vorkommen. Struktur und Tokens sind verbindlich, Klassennamen sind Vorschlag.

### 7.1 Sektions-Tab mit 42-Grad-Schnitt

Das Signaturelement. Steht über jedem Bereich und über jeder Videokarte.

```html
<p class="bl-eyebrow">Strom</p>
```

Fläche `--bl-ink`, Text weiss, 12 px, Gewicht 600, Laufweite +0.1em, Grossbuchstaben. Höhe 30 px, Innenabstand rechts 18 px, links `calc(var(--bl-cut) + 10px)`. Der Schnitt liegt links:

```css
clip-path: polygon(var(--bl-cut) 0, 100% 0, 100% 100%, 0 100%);
```

Wird die Höhe geändert, `--bl-cut` neu rechnen: `Höhe / 0.9004`. Nie den Winkel ändern.

### 6.2 Card

Der Grundbaustein. Weiss, 0.5 px Rahmen in `--bl-border`, Radius 12 px, `--bl-shadow-md`.

```html
<section class="bl-card">
  <span class="bl-badge bl-badge--retro">Nachgerüstet</span>
  <h2>Batterie und Solar</h2>
  <p>Drei Solarpeak-LiFePO4-Batterien, parallel geschaltet.</p>
  <div class="bl-stats"> … </div>
</section>
```

Nie eine Card in eine Card. Gliederung innen über `border-top: 0.5px solid var(--bl-hairline)`.

### 6.3 Badge

Pill, 12–13 px, Gewicht 500. Nur zwei Varianten:

- `--retro`: `--bl-retro-bg` mit `--bl-retro-text`, Text «Nachgerüstet»
- `--warn`: `--bl-warn-bg` mit `--bl-warn-text`

Kein Badge in Signal-Rot. Rot ist für Aktionen reserviert.

### 6.4 Stat-Zeile

Für Kennzahlen wie `540 Ah`, `1600 W`, `200 l`, `3,15 m`, `5500 kg`.

```html
<div class="bl-stats">
  <div><span class="bl-stat-value">540 Ah</span><span class="bl-stat-label">Batterie</span></div>
  <div><span class="bl-stat-value">1600 W</span><span class="bl-stat-label">Dauer AC</span></div>
</div>
```

Wert 22 px / 700 / `--bl-ink` mit `tabular-nums`, Label 13 px / 400 / `--bl-muted` darunter. Flex mit 24 px Abstand, obendrüber eine Haarlinie. Auf dem iPhone maximal zwei Werte pro Zeile.

### 6.5 Definitionsliste

Das häufigste Muster im Bordbuch: Begriff plus Erklärung (GX Touch-Reiter, Alde-Menü, Relaisbox-Plätze, Fernbedienungstasten).

```html
<dl class="bl-deflist">
  <div><dt>Kurz</dt><dd>Batterie, Frischwasser, Abwasser und Solarleistung auf einen Blick</dd></div>
  <div><dt>Übersicht</dt><dd>Energiefluss: Solarertrag, Wechselrichter, Batterie, AC-Lasten</dd></div>
</dl>
```

`dt` 16 px / 600 / `--bl-ink`, `dd` 16 px / 400 / `--bl-text`, Einzug 0. Jede Zeile durch `border-top: 0.5px solid var(--bl-hairline)` getrennt, 12 px Abstand. Auf breiten Bildschirmen zweispaltig mit `grid-template-columns: minmax(0, 200px) 1fr`, auf dem iPhone gestapelt.

Bei nummerierten Listen wie der Relaisbox steht die Nummer im `dt`: `1 · 20 A`. Nummer und Ampere-Wert nie in `--bl-muted` — das sind sicherheitsrelevante Werte.

### 6.6 Hinweisbox und Warnbox

Zwei Stufen, nicht mehr.

**Hinweis** (neutral, «gut zu wissen»): `--bl-canvas` als Fläche, Radius 12 px, kein Rahmen, kein Icon. Titel 14 px / 600 / `--bl-ink`, Text 14 px / 400 / `--bl-text`.

**Warnung** (Handlung mit Folgen): `--bl-warn-bg`, Radius 12 px, kein Rahmen. Icon `alert-triangle` 18 px in `--bl-warn`, links, `flex-shrink: 0`. Titel und Text in `--bl-warn-text`.

```html
<aside class="bl-note bl-note--warn">
  <svg class="bl-note-icon" …></svg>
  <div>
    <p class="bl-note-title">Nur gleicher Wert, nie überbrücken</p>
    <p>Ersatzsicherung immer mit demselben Ampere-Wert einsetzen.</p>
  </div>
</aside>
```

Warnboxen werden nicht rot. Rot ist die Aktionsfarbe; eine rote Box, die man nicht antippen kann, ist ein Fehlsignal.

### 6.7 Pill-Navigation

Bereichsfilter. Aktiv: `--bl-ink` als Fläche, weisser Text. Inaktiv: weiss, 0.5 px `--bl-border`, `--bl-text`. Beide 13 px / 500, Innenabstand 7 px / 14 px, Radius pill. Waagrecht scrollbar mit `scroll-snap-type: x proximity`, Scrollbalken ausgeblendet, Tap-Fläche über `padding` auf 44 px gebracht.

Aktive Pill nie in Signal-Rot.

### 6.8 Suchfeld

Der einzige Ort mit Signal-Rot.

```html
<button class="bl-search">
  <svg class="bl-search-icon" …></svg>
  <span>
    <span class="bl-search-title">Im Bordbuch suchen</span>
    <span class="bl-search-sub">Kapitel, Werte, Zugangsdaten</span>
  </span>
  <span class="bl-search-go"><svg …></svg></span>
</button>
```

Weisse Fläche, Radius pill, `--bl-shadow-lg`, 0.5 px `--bl-border`. Titel 14 px / 500 / `--bl-ink`, Untertitel 13 px / 400 / `--bl-muted`. Der Knopf rechts ist ein Kreis von 32 px in `--bl-signal` mit weissem Pfeil.

### 6.9 Copy-Feld

Für Zugangsdaten (WLAN, Passwort, SIM-PIN, PUK, Oberflächen-Adresse).

Wert in `--bl-mono`, 16 px, `--bl-ink`. Kopierknopf rechts, 44 × 44 px, Icon `copy` 18 px in `--bl-muted`. Nach dem Kopieren wechselt das Icon für 1.5 Sekunden auf `check` in `--bl-retro` und der `aria-live`-Bereich meldet «Kopiert». Kein Toast.

### 6.10 Aufklapper «mehr»

Native `<details>` / `<summary>`, kein JavaScript. Summary 16 px / 600 / `--bl-ink`, rechts ein `chevron-down` 18 px in `--bl-muted`, das sich bei `[open]` um 180 Grad dreht. Tap-Fläche 44 px. `--bl-hairline` oben und unten, kein Rahmen.

Wichtig: `<details>` bleibt für die Volltextsuche und `Strg+F` durchsuchbar nur, wenn `content-visibility` nicht auf `hidden` steht. Nicht optimieren.

### 6.11 Video-Card

Vorschaubild mit Radius 12 px, darüber links unten die Laufzeit als Pill: `rgba(0,0,0,.7)`, weisser Text, 12 px. Darunter Titel 18 px / 600 und Beschreibung 15 px / 400 / `--bl-text`. Die Metazeile «Video · Wasser» als Eyebrow in 13 px / `--bl-muted`.

Player lädt erst beim Antippen (`loading="lazy"`, Klick-zu-Laden). Ohne Empfang bleibt das Vorschaubild stehen mit dem Hinweis, dass der Player Internet braucht.

### 6.12 PDF-Link

Card mit Icon `file-type-pdf` 20 px in `--bl-muted`, Titel 16 px / 600, darunter die Metazeile mit Seitenzahl und Dateigrösse in 13 px / `--bl-muted`. Rechts `chevron-right`. Die Grössenangabe ist verbindlich — sie entscheidet, ob man die Datei bei knappem Empfang öffnet.

### 6.13 Bottom-Navigation

Vier Ziele: Inhalt, Suchen, Fragen, Nach oben. `position: sticky` am unteren Rand, weiss, `--bl-shadow-lg`, `backdrop-filter: blur(8px)` mit `rgba(255,255,255,.92)`. Icon 22 px plus Label 11 px — hier ist 11 px erlaubt, weil das Icon die Bedeutung trägt. Aktives Ziel in `--bl-ink`, inaktiv `--bl-muted`. `padding-bottom: env(safe-area-inset-bottom)`.

---

## 8. Verboten

- Verlaufsflächen jeder Art
- Mehr als eine signalrote Fläche pro Bildschirm
- Cards in Cards
- Rahmen und Schatten am selben Element in mehr als einer Stufe
- Grossbuchstaben ausserhalb der Wortmarke
- Emoji
- Rot für Warnungen
- Text unter 13 px, Kennzahlen unter 16 px
- Hartcodierte Hex-Werte, Radien, Schatten oder Abstände
- `localStorage` für Inhalte — bei den Zugangsdaten ausdrücklich nicht
- Fonts oder Icons von einem CDN nachladen

---

## 9. Umsetzung

### Schritte

1. `tokens.css` in `assets/` legen und als erstes Stylesheet einbinden, vor allem anderen CSS.
2. Figtree variabel unter `assets/fonts/` selbst hosten, `@font-face` mit `font-display: swap`. Bestehende Google-Fonts-Einbindung entfernen.
3. Logodateien unter `assets/logo/` legen. `icon-512.svg` als `apple-touch-icon` und Web-App-Icon, `icon-small.svg` als Favicon, `lockup-horizontal.svg` in der Kopfzeile.
4. Bestehendes CSS durchgehen und **jeden** Hex-Wert, Radius, Schatten und Abstand durch das passende Token ersetzen. Wo kein Token passt, hier nachfragen statt einen neuen Wert erfinden.
5. Komponenten aus Abschnitt 7 als CSS-Klassen anlegen und die Kapitel darauf umstellen. Bereich für Bereich, in der Reihenfolge der Sektionen.
6. Nach jedem Bereich gegen die Prüfliste in Abschnitt 10 kontrollieren.

### Nicht anfassen

- Die Inhalte. Kein Satz wird umformuliert, keine Zahl geändert, keine Anleitung gekürzt. Das ist eine reine Gestaltungsarbeit.
- Die Anker-IDs (`#stuetzen`, `#auswintern`, `#gx`, `#zentralpanel`, `#maxxfan`, `#luftfederung`, `#originale`, `#inbetriebnahme`, `#fahrbereit`, `#sicherungen`). Sie sind kapitelübergreifend verlinkt.
- Die Suchfunktion und die Live-Werte im Kopf. Nur die Hülle wird neu gestaltet, die Logik bleibt.
- Die PDF-Dateien und ihre Pfade.
- `noindex, nofollow, noarchive, nosnippet` im Head.

---

## 10. Prüfliste

Nach jedem Bereich durchgehen:

- [ ] Kein Hex-Wert, Radius, Schatten oder Abstand ausserhalb von `tokens.css`
- [ ] Höchstens eine signalrote Fläche im Bildschirm
- [ ] Keine Card in einer Card
- [ ] Alle Tap-Flächen mindestens 44 × 44 px
- [ ] Alle Anker-IDs unverändert und alle internen Links funktionieren
- [ ] Kennzahlen und Sicherungswerte mindestens 16 px
- [ ] Lesbar auf iPhone SE (375 px) ohne waagrechtes Scrollen
- [ ] Tastaturfokus sichtbar: 2 px `--bl-signal`, 2 px Abstand
- [ ] `prefers-reduced-motion` respektiert
- [ ] Seite funktioniert im Flugmodus, ohne Layoutsprung durch fehlende Fonts
- [ ] `Strg+F` findet Text in geschlossenen `<details>`
- [ ] Kontrast: Lauftext mindestens 4.5:1, Kennzahlen mindestens 7:1
