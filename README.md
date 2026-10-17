# 🏰 Imperium der Zeitalter – AoE II Web RTS

Ein vollständiges, autarkes **Age-of-Empires-II-inspiriertes Echtzeit-Strategiespiel (RTS)** direkt im Browser, entwickelt mit moderner HTML5-Canvas-Grafik, Web Audio API und Web Speech Synthesis.

![HTML5](https://img.shields.io/badge/HTML5-Canvas%202.5D-E34F26?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## ⚔️ Spielfunktionen & Highlights

### 🎨 1. Grafik & 2.5D-Isometrie
- **Historische Mittelalter-Architektur:**
  - **Dorfzentrum:** Monumentale Stein-Holz-Zitadelle mit Dachgauben, Flaggen und Alarmglocke.
  - **Mühle:** Achteckiges Naturstein-Fundament, Fachwerk-Aufsatz und kontinuierlich rotierende Windmühlenflügel.
  - **Holzfäller- & Bergbaulager:** Rustikale Drop-off-Depots mit Hackklötzen, Holzstapeln und Erzhaufen.
  - **Waffenschmiede:** Bruchsteinmauerwerk, Schornsteinrauch, glühende Esse und Amboss.
  - **Kloster:** Gotische Kapelle, Buntglas-Spitzbogenfenster, Glockenturm und Hochkreuz.
  - **Befestigung:** Wehrtürme und Steinmauern mit Zinnen und Scharten.
- **Mehrstufige Bauschritte & Schadensstufen:** Gerüstbau (0–100%), Risse, Qualm, loderndes Feuer und verbleibende Ruinen.
- **Taktische Höhenebenen:** Hügel und Klippen mit schattierten Kanten und **+25% Angriffsbonus**.
- **3-Stufen Fog of War:** Unerforscht (schwarz), Erkundet/Schatten des Krieges (Sepia), Aktive Sichtlinie.

### 🏃 2. Animationen & Ballistik
- **8-Wege-Ausrichtung & Schrittzyklen:** Organische Laufbewegungen für Infanterie, Kavallerie, Dorfbewohner und Belagerungswaffen mit Huf- und Schrittstaub.
- **Einheiten-Equipment:**
  - Pikeniere mit Kettenhemd, konischem Eisenhelm und langer Stoßlanze.
  - Plänkler mit Federhut, Lederrüstung und Wurfspeeren.
  - Mönche mit Kutte, Krummstab und leuchtendem Heiligenschein.
- **Ballistische Projektile:** Echte Wurfparabeln für Pfeile, Wurfspeere und Katapultgeschosse mit Erdschatten, Screen-Shake und Einschlagskratern.

### 🔊 3. Sound-Design & Sprachausgabe
- **2.5D Spatial Stereo Audio:** Präzise Web Audio Panner-Positionierung im Raum relativ zur Kameraposition.
- **Deutsche Sprachausgabe (Web Speech Synthesis):**
  - Befehle & Selektion: *"Zu Befehl!"*, *"Jawohl!"*, *"Angriff!"*, *"Zu den Waffen!"*
  - Berufe: *"Holzfäller!"*, *"Bergarbeiter!"*, *"Baumeister!"*, *"Bauer!"*
  - Taktik & Alarm: *"Alle Bürger in Sicherheit!"*, *"Ausgeschwärmt!"*, *"Segnung!"*
  - Mönche: Legendäres *"Wololo!"* beim Bekehrungsversuch feindlicher Krieger.
- **Prozedurale Soundeffekte:** Domglockenschlag, Schwertklirren, Lanzenstiche, Pfeilabschüsse, Holzhacken, Steineschlagen und Fanfaren.
- **Adaptiver Soundtrack:** Mittelalterliche Lauten- und Orchestermusik, deren Intensität im Gefecht dynamisch ansteigt.

### ⚔️ 4. Gameplay, Taktik & Tiefe
- **A\*-Wegfindung & Vektorkollision:** 60x60 Navigationsgitter (2400x2400 Welt). Kein Durchlaufen von Seen, Klippen, Gebäuden oder Mauern; Sichtlinien-Pfadglättung.
- **Schere-Stein-Papier-Kampfsystem:**
  - Speerträger kontern Kavallerie massiv (**3.8x Schaden**).
  - Plänkler kontern Bogenschützen (**3.2x Schaden** + 3 Fernkampfrüstung).
  - Mönche heilen befreundete Truppen (+20 LP/s) und bekehren Feinde nach 4.2s Chanten.
- **Ressourcen-Logistik & Drop-offs:** Automatische Erkennung des nächsten Depots (Holzfällerlager, Bergbaulager, Mühle, Dorfzentrum) und Rückkehr zum Abbau.
- **Dorfglocke (`btnTownBell`, Taste [B]):** Schutz im Dorfzentrum/Turm (erhöht Pfeilfrequenz drastisch); Entquartieren schickt Bürger an ihre exakte vorherige Arbeit zurück.
- **Heeres-Formationen (`btnFormation`, Taste [Z]):**
  - **Kasten (`box`):** Schützt Fernkämpfer und Mönche im Zentrum.
  - **Linie (`line`):** Maximale Angriffsfront beim Vormarsch.
  - **Gestaffelt (`staggered`):** Weiträumige Staffelung zur Minimierung von Katapult-Flächenschaden.
- **Zivilisationen (Echtzeitwechsel über `btnCiv`):**
  - **Franken (⚜️):** +20% Ritter-LP, Burgen 100 Stein günstiger.
  - **Briten (🏹):** +30 Schussreichweite & +1 Angriff für Fernkämpfer.
  - **Teutonen (🛡️):** +2 Nahkampfrüstung für Infanterie, Türme fassen bis zu 10 Einheiten.
  - **Mongolen (🐎):** +20% Kavallerie-Tempo, +40% Sammelrate.
- **Forschungsbaum:**
  - Waffenschmiede: *Schmiedekunst*, *Schuppenpanzer*, *Befiederung*.
  - Mühle & Holzfällerlager: *Schubkarre* (+25% Tempo, 20 Tragekapazität) und *Doppelaxt* (+25% Holzertrag).
- **Adaptive KI:** Taktischer Rückzug bei <28% LP zu befreundeten Wehrtürmen/Burgen, reaktive Verteidigung bei Gebäudeangriffen, Mönchs-Support und gezielte Konter-Armeen.

---

## 🕹️ Steuerung & Tastenkürzel

| Taste | Aktion |
| :--- | :--- |
| **Linksklick / Ziehen** | Einheit(en) oder Gebäude auswählen |
| **Rechtsklick** | Marschbefehl, Angriff, Rohstoffabbau, Reparatur, Einquartieren |
| **Pfeiltasten / WASD** | Kamera bewegen |
| **Mausrad** | Zoom in / Zoom out |
| **[Leertaste] / [H]** | Kamera auf Dorfzentrum zentrieren |
| **[.] oder [,]** | Alle untätigen Dorfbewohner auswählen |
| **[F]** | Gesamte Armee auswählen |
| **[B]** | Dorfglocke läuten (Schutz suchen / Entquartieren) |
| **[Z]** | Militärische Formation wechseln (Kasten / Linie / Gestaffelt) |
| **Strg + 1–9** | Kontrollgruppe erstellen |
| **1–9** | Kontrollgruppe anwählen (Doppeltipp: Kamera zentrieren) |

---

## 🚀 Spiel starten

Einfach `index.html` in einem modernen Webbrowser (Chrome, Edge, Firefox, Safari) öffnen. Keine Installation, kein Build-Schritt, keine Server-Abhängigkeit erforderlich.
