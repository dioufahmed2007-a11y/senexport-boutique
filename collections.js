(function () {
  'use strict';

  const WA_NUMBER = '221778038874';

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatCountdown(targetDate) {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return null;
    const j = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { j, h, m, s, diff };
  }

  function fprix(n) {
    return Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ') + ' FCFA';
  }

  function imgUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://axgpohmhzmdgozndlntj.supabase.co/storage/v1/object/public/photos/${url}`;
  }

  async function loadCollections() {
    try {
      if (!window.SE || !SE.sb) return [];
      
      const { data: collections, error: colErr } = await SE.sb.from('collections')
        .select('*')
        .neq('statut', 'epuisee')
        .order('statut', { ascending: true })
        .order('date_lancement', { ascending: true });
        
      if (colErr) throw colErr;
      if (!collections || collections.length === 0) return [];

      const enriched = await Promise.all(collections.map(async col => {
        try {
          const { data: liens, error: lienErr } = await SE.sb.from('collection_articles')
            .select('article_ref')
            .eq('collection_id', col.id)
            .limit(4);
            
          if (lienErr || !liens || liens.length === 0) return { ...col, articles: [] };

          const refs = liens.map(l => l.article_ref);
          const { data: articles, error: artErr } = await SE.sb.from('articles')
            .select('reference, nom, prix_vente_fcfa, photo_url, quantite')
            .in('reference', refs)
            .limit(4);

          if (artErr) throw artErr;
          return { ...col, articles: articles || [] };
        } catch {
          return { ...col, articles: [] };
        }
      }));

      return enriched;
    } catch (e) {
      console.warn('[Collections] Erreur chargement:', e.message);
      return [];
    }
  }

  function renderAVenir(col) {
    const countdown = col.date_lancement ? formatCountdown(col.date_lancement) : null;
    const piecesHtml = (col.articles || []).slice(0, 2).map(a => `
      <div class="sec-col-teaser-piece">
        <div class="sec-col-teaser-img" style="background-image:url('${esc(imgUrl(a.photo_url))}')"></div>
      </div>
    `).join('') || `
      <div class="sec-col-teaser-piece"></div>
      <div class="sec-col-teaser-piece"></div>
    `;

    const cdHtml = countdown ? `
      <div class="sec-col-cd">
        <span class="sec-col-cd-unit"><span class="sec-col-cd-val" data-cd-j="${esc(col.id)}">${pad2(countdown.j)}</span><small>J</small></span>
        <span class="sec-col-cd-sep">:</span>
        <span class="sec-col-cd-unit"><span class="sec-col-cd-val" data-cd-h="${esc(col.id)}">${pad2(countdown.h)}</span><small>H</small></span>
        <span class="sec-col-cd-sep">:</span>
        <span class="sec-col-cd-unit"><span class="sec-col-cd-val" data-cd-m="${esc(col.id)}">${pad2(countdown.m)}</span><small>M</small></span>
        <span class="sec-col-cd-sep">:</span>
        <span class="sec-col-cd-unit"><span class="sec-col-cd-val" data-cd-s="${esc(col.id)}">${pad2(countdown.s)}</span><small>S</small></span>
      </div>
    ` : '';

    return `
      <div class="sec-col-card sec-col-avenir reveal">
        <div class="sec-col-badge sec-col-badge--avenir">✦ Bientôt</div>
        <div class="sec-col-teaser-images">${piecesHtml}</div>
        <div class="sec-col-content">
          <div class="sec-col-eyebrow">Prochain arrivage</div>
          <h3 class="sec-col-name">${esc(col.nom)}</h3>
          ${col.description ? `<p class="sec-col-desc">${esc(col.description)}</p>` : ''}
          ${cdHtml}
          <a href="https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Bonjour, je veux être notifié en avant-première pour la collection "${col.nom}" de SenExport.`)}"
             class="sec-col-btn sec-col-btn--wa" target="_blank" rel="noopener">
            <span>💬</span> Être notifié en avant-première
          </a>
        </div>
      </div>
    `;
  }

  function renderEnCours(col) {
    const articlesHtml = (col.articles || []).slice(0, 3).map(a => {
      const stock = a.quantite <= 3 ? `<span class="sec-col-art-stock low">⚡ ${esc(a.quantite)} restant${a.quantite > 1 ? 's' : ''}</span>` :
                    a.quantite > 0  ? `<span class="sec-col-art-stock ok">En stock</span>` : '';
      return `
        <a href="produit.html?ref=${esc(a.reference)}" class="sec-col-art-item">
          <div class="sec-col-art-img" style="background-image:url('${esc(imgUrl(a.photo_url))}')"></div>
          <div class="sec-col-art-info">
            <div class="sec-col-art-name">${esc(a.nom)}</div>
            <div class="sec-col-art-prix">${fprix(a.prix_vente_fcfa)}</div>
            ${stock}
          </div>
        </a>
      `;
    }).join('');

    return `
      <div class="sec-col-card sec-col-encours reveal">
        <div class="sec-col-header">
          <div>
            <div class="sec-col-badge sec-col-badge--encours">● Disponible maintenant</div>
            <h3 class="sec-col-name">${esc(col.nom)}</h3>
            ${col.description ? `<p class="sec-col-desc">${esc(col.description)}</p>` : ''}
          </div>
          <a href="collection.html?id=${esc(col.id)}" class="sec-col-btn sec-col-btn--or">Voir la collection →</a>
        </div>
        ${articlesHtml ? `<div class="sec-col-arts">${articlesHtml}</div>` : ''}
        <div class="sec-col-urgency">Stock limité · Paiement à la récupération · Thiès</div>
      </div>
    `;
  }

  function renderPassee(col) {
    const nbRestants = (col.articles || []).reduce((s, a) => s + (a.quantite || 0), 0);
    if (nbRestants === 0) return '';

    return `
      <div class="sec-col-card sec-col-passee reveal">
        <div class="sec-col-badge sec-col-badge--passee">Collection précédente</div>
        <div class="sec-col-passee-content">
          <div>
            <h4 class="sec-col-passee-name">${esc(col.nom)}</h4>
            <p class="sec-col-passee-stock">${nbRestants} pièce${nbRestants > 1 ? 's' : ''} encore disponible${nbRestants > 1 ? 's' : ''}</p>
          </div>
          <a href="collection.html?id=${esc(col.id)}" class="sec-col-btn sec-col-btn--ghost">Voir les pièces →</a>
        </div>
      </div>
    `;
  }

  function renderSection(collections) {
    const avenir  = collections.filter(c => c.statut === 'a_venir');
    const enCours = collections.filter(c => c.statut === 'en_cours');
    const passees = collections.filter(c => c.statut === 'passee');

    if (!avenir.length && !enCours.length && !passees.length) {
      return renderFallback();
    }

    const html = [
      ...enCours.map(renderEnCours),
      ...avenir.map(renderAVenir),
      ...passees.map(renderPassee).filter(Boolean),
    ].join('');

    return `
      <section class="sec-collections">
        <div class="sec-col-wrap">
          <div class="sec-col-header-main">
            <div class="sec-col-eyebrow-main">✦ Arrivages</div>
            <h2 class="sec-col-title-main">Collections & <em>drops</em></h2>
          </div>
          <div class="sec-col-list">${html}</div>
        </div>
      </section>
    `;
  }

  function renderFallback() {
    return `
      <section class="sec-collections">
        <div class="sec-col-wrap">
          <div class="sec-col-card sec-col-encours">
            <div class="sec-col-header">
              <div>
                <div class="sec-col-badge sec-col-badge--encours">● Arrivage en cours</div>
                <h3 class="sec-col-name">Arrivage Juin 2026</h3>
                <p class="sec-col-desc">Vêtements, électronique, maison. Sélectionnés avec soin. Stock limité.</p>
              </div>
              <a href="catalogue.html" class="sec-col-btn sec-col-btn--or">Voir le catalogue →</a>
            </div>
            <div class="sec-col-urgency">Stock limité · Paiement à la récupération · Thiès</div>
          </div>
        </div>
      </section>
    `;
  }

  function startCountdowns(collections) {
    const avenir = collections.filter(c => c.statut === 'a_venir' && c.date_lancement);
    if (!avenir.length) return;

    setInterval(() => {
      avenir.forEach(col => {
        const cd = formatCountdown(col.date_lancement);
        if (!cd) return;
        const jEl = document.querySelector(`[data-cd-j="${col.id}"]`);
        const hEl = document.querySelector(`[data-cd-h="${col.id}"]`);
        const mEl = document.querySelector(`[data-cd-m="${col.id}"]`);
        const sEl = document.querySelector(`[data-cd-s="${col.id}"]`);
        if (jEl) jEl.textContent = pad2(cd.j);
        if (hEl) hEl.textContent = pad2(cd.h);
        if (mEl) mEl.textContent = pad2(cd.m);
        if (sEl) sEl.textContent = pad2(cd.s);
      });
    }, 1000);
  }

  function injectStyles() {
    if (document.getElementById('se-collections-css')) return;
    const s = document.createElement('style');
    s.id = 'se-collections-css';
    s.textContent = `
      .sec-collections { padding: clamp(3rem,6vw,5rem) 0; }
      .sec-col-wrap { max-width: 1280px; margin: 0 auto; padding: 0 clamp(1.25rem,5vw,2.5rem); }
      .sec-col-header-main { text-align: center; margin-bottom: 2.5rem; }
      .sec-col-eyebrow-main { font-family: var(--ff-m); font-size: .68rem; letter-spacing: .2em; text-transform: uppercase; color: var(--or); margin-bottom: .75rem; display: flex; align-items: center; justify-content: center; gap: .5rem; }
      .sec-col-eyebrow-main::before, .sec-col-eyebrow-main::after { content: ''; display: block; width: 32px; height: 1px; background: rgba(212,175,55,.3); }
      .sec-col-title-main { font-family: var(--ff-d); font-size: clamp(2rem,4.5vw,3.2rem); font-weight: 400; letter-spacing: -.02em; line-height: 1.1; color: var(--ink); }
      .sec-col-title-main em { color: var(--or); font-style: italic; font-weight: 300; }
      .sec-col-list { display: flex; flex-direction: column; gap: 1.25rem; }
      .sec-col-card { border-radius: 6px; overflow: hidden; padding: clamp(1.5rem,4vw,2rem); position: relative; }
      .sec-col-badge { display: inline-flex; align-items: center; gap: .4rem; font-family: var(--ff-m); font-size: .65rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; padding: .35rem .9rem; border-radius: 3px; margin-bottom: 1rem; }
      .sec-col-badge--avenir  { background: rgba(212,175,55,.12); color: var(--or); border: 1px solid rgba(212,175,55,.25); }
      .sec-col-badge--encours { background: rgba(45,138,90,.15); color: var(--green); border: 1px solid rgba(45,138,90,.3); }
      .sec-col-badge--encours::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: badgeBlink 1.4s ease infinite; }
      @keyframes badgeBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
      .sec-col-badge--passee  { background: rgba(255,255,255,.05); color: var(--muted); border: 1px solid rgba(255,255,255,.08); }
      .sec-col-eyebrow { font-family: var(--ff-m); font-size: .64rem; letter-spacing: .16em; text-transform: uppercase; color: var(--or); margin-bottom: .5rem; }
      .sec-col-name { font-family: var(--ff-d); font-size: clamp(1.6rem,3.5vw,2.4rem); font-weight: 400; letter-spacing: -.02em; line-height: 1.1; color: var(--ink); margin-bottom: .6rem; }
      .sec-col-desc { font-size: .9rem; color: var(--stone); line-height: 1.65; margin-bottom: 1.25rem; max-width: 520px; }
      .sec-col-encours { background: var(--card2); border: 1px solid var(--or-line); box-shadow: 0 0 0 1px rgba(212,175,55,.04), 0 24px 48px rgba(0,0,0,.4); }
      .sec-col-encours .sec-col-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
      .sec-col-arts { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
      .sec-col-art-item { display: flex; align-items: center; gap: .75rem; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; padding: .75rem; flex: 1; min-width: 200px; transition: .2s; text-decoration: none; color: inherit; }
      .sec-col-art-item:hover { border-color: var(--or-line); background: var(--card2); }
      .sec-col-art-img { width: 56px; height: 56px; border-radius: 3px; background: var(--bg2) center/cover no-repeat; flex-shrink: 0; }
      .sec-col-art-name { font-size: .84rem; font-weight: 500; color: var(--ink); margin-bottom: .25rem; }
      .sec-col-art-prix { font-family: var(--ff-m); font-size: .82rem; color: var(--or); margin-bottom: .25rem; }
      .sec-col-art-stock { font-size: .72rem; font-weight: 600; }
      .sec-col-art-stock.low { color: var(--red); }
      .sec-col-art-stock.ok { color: var(--green); }
      .sec-col-urgency { font-family: var(--ff-m); font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; color: var(--or); opacity: 0.6; margin-top: 1rem; }
      .sec-col-avenir { background: var(--bg2); border: 1px solid var(--border); display: grid; grid-template-columns: 1fr 1.4fr; gap: 2rem; align-items: center; }
      @media(max-width:640px){ .sec-col-avenir { grid-template-columns: 1fr; } }
      .sec-col-teaser-images { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
      .sec-col-teaser-piece { aspect-ratio: 3/4; background: var(--bg2); border-radius: 4px; overflow: hidden; position: relative; background-size: cover; background-position: center; filter: blur(4px) brightness(0.4); transition: filter .4s; }
      .sec-col-avenir:hover .sec-col-teaser-piece { filter: blur(2px) brightness(0.55); }
      .sec-col-cd { display: flex; align-items: center; gap: .5rem; margin: 1rem 0 1.25rem; }
      .sec-col-cd-unit { display: flex; flex-direction: column; align-items: center; }
      .sec-col-cd-val { font-family: var(--ff-d); font-size: 2rem; font-weight: 400; color: var(--or); line-height: 1; min-width: 2ch; text-align: center; }
      .sec-col-cd-unit small { font-family: var(--ff-m); font-size: .55rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-top: .25rem; }
      .sec-col-cd-sep { font-family: var(--ff-d); font-size: 1.5rem; color: var(--border); line-height: 1; align-self: flex-start; margin-top: .2rem; }
      .sec-col-passee { background: var(--card2); border: 1px solid var(--border); padding: 1.25rem 1.5rem; }
      .sec-col-passee-content { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
      .sec-col-passee-name { font-family: var(--ff-d); font-size: 1.2rem; font-weight: 400; color: var(--muted); }
      .sec-col-passee-stock { font-size: .82rem; color: var(--stone); margin-top: .25rem; }
      .sec-col-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .75rem 1.5rem; border-radius: 3px; font-size: .78rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; transition: .2s; white-space: nowrap; cursor: pointer; border: none; }
      .sec-col-btn--or { background: var(--or); color: #000; box-shadow: 0 4px 14px rgba(212,175,55,.22); }
      .sec-col-btn--or:hover { background: #E0C04A; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(212,175,55,.32); }
      .sec-col-btn--wa { background: #25D366; color: #fff; }
      .sec-col-btn--wa:hover { background: #1fb856; transform: translateY(-1px); }
      .sec-col-btn--ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
      .sec-col-btn--ghost:hover { border-color: var(--or-line); color: var(--or); }
    `;
    document.head.appendChild(s);
  }

  async function mount(containerId = 'se-collections') {
    injectStyles();
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div style="height:280px;background:var(--bg2);border-radius:6px;animation:skel 1.4s ease-in-out infinite"></div>`;

    try {
      const collections = await loadCollections();
      container.innerHTML = renderSection(collections);
      startCountdowns(collections);
    } catch (e) {
      console.warn("[SE Collections] Erreur:", e); 
      container.innerHTML = renderFallback();
    }
  }

  window.SE_Collections = { mount, loadCollections, renderSection };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mount());
  } else {
    mount();
  }

})();