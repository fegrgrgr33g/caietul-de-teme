# Ilustrații pentru „Povestea Cunoașterii”

Tot ce se vede acum în lumea ilustrată e **desenat vectorial (SVG) în cod**, în `poveste.js`, separat pe straturi:
- cerul și castelul;
- podul și satul;
- terasa;
- glicina, florile și felinarul;
- pisica, cartea și insignele.

Desenele sunt stilizate. Pentru un aspect pictat, identic cu imaginea de referință, e nevoie de ilustrații făcute de un ilustrator (sau generate și apoi curățate). Pune fișierele în acest folder, cu numele de mai jos.

| Fișier | Ce conține | Mărime recomandată | Format |
|---|---|---|---|
| `scena-fundal.webp` | Doar peisajul: cerul la apus, castelul pe deal, podul, satul, terasa cu balustradă. **Fără** meniu, carte, panouri sau texte. | 2400 × 1350 px, sub 350 KB | WebP (sau AVIF) |
| `scena-fundal-telefon.webp` | Aceeași scenă, încadrată pe verticală, mai simplă. | 900 × 1600 px, sub 150 KB | WebP |
| `pisica.webp` | Pisica albă care doarme pe un teanc de cărți, fundal transparent. | 600 × 400 px | WebP cu transparență |
| `felinar.webp` | Felinarul aprins, fundal transparent. | 240 × 480 px | WebP cu transparență |
| `glicina.webp` | Ramurile de glicină care atârnă, fundal transparent. | 700 × 900 px | WebP cu transparență |
| `flori.webp` | Tufa de flori mov din colțul de jos, fundal transparent. | 900 × 600 px | WebP cu transparență |
| `carte-deschisa.webp` | Cartea deschisă **goală** (pagini fără texte și fără iconițe), văzută ușor de sus. | 2000 × 900 px | WebP cu transparență |
| `insigne/*.webp` | Câte o insignă pentru fiecare realizare: `primul-pas`, `fara-greseala`, `nota-10`, `condei-de-aur`, `scriitor-atent`, `cititor`, `prima-simulare`, `teoretician`, `maratonist-bac`. | 256 × 280 px | WebP cu transparență |

## Cum se folosesc

Fundalul pictat se activează dintr-o singură linie în `poveste.css`, în blocul `:root[data-tema="poveste"]`:

```css
--ilustratie-scena: url("img/scena-fundal.webp");
```

Pictura acoperă atunci desenul vectorial. Restul paginii (meniul, cartea, panourile, textele și butoanele) rămâne HTML real, accesibil și ușor de citit.

Pentru celelalte fișiere (pisică, felinar, glicină, flori, carte, insigne), desenul SVG corespunzător se înlocuiește cu un `<img>` în funcțiile din `poveste.js`:
- `pisicaSvg()`;
- `felinarSvg()`;
- `ciorchini()`;
- `flori()`;
- `carteCapitole()`;
- `scutSvg()`.
