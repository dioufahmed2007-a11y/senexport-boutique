/* ═══════════════════════════════════════════════════════════════
   SENEXPORT — THEME.JS v6
   3 thèmes avec vrais caractères distincts :
   · nuit-doree  → Studio sombre (sobre, confiant, aéré)
   · clair       → Marché moderne (chaud, accessible, vivant)
   · nuit-bleue  → Tech minimal (bleu nuit, ultra propre)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const KEY = 'se_theme';

  const THEMES = {

    /* ── 1. STUDIO SOMBRE — sobre, confiant, aéré ── */
    'nuit-doree': {
      label:   'Studio Sombre',
      desc:    'Fond charbon, typographie aérée',
      icon:    '◼',
      class:   '',
      preview: ['#0F0F0F', '#D4AF37', '#1A1A1A'],
      vars: {
        '--bg':        '#0F0F0F',
        '--bg2':       '#141414',
        '--card':      '#1A1A1A',
        '--card2':     '#212121',
        '--border':    'rgba(255,255,255,.08)',
        '--or':        '#D4AF37',
        '--or2':       '#E0C04A',
        '--or-dim':    'rgba(212,175,55,.1)',
        '--or-line':   'rgba(212,175,55,.2)',
        '--ink':       '#F5F5F5',
        '--slate':     '#C0C0C0',
        '--stone':     '#808080',
        '--muted':     '#505050',
        '--green':     '#4ADE80',
        '--red':       '#F87171',
        '--blue':      '#60A5FA',
        '--ff-d':      "'Cormorant Garamond', Georgia, serif",
        '--ff-b':      "'DM Sans', system-ui, sans-serif",
        '--hero-bg':   'linear-gradient(150deg, #0F0F0F 0%, #161616 100%)',
      }
    },

    /* ── 2. MARCHÉ MODERNE — chaud, accessible, vivant ── */
    'clair': {
      label:   'Marché Moderne',
      desc:    'Crème chaud, énergie accessible',
      icon:    '◻',
      class:   'theme-clair',
      preview: ['#FAF6F0', '#1A1A1A', '#E8DDD0'],
      vars: {
        '--bg':        '#FAF6F0',
        '--bg2':       '#F2EBE0',
        '--card':      '#FFFFFF',
        '--card2':     '#EDE4D8',
        '--border':    'rgba(30,20,10,.1)',
        '--or':        '#1A1A1A',
        '--or2':       '#333333',
        '--or-dim':    'rgba(30,20,10,.06)',
        '--or-line':   'rgba(30,20,10,.15)',
        '--ink':       '#1A1208',
        '--slate':     '#3D2E1E',
        '--stone':     '#7A6655',
        '--muted':     '#A89080',
        '--green':     '#16A34A',
        '--red':       '#DC2626',
        '--blue':      '#2563EB',
        '--ff-d':      "'DM Sans', system-ui, sans-serif",
        '--ff-b':      "'DM Sans', system-ui, sans-serif",
        '--hero-bg':   'linear-gradient(150deg, #FAF6F0 0%, #F2EBE0 100%)',
      }
    },

    /* ── 3. TECH MINIMAL — bleu nuit, ultra propre ── */
    'nuit-bleue': {
      label:   'Tech Minimal',
      desc:    'Bleu nuit, lignes nettes',
      icon:    '◈',
      class:   'theme-nuit-bleue',
      preview: ['#080C14', '#38BDF8', '#0F1624'],
      vars: {
        '--bg':        '#080C14',
        '--bg2':       '#0C1220',
        '--card':      '#111827',
        '--card2':     '#1E2A3F',
        '--border':    'rgba(56,189,248,.12)',
        '--or':        '#38BDF8',
        '--or2':       '#7DD3FC',
        '--or-dim':    'rgba(56,189,248,.08)',
        '--or-line':   'rgba(56,189,248,.18)',
        '--ink':       '#F0F6FF',
        '--slate':     '#94A3B8',
        '--stone':     '#64748B',
        '--muted':     '#475569',
        '--green':     '#34D399',
        '--red':       '#F87171',
        '--blue':      '#38BDF8',
        '--ff-d':      "'DM Sans', system-ui, sans-serif",
        '--ff-b':      "'DM Sans', system-ui, sans-serif",
        '--hero-bg':   'linear-gradient(150deg, #080C14 0%, #0C1525 100%)',
      }
    }
  };

  const ALL_CLASSES = Object.values(THEMES).map(t => t.class).filter(Boolean);

  function apply(name) {
    const theme = THEMES[name] || THEMES['nuit-doree'];
    const root  = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    document.body.classList.remove(...ALL_CLASSES);
    if (theme.class) document.body.classList.add(theme.class);
    document.body.style.background = theme.vars['--bg'];
    document.body.style.color      = theme.vars['--ink'];
    localStorage.setItem(KEY, name);
    document.querySelectorAll('[data-theme]').forEach(btn => {
      const active = btn.dataset.theme === name;
      btn.setAttribute('aria-pressed', active);
      btn.style.borderColor = active ? theme.vars['--or'] : 'rgba(128,128,128,.15)';
      btn.style.background  = active ? theme.vars['--or-dim'] : 'transparent';
      const check = btn.querySelector('.theme-check');
      if (check) check.style.opacity = active ? '1' : '0';
    });
  }

  function get() { return localStorage.getItem(KEY) || 'clair'; }

  function renderWidget(container) {
    if (!container) return;
    const cur = get();
    container.innerHTML = Object.entries(THEMES).map(([key, t]) => {
      const active = cur === key;
      return `
        <button data-theme="${key}" aria-pressed="${active}" style="
          display:flex;align-items:center;gap:.85rem;padding:.85rem 1rem;
          background:${active ? t.vars['--or-dim'] : 'transparent'};
          border:1px solid ${active ? t.vars['--or'] : 'rgba(128,128,128,.15)'};
          border-radius:6px;cursor:pointer;width:100%;color:inherit;
          transition:.2s;font-family:inherit;margin-bottom:.5rem">
          <div style="display:flex;gap:2px;flex-shrink:0;border-radius:3px;overflow:hidden;border:1px solid rgba(128,128,128,.2)">
            ${t.preview.map(c => `<div style="width:14px;height:32px;background:${c}"></div>`).join('')}
          </div>
          <span style="flex:1;text-align:left">
            <strong style="display:block;font-size:.88rem;font-weight:600">${t.icon} ${t.label}</strong>
            <small style="font-size:.72rem;opacity:.6">${t.desc}</small>
          </span>
          <span class="theme-check" style="color:${t.vars['--or']};opacity:${active ? 1 : 0};transition:.2s;font-size:.9rem">✓</span>
        </button>`;
    }).join('');

    container.querySelectorAll('[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => { apply(btn.dataset.theme); renderWidget(container); });
    });
  }

  apply(get());
  window.SE_Theme = { apply, get, themes: THEMES, renderWidget };
  document.addEventListener('DOMContentLoaded', () => {
    const w = document.getElementById('se-theme-widget');
    if (w) renderWidget(w);
  });
})();
