# NOCTIS — Scrollytelling Automotive Experience

> **Mood:** A city in total blackout at night where the car's light is the only light in the world. Quiet, expensive, precise.

A minimal, high-performance, single-page scrollytelling website built for **NOCTIS**, a fictional electric performance vehicle brand.

---

## ⚡ Tech Stack & Architecture

- **Vanilla HTML5, CSS3, & Modern JavaScript (ES6+)**
- **Zero Frameworks, Zero Build Tools, Zero External Libraries** (no React, Vite, GSAP, Lenis, Tailwind)
- **Fonts**: Loaded strictly via Google Fonts (`Archivo`, `Inter`, `JetBrains Mono`)
- **Render Engine**: Canvas-based 60fps frame scrubbing via `requestAnimationFrame` with sub-pixel interpolation (`current += (target - current) * 0.15`)
- **Responsive Frame Delivery**: Dual WebP pipelines:
  - Desktop: 1600px wide, quality 78
  - Mobile: 960px wide, quality 72
- **Audio / Visual Ambiance**: Procedural film-grain noise shader overlay running on an offscreen canvas.

---

## 🏎️ Experience Breakdown

1. **Preloader**: Minimalist black screen, center-expanding xenon line with active mono telemetry counter (`000` to `100`).
2. **Hero Section (Pinned Scrollytelling, ~600vh)**:
   - Scrubbed image sequence of the GT-E advancing through the blackout city.
   - Sky-aligned masked typography reveals.
   - Dynamic left HUD telemetry displaying speed (`000` to `118 KM/H`) and distance (`0.0` to `4.2 KM`).
   - Seamless fade to black over the terminal 5% of scroll.
3. **Engineering Statement (100vh)**:
   - Word-by-word scroll-driven opacity reveal: *"Every part was designed to disappear into one line of light."*
4. **Dismantle Architecture (Pinned Scrollytelling, ~350vh)**:
   - Sticky canvas reversing vehicle assembly into component layers.
   - Four interactive callouts (Body, Battery, Drive, Light) appearing after 70% scroll with SVG hairline connectors.
5. **The Lineup (Interactive Accordion, 100vh)**:
   - 5 models: **GT-E**, **S**, **X**, **R**, **ONE**.
   - Desktop hover (80ms debounce) & touch/keyboard accessible (`aria-expanded`, arrow key navigation).
   - 72% shared wheel floor line with slide-in motion.
   - Solid square color swatches and specs grid.
6. **Allocation Reserve (100vh)**:
   - Minimalist CTA with dynamic xenon fill and taillight crimson active indicator.

---

## 🛠️ Local Development

Run with any static local server (e.g. Python, VS Code Live Server, or `npx serve`):

```bash
# Using Python
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## ⚙️ Configuration (`config.js`)

All section heights, chapter ranges, frame counts, frame paths, and callout coordinates are exposed in `config.js` for instant tuning.
