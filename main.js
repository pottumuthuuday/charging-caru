/**
 * NOCTIS — Scrollytelling Engine & Interactive Experience
 * Pure Vanilla JavaScript (No frameworks, no libraries, 60fps targeted)
 */

(function () {
  'use strict';

  const cfg = window.NOCTIS_CONFIG;
  if (!cfg) {
    console.error('NOCTIS_CONFIG not found.');
    return;
  }

  // Detect Reduced Motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.body.classList.add('reduced-motion');
  }

  // Helper: Clamp
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

  // Helper: Ease Lerp
  const lerp = (start, end, factor) => start + (end - start) * factor;

  /* ==========================================================================
     1. Global Noise Tile & Grain Canvas (3-4% Opacity, Shifted ~8fps)
     ========================================================================== */
  function initNoise() {
    const canvas = document.getElementById('noise-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Create 128x128 offscreen noise tile
    const tile = document.createElement('canvas');
    const tileSize = 128;
    tile.width = tileSize;
    tile.height = tileSize;
    const tileCtx = tile.getContext('2d');
    const imgData = tileCtx.createImageData(tileSize, tileSize);
    const buffer32 = new Uint32Array(imgData.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
      const val = Math.floor(Math.random() * 255);
      // RGBA packed into 32-bit int: 0xAABBGGRR
      buffer32[i] = (255 << 24) | (val << 16) | (val << 8) | val;
    }
    tileCtx.putImageData(imgData, 0, 0);

    let pattern;
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      pattern = ctx.createPattern(tile, 'repeat');
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Shift tile randomly ~8 times per second (every 125ms)
    setInterval(() => {
      if (document.hidden) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const shiftX = Math.floor(Math.random() * tileSize);
      const shiftY = Math.floor(Math.random() * tileSize);
      ctx.save();
      ctx.translate(shiftX, shiftY);
      ctx.fillStyle = pattern;
      ctx.fillRect(-shiftX, -shiftY, canvas.width + tileSize, canvas.height + tileSize);
      ctx.restore();
    }, 125);
  }

  /* ==========================================================================
     2. Custom Cursor ("The Headlight" - Desktop Only)
     ========================================================================== */
  function initCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor || prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

    const labelEl = cursor.querySelector('.cursor-label');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let isHovered = false;
    let currentLabel = '';

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    // Mousedown flash for 120ms
    window.addEventListener('mousedown', () => {
      cursor.classList.add('is-down');
      setTimeout(() => cursor.classList.remove('is-down'), 120);
    });

    // Delegated Hover Logic
    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor], a, button, [role="tab"], .swatch');
      if (target) {
        isHovered = true;
        cursor.classList.add('is-hovered');

        // Check if inside lineup slide
        const lineupSlide = target.closest('.lineup-slide');
        if (lineupSlide) {
          currentLabel = lineupSlide.classList.contains('is-active') ? 'CONFIGURE' : 'OPEN';
        } else {
          currentLabel = target.getAttribute('data-cursor') || 'VIEW';
        }

        if (labelEl) labelEl.textContent = currentLabel;
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-cursor], a, button, [role="tab"], .swatch');
      if (target && !e.relatedTarget?.closest('[data-cursor], a, button, [role="tab"], .swatch')) {
        isHovered = false;
        cursor.classList.remove('is-hovered');
        if (labelEl) labelEl.textContent = '';
      }
    });

    // Smooth Cursor Render Loop (lerp 0.18)
    function renderCursor() {
      curX = lerp(curX, mouseX, 0.18);
      curY = lerp(curY, mouseY, 0.18);
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
  }

  /* ==========================================================================
     3. Frame Cache & Preloader Architecture
     ========================================================================== */
  class FrameSequence {
    constructor(options) {
      this.frameCount = options.frameCount;
      this.getDesktopPath = options.desktopPath;
      this.getMobilePath = options.mobilePath;
      this.images = new Array(this.frameCount);
      this.loadedIndices = new Set();
      this.isMobile = window.innerWidth < 768;

      window.addEventListener('resize', () => {
        const nowMobile = window.innerWidth < 768;
        if (nowMobile !== this.isMobile) {
          this.isMobile = nowMobile;
          // Reload frames for new viewport mode
          this.reloadAll();
        }
      }, { passive: true });
    }

    getPath(index) {
      return this.isMobile ? this.getMobilePath(index) : this.getDesktopPath(index);
    }

    loadFrame(index) {
      const i = index - 1;
      if (this.images[i]) return Promise.resolve(this.images[i]);

      return new Promise((resolve) => {
        const img = new Image();
        img.src = this.getPath(index);
        img.onload = () => {
          if (img.decode) {
            img.decode().catch(() => {}).finally(() => {
              this.images[i] = img;
              this.loadedIndices.add(index);
              resolve(img);
            });
          } else {
            this.images[i] = img;
            this.loadedIndices.add(index);
            resolve(img);
          }
        };
        img.onerror = () => {
          console.warn(`Failed to load frame ${index}`);
          resolve(null);
        };
      });
    }

    async loadRange(start, end, onProgress) {
      let loaded = 0;
      const total = end - start + 1;
      for (let i = start; i <= end; i++) {
        await this.loadFrame(i);
        loaded++;
        if (onProgress) onProgress(loaded, total, i);
      }
    }

    reloadAll() {
      const loaded = Array.from(this.loadedIndices);
      this.images = new Array(this.frameCount);
      this.loadedIndices.clear();
      // Refetch already requested frames in background
      for (const idx of loaded) {
        this.loadFrame(idx);
      }
    }

    getNearestFrame(targetIndex) {
      const clamped = clamp(targetIndex, 1, this.frameCount);
      if (this.loadedIndices.has(clamped)) {
        return this.images[clamped - 1];
      }

      // Search outwards for nearest loaded frame
      let dist = 1;
      while (clamped - dist >= 1 || clamped + dist <= this.frameCount) {
        if (clamped - dist >= 1 && this.loadedIndices.has(clamped - dist)) {
          return this.images[clamped - dist - 1];
        }
        if (clamped + dist <= this.frameCount && this.loadedIndices.has(clamped + dist)) {
          return this.images[clamped + dist - 1];
        }
        dist++;
      }
      return null;
    }
  }

  const heroSequence = new FrameSequence(cfg.hero);
  const dismantleSequence = new FrameSequence(cfg.dismantle);

  /* Preloader Logic: Load 1-40 Hero frames first */
  async function runPreloader() {
    const preloader = document.getElementById('preloader');
    const line = document.getElementById('preloader-line');
    const counter = document.getElementById('preloader-counter');

    const initialBatch = cfg.preload.heroInitialBatch || 40;
    let currentPct = 0;

    await heroSequence.loadRange(1, initialBatch, (loaded, total) => {
      const targetPct = Math.round((loaded / total) * 100);
      currentPct = targetPct;
      if (line) line.style.width = `${targetPct}%`;
      if (counter) counter.textContent = String(targetPct).padStart(3, '0');
    });

    // Bright flash on completion
    if (line) line.classList.add('is-complete');
    await new Promise((r) => setTimeout(r, 220));

    // Reveal site
    if (preloader) preloader.classList.add('is-hidden');
    document.body.classList.remove('is-loading');

    // Trigger initial hero reveal
    const heroCh1 = document.getElementById('hero-ch-1');
    if (heroCh1) heroCh1.classList.add('is-active');

    // Background preload: remaining hero frames, then dismantle frames
    (async () => {
      for (let i = initialBatch + 1; i <= heroSequence.frameCount; i++) {
        await heroSequence.loadFrame(i);
        // Yield to browser occasionally
        if (i % 25 === 0) await new Promise((r) => setTimeout(r, 16));
      }

      // Then load dismantle frames
      for (let i = 1; i <= dismantleSequence.frameCount; i++) {
        await dismantleSequence.loadFrame(i);
        if (i % 25 === 0) await new Promise((r) => setTimeout(r, 16));
      }
    })();
  }

  /* ==========================================================================
     4. Canvas Fit & Scrollytelling Scrubbing Engine
     ========================================================================== */
  function drawImageFit(ctx, img, canvasWidth, canvasHeight) {
    if (!img) return;

    const isLandscape = canvasWidth >= canvasHeight;
    let drawW, drawH, drawX, drawY;

    if (isLandscape) {
      // Cover-fit
      const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = (canvasWidth - drawW) / 2;
      drawY = (canvasHeight - drawH) / 2;
    } else {
      // Portrait: contain-fit vertically centered on --asphalt
      const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = (canvasWidth - drawW) / 2;
      drawY = (canvasHeight - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  /* Scrollytelling Controller */
  class ScrollyCanvas {
    constructor(wrapperEl, canvasEl, sequence, onProgressUpdate) {
      this.wrapper = wrapperEl;
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d', { alpha: false });
      this.sequence = sequence;
      this.onProgressUpdate = onProgressUpdate;

      this.currentFrame = 1;
      this.targetFrame = 1;
      this.lastDrawnFrame = -1;
      this.progress = 0;

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = 0;
      this.height = 0;

      this.initResize();
    }

    initResize() {
      const handleResize = () => {
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = Math.round(rect.width * this.dpr);
        this.canvas.height = Math.round(rect.height * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
        this.lastDrawnFrame = -1; // force redraw
      };

      window.addEventListener('resize', handleResize, { passive: true });
      handleResize();
    }

    updateScroll() {
      const rect = this.wrapper.getBoundingClientRect();
      const scrollDist = this.wrapper.offsetHeight - window.innerHeight;
      if (scrollDist <= 0) return;

      this.progress = clamp(-rect.top / scrollDist, 0, 1);
      this.targetFrame = Math.round(this.progress * (this.sequence.frameCount - 1)) + 1;

      if (this.onProgressUpdate) {
        this.onProgressUpdate(this.progress, this.targetFrame);
      }
    }

    renderTick() {
      // Lerp frame progress (0.15 factor)
      this.currentFrame = lerp(this.currentFrame, this.targetFrame, 0.15);
      const roundedFrame = Math.round(this.currentFrame);

      if (roundedFrame !== this.lastDrawnFrame) {
        const frameImg = this.sequence.getNearestFrame(roundedFrame);
        if (frameImg) {
          // Fill background solid --asphalt
          this.ctx.fillStyle = '#07080A';
          this.ctx.fillRect(0, 0, this.width, this.height);
          drawImageFit(this.ctx, frameImg, this.width, this.height);
          this.lastDrawnFrame = roundedFrame;
        }
      }
    }
  }

  /* ==========================================================================
     5. Hero Section Controller
     ========================================================================== */
  function initHero() {
    const heroWrapper = document.getElementById('hero-section');
    const heroCanvas = document.getElementById('hero-canvas');
    const blackoutEl = document.getElementById('hero-blackout');
    const progressLine = document.getElementById('hero-progress-line');

    const hudChapter = document.getElementById('hud-chapter-text');
    const hudSpeed = document.getElementById('hud-speed');
    const hudDistance = document.getElementById('hud-distance');

    const chapters = cfg.hero.chapters.map((ch) => ({
      ...ch,
      el: document.getElementById(ch.id)
    }));

    let activeChapterIndex = 0;

    const controller = new ScrollyCanvas(heroWrapper, heroCanvas, heroSequence, (prog) => {
      // Update Bottom Progress Line
      if (progressLine) progressLine.style.width = `${prog * 100}%`;

      // Update Blackout over last 5% of scroll
      if (blackoutEl) {
        if (prog >= cfg.hero.blackoutStart) {
          const blackoutProg = (prog - cfg.hero.blackoutStart) / (1.0 - cfg.hero.blackoutStart);
          blackoutEl.style.opacity = String(clamp(blackoutProg, 0, 1));
        } else {
          blackoutEl.style.opacity = '0';
        }
      }

      // Update HUD Telemetry
      const speed = Math.round(prog * cfg.hero.hud.speedMax);
      const dist = (prog * cfg.hero.hud.distanceMax).toFixed(1);
      if (hudSpeed) hudSpeed.textContent = `${String(speed).padStart(3, '0')} KM/H`;
      if (hudDistance) hudDistance.textContent = `${dist} KM`;

      // Chapter Activation
      let currentCh = -1;
      for (let i = 0; i < chapters.length; i++) {
        if (prog >= chapters[i].start && prog <= chapters[i].end) {
          currentCh = i;
          break;
        }
      }

      if (currentCh !== -1 && currentCh !== activeChapterIndex) {
        activeChapterIndex = currentCh;
        chapters.forEach((ch, idx) => {
          if (ch.el) {
            ch.el.classList.toggle('is-active', idx === currentCh);
          }
        });
        if (hudChapter) {
          hudChapter.textContent = `0${currentCh + 1}/04`;
        }
      } else if (currentCh === -1) {
        // Between chapters
        chapters.forEach((ch) => ch.el && ch.el.classList.remove('is-active'));
      }
    });

    return controller;
  }

  /* ==========================================================================
     6. Statement Word-by-Word Reveal (100vh)
     ========================================================================== */
  function initStatement() {
    const section = document.getElementById('engineering');
    const words = document.querySelectorAll('#statement-sentence .word');
    if (!section || !words.length) return;

    function onScroll() {
      const rect = section.getBoundingClientRect();
      const winH = window.innerHeight;

      // Visibility progress through the 100vh section: 0 when entering bottom, 1 when leaving top
      const scrollFraction = (winH - rect.top) / (winH + rect.height);
      const clampedProg = clamp(scrollFraction, 0, 1);

      // Map progress [0.25 to 0.75] across words
      const totalWords = words.length;
      words.forEach((word, idx) => {
        const wordStart = 0.2 + (idx / totalWords) * 0.55;
        const wordEnd = wordStart + 0.08;
        if (clampedProg >= wordEnd) {
          word.style.opacity = '1';
        } else if (clampedProg <= wordStart) {
          word.style.opacity = '0.15';
        } else {
          const ratio = (clampedProg - wordStart) / (wordEnd - wordStart);
          word.style.opacity = (0.15 + ratio * 0.85).toFixed(2);
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ==========================================================================
     7. Dismantle Section Controller & Precision Callouts
     ========================================================================== */
  function initDismantle() {
    const dismantleWrapper = document.getElementById('dismantle-section');
    const dismantleCanvas = document.getElementById('dismantle-canvas');
    const progressLine = document.getElementById('dismantle-progress-line');
    const calloutsContainer = document.getElementById('dismantle-callouts');

    const calloutElements = cfg.dismantle.callouts.map((c) => {
      const el = document.getElementById(c.id);
      const dot = el?.querySelector('.callout-dot');
      const line = el?.querySelector('.callout-line');
      const card = el?.querySelector('.callout-card');
      return { ...c, el, dot, line, card };
    });

    function updateCalloutGeometry() {
      if (!calloutsContainer) return;
      const rect = calloutsContainer.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      calloutElements.forEach((item) => {
        if (!item.el) return;
        const dotPxX = (item.dotX / 100) * w;
        const dotPxY = (item.dotY / 100) * h;
        const labelPxX = (item.labelX / 100) * w;
        const labelPxY = (item.labelY / 100) * h;

        if (item.dot) {
          item.dot.style.left = `${dotPxX}px`;
          item.dot.style.top = `${dotPxY}px`;
        }

        if (item.card) {
          item.card.style.left = `${labelPxX}px`;
          item.card.style.top = `${labelPxY}px`;
        }

        if (item.line) {
          item.line.setAttribute('x1', dotPxX);
          item.line.setAttribute('y1', dotPxY);
          item.line.setAttribute('x2', labelPxX);
          item.line.setAttribute('y2', labelPxY);
        }
      });
    }

    window.addEventListener('resize', updateCalloutGeometry, { passive: true });

    const controller = new ScrollyCanvas(dismantleWrapper, dismantleCanvas, dismantleSequence, (prog) => {
      // Update progress fill
      if (progressLine) progressLine.style.width = `${prog * 100}%`;

      // Callouts Visibility after 70% progress
      calloutElements.forEach((item) => {
        if (!item.el) return;
        const isVisible = prog >= item.startProgress;
        item.el.classList.toggle('is-visible', isVisible);
      });
    });

    updateCalloutGeometry();
    return controller;
  }

  /* ==========================================================================
     8. Lineup Hover Accordion (Desktop Hover + Touch/Keyboard)
     ========================================================================== */
  function initLineup() {
    const accordion = document.querySelector('.lineup-accordion');
    const slides = Array.from(document.querySelectorAll('.lineup-slide'));
    if (!accordion || !slides.length) return;

    let hoverTimeout = null;
    let activeIndex = 0;

    function activateSlide(index) {
      if (index === activeIndex) return;
      activeIndex = index;

      slides.forEach((slide, idx) => {
        const isActive = idx === index;
        slide.classList.toggle('is-active', isActive);
        slide.setAttribute('aria-expanded', String(isActive));
        slide.setAttribute('aria-selected', String(isActive));
        slide.setAttribute('data-cursor', isActive ? 'CONFIGURE' : 'OPEN');
      });
    }

    // Debounced Hover on Desktop (80ms)
    slides.forEach((slide, idx) => {
      slide.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
          activateSlide(idx);
        }, cfg.lineup.debounceTime || 80);
      });

      slide.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
      });

      // Tap / Click
      slide.addEventListener('click', () => {
        activateSlide(idx);
      });

      // Keyboard Arrow Navigation
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (idx + 1) % slides.length;
          activateSlide(next);
          slides[next].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (idx - 1 + slides.length) % slides.length;
          activateSlide(prev);
          slides[prev].focus();
        }
      });
    });

    // Color Swatch Selection inside slides
    document.querySelectorAll('.swatches').forEach((swatchGroup) => {
      const swatches = swatchGroup.querySelectorAll('.swatch');
      swatches.forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          swatches.forEach((s) => s.classList.remove('is-active'));
          swatch.classList.add('is-active');
        });
      });
    });

    // Reveal Accordion when section scrolls into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          accordion.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    observer.observe(accordion);
  }

  /* ==========================================================================
     9. Navigation Auto-Hide on Scroll Down / Show on Scroll Up
     ========================================================================== */
  function initNav() {
    const nav = document.getElementById('site-nav');
    if (!nav) return;

    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 60 && currentScrollY > lastScrollY + 4) {
        nav.classList.add('is-hidden');
      } else if (currentScrollY < lastScrollY - 4) {
        nav.classList.remove('is-hidden');
      }
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  /* ==========================================================================
     10. Main Animation & RequestAnimationFrame Master Loop
     ========================================================================== */
  function initMasterLoop(heroCtrl, dismantleCtrl) {
    let ticking = false;

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          heroCtrl.updateScroll();
          dismantleCtrl.updateScroll();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Continuous Render Loop for smooth frame interpolation
    function frameLoop() {
      heroCtrl.renderTick();
      dismantleCtrl.renderTick();
      requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);

    // Initial positioning
    heroCtrl.updateScroll();
    dismantleCtrl.updateScroll();
  }

  /* ==========================================================================
     Initialization Entry Point
     ========================================================================== */
  window.addEventListener('DOMContentLoaded', async () => {
    initNoise();
    initCursor();
    initNav();
    initStatement();
    initLineup();

    const heroCtrl = initHero();
    const dismantleCtrl = initDismantle();

    initMasterLoop(heroCtrl, dismantleCtrl);
    await runPreloader();
  });

})();
