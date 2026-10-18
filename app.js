(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isLocalPreview =
    location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!isLocalPreview) document.documentElement.classList.add('public-view');

  /* ------------------------------------------------------------
   * 本机作品演示端口
   * 在这里填写默认端口（例如 medical: 8501）。页面内的配置面板会
   * 把端口保存到 localStorage，并覆盖此处的默认值。
   * ---------------------------------------------------------- */
  const SERVICE_DEFS = [
    { id: 'medical', name: 'SmartMedical Agent', defaultPort: null },
  ];

  const PORT_STORAGE_KEY = 'ylq-resume-ports';

  /* ---------- Views / tabs ---------- */

  const views = new Map(
    $$('.view').map((el) => [el.id.replace(/^view-/, ''), el])
  );
  const tabButtons = $$('.tab');

  function getViewFromHash() {
    const hash = location.hash.replace(/^#\/?/, '');
    return views.has(hash) ? hash : 'resume';
  }

  function jumpToTop() {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }

  function activateView(name, { updateHash = false, scroll = true } = {}) {
    if (!views.has(name)) name = 'resume';

    views.forEach((el, key) => {
      const active = key === name;
      el.classList.toggle('active', active);
      el.setAttribute('aria-hidden', String(!active));
    });

    tabButtons.forEach((btn) => {
      const active = btn.dataset.view === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });

    document.body.dataset.view = name;
    document.title = name === 'portfolio'
      ? '作品展示 · 杨立强'
      : '杨立强 · C++ 开发工程师';

    if (updateHash && location.hash !== `#${name}`) {
      history.pushState({ view: name }, '', `#${name}`);
    }

    if (scroll) jumpToTop();

    requestAnimationFrame(() => {
      refreshReveals();
      if (name === 'portfolio') animateNotes();
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateView(btn.dataset.view, { updateHash: true });
    });

    btn.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const index = tabButtons.indexOf(btn);
      const next = tabButtons[
        (index + (event.key === 'ArrowRight' ? 1 : -1) + tabButtons.length) % tabButtons.length
      ];
      next.focus();
      activateView(next.dataset.view, { updateHash: true });
    });
  });

  $$('[data-view-link]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      activateView(el.dataset.viewLink, { updateHash: true });
    });
  });

  window.addEventListener('popstate', () => {
    activateView(getViewFromHash(), { scroll: false });
  });

  /* ---------- Header, scroll progress ---------- */

  const header = $('#siteHeader');
  const progressBar = $('#scrollProgress');
  let scrollRaf = null;

  function updateScrollUI() {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 24);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(y / max, 1) : 0;
    progressBar.style.transform = `scaleX(${progress})`;
    scrollRaf = null;
  }

  window.addEventListener('scroll', () => {
    if (scrollRaf === null) scrollRaf = requestAnimationFrame(updateScrollUI);
  }, { passive: true });

  updateScrollUI();

  /* ---------- Reveal on scroll ---------- */

  function markVisible(el) {
    if (el.classList.contains('visible')) return;
    const group = el.closest('[data-reveal-group]');
    if (group) {
      const items = $$(':scope > .reveal', group);
      const index = items.indexOf(el);
      if (index > 0) el.style.transitionDelay = `${Math.min(index, 4) * 70}ms`;
    }
    el.classList.add('visible');
    window.setTimeout(() => { el.style.transitionDelay = ''; }, 1100);
  }

  const revealElements = $$('.reveal');
  let revealObserver = null;

  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        markVisible(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach(markVisible);
  }

  function refreshReveals() {
    if (reducedMotion || !revealObserver) return;
    revealElements.forEach((el) => {
      if (el.classList.contains('visible') || !el.offsetParent) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        markVisible(el);
        revealObserver.unobserve(el);
      }
    });
  }

  function animateNotes() {
    if (reducedMotion) return;
    $$('.note').forEach((note) => {
      note.style.transitionDelay = '0ms';
    });
  }

  /* ---------- Stats count-up ---------- */

  function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    if (reducedMotion) {
      el.textContent = String(target).padStart(2, '0');
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased)).padStart(2, '0');
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  window.setTimeout(() => $$('.stat-num[data-count]').forEach(countUp), 350);

  /* ---------- Typing effect ---------- */

  const typedEl = $('#roleTyped');
  const roles = ['C++ 开发工程师', 'Qt 桌面客户端开发', 'Linux 高并发网络编程', 'RPC 框架实践'];

  if (typedEl) {
    if (reducedMotion) {
      typedEl.textContent = roles[0];
    } else {
      let roleIndex = 0;
      let visibleChars = Array.from(roles[0]).length;
      let deleting = true;

      const tick = () => {
        const chars = Array.from(roles[roleIndex]);
        if (deleting) {
          visibleChars -= 1;
          typedEl.textContent = chars.slice(0, Math.max(visibleChars, 0)).join('');
          if (visibleChars <= 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            visibleChars = 0;
            window.setTimeout(tick, 420);
            return;
          }
          window.setTimeout(tick, 38);
        } else {
          visibleChars += 1;
          const current = Array.from(roles[roleIndex]);
          typedEl.textContent = current.slice(0, visibleChars).join('');
          if (visibleChars >= current.length) {
            deleting = true;
            window.setTimeout(tick, 2100);
            return;
          }
          window.setTimeout(tick, 82 + Math.random() * 46);
        }
      };

      window.setTimeout(tick, 2300);
    }
  }

  /* ---------- Particle field ---------- */

  const canvas = $('#bg-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let particles = [];
  let fieldWidth = 0;
  let fieldHeight = 0;
  let particleRaf = null;
  const pointer = { x: null, y: null, active: false };

  function createParticles() {
    const count = Math.min(86, Math.max(26, Math.round((fieldWidth * fieldHeight) / 24000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * fieldWidth,
      y: Math.random() * fieldHeight,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 1.3 + 0.6,
      color: Math.random() > 0.62 ? '139,92,246' : '34,211,238',
      alpha: Math.random() * 0.3 + 0.14,
    }));
  }

  function drawField() {
    ctx.clearRect(0, 0, fieldWidth, fieldHeight);
    const linkDistance = fieldWidth < 720 ? 100 : 132;

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];

      for (let j = i + 1; j < particles.length; j += 1) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > linkDistance * linkDistance) continue;
        const alpha = (1 - Math.sqrt(distanceSq) / linkDistance) * 0.11;
        ctx.strokeStyle = `rgba(129,140,248,${alpha.toFixed(3)})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }

      if (pointer.active && pointer.x !== null) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 170) {
          const alpha = (1 - distance / 170) * 0.2;
          ctx.strokeStyle = `rgba(34,211,238,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
      ctx.fill();
    }
  }

  function stepField() {
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = fieldWidth + 20;
      if (p.x > fieldWidth + 20) p.x = -20;
      if (p.y < -20) p.y = fieldHeight + 20;
      if (p.y > fieldHeight + 20) p.y = -20;
    });
    drawField();
    particleRaf = requestAnimationFrame(stepField);
  }

  function stopField() {
    if (particleRaf !== null) {
      cancelAnimationFrame(particleRaf);
      particleRaf = null;
    }
  }

  function startField() {
    if (!ctx || reducedMotion || particleRaf !== null || document.hidden) return;
    particleRaf = requestAnimationFrame(stepField);
  }

  function resizeField() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fieldWidth = window.innerWidth;
    fieldHeight = window.innerHeight;
    canvas.width = Math.round(fieldWidth * dpr);
    canvas.height = Math.round(fieldHeight * dpr);
    canvas.style.width = `${fieldWidth}px`;
    canvas.style.height = `${fieldHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
    drawField();
  }

  if (canvas && ctx) {
    resizeField();
    startField();

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeField, 160);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopField();
      else startField();
    });

    if (finePointer && !reducedMotion) {
      window.addEventListener('pointermove', (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
      }, { passive: true });

      document.documentElement.addEventListener('pointerleave', () => {
        pointer.active = false;
      });
    }
  }

  /* ---------- Cursor spotlight ---------- */

  const spotlight = $('#spotlight');

  if (spotlight && finePointer && !reducedMotion) {
    let spotlightX = 0;
    let spotlightY = 0;
    let spotlightRaf = null;

    window.addEventListener('pointermove', (event) => {
      spotlightX = event.clientX;
      spotlightY = event.clientY;
      spotlight.style.opacity = '1';
      if (spotlightRaf === null) {
        spotlightRaf = requestAnimationFrame(() => {
          spotlight.style.transform = `translate3d(${spotlightX - 320}px, ${spotlightY - 320}px, 0)`;
          spotlightRaf = null;
        });
      }
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => {
      spotlight.style.opacity = '0';
    });
  }

  /* ---------- Profile tilt ---------- */

  const tiltCard = $('#tiltCard');

  if (tiltCard && finePointer && !reducedMotion) {
    const wrap = tiltCard.closest('.profile-wrap');

    wrap.addEventListener('pointermove', (event) => {
      const rect = tiltCard.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      tiltCard.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
      tiltCard.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
    });

    wrap.addEventListener('pointerleave', () => {
      tiltCard.style.removeProperty('--rx');
      tiltCard.style.removeProperty('--ry');
    });
  }

  /* ---------- Toast ---------- */

  const toastEl = $('#toast');
  const toastMsg = $('#toastMsg');
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = message;
    toastEl.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* ---------- Clipboard ---------- */

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      /* fall through to legacy path */
    }

    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (error) {
      return false;
    }
  }

  $$('[data-copy]').forEach((el) => {
    el.addEventListener('click', async () => {
      const value = el.dataset.copy;
      const ok = await copyText(value);
      showToast(ok ? '邮箱已复制到剪贴板' : `复制失败，请手动复制：${value}`);
    });
  });

  /* ---------- Print ---------- */

  const printBtn = $('#printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }

  /* ---------- Local service ports ---------- */

  function normalizePort(value) {
    if (value === null || value === undefined || value === '') return null;
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
  }

  function readSavedPorts() {
    try {
      return JSON.parse(window.localStorage.getItem(PORT_STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  const savedPorts = readSavedPorts();
  const ports = {};
  SERVICE_DEFS.forEach((service) => {
    ports[service.id] = normalizePort(savedPorts[service.id])
      ?? normalizePort(service.defaultPort);
  });

  function serviceName(id) {
    const service = SERVICE_DEFS.find((item) => item.id === id);
    return service ? service.name : id;
  }

  function savePorts() {
    try {
      window.localStorage.setItem(PORT_STORAGE_KEY, JSON.stringify(ports));
    } catch (error) {
      /* storage may be unavailable in private contexts */
    }
  }

  function updatePortsUI() {
    let configured = 0;

    SERVICE_DEFS.forEach((service) => {
      const port = ports[service.id];
      if (port) configured += 1;

      const row = $(`.service-row[data-service="${service.id}"]`);
      if (row) {
        row.classList.toggle('is-live', Boolean(port));
        const portLabel = $('.port-value', row);
        if (portLabel) portLabel.textContent = port || '—';
        const input = $('input[data-port-input]', row);
        if (input && document.activeElement !== input) {
          input.value = port || '';
        }
      }

      $$(`[data-demo="${service.id}"]`).forEach((btn) => {
        btn.classList.toggle('is-live', Boolean(port));
        btn.title = port
          ? `打开 http://localhost:${port}`
          : '尚未配置端口，点击进行配置';
      });

      $$(`[data-note-status="${service.id}"]`).forEach((el) => {
        el.classList.toggle('is-live', Boolean(port));
        const label = el.querySelector('span');
        if (label) label.textContent = port ? 'PORT SET' : 'STANDBY';
      });
    });

    const badge = $('#serviceBadge');
    if (badge) {
      badge.textContent = `${configured} / ${SERVICE_DEFS.length} CONFIGURED`;
      badge.classList.toggle('has-live', configured > 0);
    }
  }

  function openService(id) {
    const port = ports[id];

    if (port) {
      window.open(`http://localhost:${port}/`, '_blank', 'noopener');
      showToast(`正在打开 ${serviceName(id)} · localhost:${port}`);
      return;
    }

    const row = $(`.service-row[data-service="${id}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
    window.setTimeout(() => {
      const input = $('input[data-port-input]', row);
      if (input) input.focus({ preventScroll: true });
    }, 380);
    showToast(`请先在服务面板中配置「${serviceName(id)}」的本机端口`);
  }

  $$('[data-port-input]').forEach((input) => {
    input.addEventListener('input', () => {
      const id = input.dataset.portInput;
      const raw = input.value.trim();
      if (raw === '') {
        ports[id] = null;
      } else {
        const parsed = normalizePort(raw);
        if (parsed !== null) ports[id] = parsed;
      }
      updatePortsUI();
    });

    input.addEventListener('change', () => {
      const id = input.dataset.portInput;
      const raw = input.value.trim();

      if (raw !== '' && normalizePort(raw) === null) {
        showToast('端口号需为 1–65535 之间的整数');
        input.value = ports[id] || '';
        updatePortsUI();
        return;
      }

      ports[id] = normalizePort(raw);
      input.value = ports[id] || '';
      savePorts();
      updatePortsUI();

      if (ports[id]) {
        showToast(`${serviceName(id)} 端口已保存：${ports[id]}`);
      }
    });
  });

  $$('[data-demo]').forEach((btn) => {
    btn.addEventListener('click', () => openService(btn.dataset.demo));
  });

  $$('[data-open-service]').forEach((btn) => {
    btn.addEventListener('click', () => openService(btn.dataset.openService));
  });

  const resetPortsBtn = $('[data-reset-ports]');
  if (resetPortsBtn) {
    resetPortsBtn.addEventListener('click', () => {
      try {
        window.localStorage.removeItem(PORT_STORAGE_KEY);
      } catch (error) {
        /* ignore */
      }
      SERVICE_DEFS.forEach((service) => {
        ports[service.id] = normalizePort(service.defaultPort);
      });
      updatePortsUI();
      showToast('已恢复默认端口配置');
    });
  }

  updatePortsUI();

  /* ---------- Footer year ---------- */

  const year = String(new Date().getFullYear());
  $$('#year, .footer-year').forEach((el) => { el.textContent = year; });

  /* ---------- Init ---------- */

  activateView(getViewFromHash(), { scroll: false });
})();
