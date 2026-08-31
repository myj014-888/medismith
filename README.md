# MediSmith — Medical & Therapy Centre

One-page site for MediSmith, an interdisciplinary medical and therapy centre at
11 Van Der Lingen Street, Paarl, 7646, South Africa.

Ten practitioners across nine disciplines. Each has a card; clicking a card opens
a flash-card modal with their details, a WhatsApp link, and a placeholder for
their practice website.

Static HTML, CSS and vanilla JavaScript. No build step, no dependencies.

## Running it

Any static server will do:

```bash
python -m http.server 5188
```

Then open <http://localhost:5188>. Opening `index.html` directly off disk also
works, though the embedded map behaves better over `http://`.

## Structure

```
index.html          markup, practitioner data, SVG sprite, schema.org JSON-LD
css/styles.css      the whole stylesheet
js/main.js          modal, scroll reveals, WhatsApp links, image fallbacks
assets/
  logo-board.png    supplied brand board — source for the two assets below
  og-image.jpg      1200x630 social card
  favicon.png       180x180 tab icon / apple-touch-icon
  team/             practitioner portraits
tools/
  crop-faces.py         cuts portraits out of the Canva team board
  make-social-assets.py regenerates og-image.jpg and favicon.png
```

## Palette

Sampled directly from the supplied logo board:

| Token | Value | Use |
| --- | --- | --- |
| `--sand` | `#DFCBB8` | the board cream — hero and practitioner grid |
| `--ink` | `#101E17` | deep forest — disciplines, visit, footer |
| `--ink-2` | `#16281E` | cards and raised surfaces |
| `--gold-true` | `#A87A38` | the logo gold, decorative marks |
| `--gold` | `#C08D45` | gold text on green |
| `--gold-ink` | `#6B4A1C` | gold text on cream (AA-safe) |

The green is not from the logo — the logo's darkest tone is a warm charcoal
(`#272521`). It was taken from the practice photography.

The page alternates ground: cream hero, black practitioner grid, cream
disciplines band, green visit block, black footer. Sections that sit on cream
(`.nav`, `.hero`, `.disciplines`) re-point the text tokens in a single block;
everything on a dark ground uses the root tokens. All text/ground pairs were
checked against WCAG AA — the lowest is 5.1:1.

The practitioner grid carries pointer-only micro-interactions: a gold spotlight
tracking the cursor, a few degrees of tilt per card, a staggered entrance and a
rule that draws itself under the section title. All of it is gated behind
`(hover: hover) and (pointer: fine)` and `prefers-reduced-motion`.

## Adding practitioners

Each card is an `<article class="card">` in `index.html` driven entirely by data
attributes:

| Attribute | Notes |
| --- | --- |
| `data-name` | full name as displayed |
| `data-role` | discipline |
| `data-practice` | practice name; falls back to "MediSmith" when blank |
| `data-tel` | SA number, e.g. `0724056743`. Blank disables the phone line and WhatsApp button |
| `data-web` | practice URL. Blank leaves the website button disabled with a "coming soon" note |
| `data-img` | portrait path; a missing file falls back to a gold monogram |
| `data-bio` | modal copy |

WhatsApp links are built at runtime — the leading `0` becomes `27`, so
`0724056743` becomes `wa.me/27724056743` with a pre-filled booking message.

## Photos

Portraits go in `assets/team/` as 4:5 JPGs, minimum 800×1000:

```
annwin-strohmenger.jpg   ciska-kruger.jpg        emcy-louw.jpg
rene-van-schalkwyk.jpg   tania-cameron.jpg       christelle-lotriet.jpg
marone-vivier.jpg        kayla-van-zyl.jpg       nicola-mostert.jpg
annette-pennazza.jpg
```

Any that are missing render as a gold monogram instead, so they can be added one
at a time without breaking the page.

`tools/crop-faces.py` can cut the nine faces out of the Canva team-board
screenshot as a stopgap. Save the screenshot as `board.png` in the project root:

```bash
python tools/crop-faces.py board.png --contact-sheet
```

That writes a preview with the crop boxes drawn on. If they line up, re-run
without the flag to write the files. Note that each face is only ~167×198px in
that screenshot, so the results are soft — original photography is needed before
launch.

## Deploying

Static site, `index.html` at the root — no build step. On Vercel: import the
repo, framework preset **Other**, leave the build command and output directory
empty.

`index.html` carries no `<link rel="canonical">` and its `og:image` is a
relative path, which is deliberate — there is no production domain yet. Once one
is connected, add the canonical and make `og:image` absolute; the comment above
the Open Graph block in `index.html` marks the spot.

## Outstanding

- [ ] Original practitioner photography (nine of ten still on monograms)
- [ ] Transparent logo PNG at `assets/logo.png` — it replaces the fallback
      wordmark in the hero automatically. The supplied board is a wall mockup on
      cream, so it can't be used directly.
- [ ] Practice website URLs — add `data-web` to enable the second button
- [ ] Confirm Ciska Kruger's number: `0212013304` sits oddly against
      Dr Annwin Strohmenger's `0212913303`
- [ ] Consulting hours, if they should be shown
