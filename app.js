/* ═══════════════════════════════════════════════════════════════
   SENEXPORT — APP JS v8
   Adapté au vrai schéma Supabase d'Ahmed :
   - commandes(numero, client_nom, client_tel, articles_json, total_ttc...)
   - clients(id, nom_complet, telephone, email, points, tier...)
   - demandes_speciales(client_nom, client_tel, description, budget...)
   - articles(reference, nom, prix_vente_fcfa, photo_url...)
   ═══════════════════════════════════════════════════════════════ */

window.SE = window.SE || {};

/* ──────────────────────────────────────────────────────────────
   CONFIG SUPABASE
   ──────────────────────────────────────────────────────────────
   Ces clés viennent de ton .env existant.
*/
SE.SUPABASE_URL  = 'https://axgpohmhzmdgozndlntj.supabase.co';
SE.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Z3BvaG1oem1kZ296bmRsbnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTIzOTMsImV4cCI6MjA5MTQ4ODM5M30.gukLxSpuLUPWOivsC-LgbNYIsnTWOuo0_G2ubYur3os';
SE.WA_NUMBER     = '221778038874';

/* ──────────────────────────────────────────────────────────────
   CLIENT SUPABASE
*/
SE.sb = null;
SE.initSupabase = () => {
  if (typeof supabase === 'undefined') { console.warn('Supabase-js pas chargé'); return null; }
  SE.sb = supabase.createClient(SE.SUPABASE_URL, SE.SUPABASE_ANON);
  return SE.sb;
};

/* ──────────────────────────────────────────────────────────────
   FORMATTERS
*/
SE.fprix  = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g,' ') + ' FCFA';
SE.fnum   = n => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g,' ');
SE.freduc = (neuf, prix) => neuf > 0 ? Math.round((1 - prix/neuf) * 100) : 0;
SE.fdate  = iso => {
  try { return new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}); }
  catch { return iso; }
};

/* Normalise l'état (ta DB utilise "Bon etat", "Reconditionne" sans accents) */
SE.normEtat = etat => {
  if (!etat) return 'Bon etat';
  const e = etat.toLowerCase().replace(/é/g,'e');
  if (e.includes('neuf')) return 'Neuf';
  if (e.includes('reconditionne')) return 'Reconditionne';
  if (e.includes('bon')) return 'Bon etat';
  return etat;
};
SE.etatLabel = etat => ({
  'Neuf':'Neuf','Reconditionne':'Reconditionné','Bon etat':'Bon état','Usage':'Usagé'
}[etat] || etat);
SE.etatClass = etat => ({
  'Neuf':'state-neuf','Reconditionne':'state-recon','Bon etat':'state-bon','Usage':'state-usage'
}[etat] || 'state-bon');

/* Image URL : si commence par http → utilise tel quel. Sinon → bucket photos. */
SE.imgUrl = (url, w=800) => {
  if (!url) return 'https://placehold.co/800x800/f5efe4/c4531a?text=SenExport';
  if (url.startsWith('http')) return url;
  if (url.startsWith('photos/') || url.includes('/')) {
    return `${SE.SUPABASE_URL}/storage/v1/object/public/${url.startsWith('photos/') ? url : 'photos/' + url}`;
  }
  // Sinon c'est juste un nom de fichier : le chercher dans bucket photos
  return `${SE.SUPABASE_URL}/storage/v1/object/public/photos/${url}`;
};

/* ──────────────────────────────────────────────────────────────
   ARTICLES — chargés depuis Supabase
*/
SE.Articles = {
  cache: null,
  _loading: null,
  
  async load(force=false){
    if (this.cache && !force) return this.cache;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      if (!SE.sb){ this.cache = []; return []; }
      try {
        const { data, error } = await SE.sb
          .from('articles')
          .select('*, categorie:categorie_id(id, nom, emoji, couleur)')
          .neq('etat', 'Vendu')
          .neq('etat', 'Reserve')
          .or('masque.is.null,masque.eq.false')
          .order('quantite', { ascending: false })   // articles en stock d'abord
          .order('updated_at', { ascending: false })
          .limit(200);
        if (error){ console.error('Articles load:', error); this.cache = []; return []; }
        this.cache = data || [];
        return this.cache;
      } catch(e){
        console.error('Articles load error:', e);
        this.cache = [];
        return [];
      } finally {
        this._loading = null;
      }
    })();
    return this._loading;
  },
  
  async get(ref){
    const list = await this.load();
    return list.find(a => a.reference === ref);
  },
  
  async byCategorie(catId){
    const list = await this.load();
    return list.filter(a => a.categorie_id === catId);
  },
  
  /* Recherche par nom/référence/description */
  async search(query){
    const list = await this.load();
    const q = query.toLowerCase();
    return list.filter(a => 
      (a.nom||'').toLowerCase().includes(q) ||
      (a.reference||'').toLowerCase().includes(q) ||
      (a.description||'').toLowerCase().includes(q)
    );
  }
};

/* ──────────────────────────────────────────────────────────────
   CATEGORIES — chargées depuis Supabase
*/
SE.Categories = {
  cache: null,
  
  async load(){
    if (this.cache) return this.cache;
    if (!SE.sb){ this.cache = []; return []; }
    try {
      const { data, error } = await SE.sb.from('categories').select('*').order('nom');
      if (error){ console.error(error); this.cache = []; return []; }
      this.cache = data || [];
      return this.cache;
    } catch(e){ console.error(e); this.cache = []; return []; }
  },
  
  async get(id){
    const list = await this.load();
    return list.find(c => c.id === id);
  },
  
  async bySlug(slug){
    /* Support URL "?cat=electronique" → matche par nom en slugifiant */
    const list = await this.load();
    return list.find(c => c.nom.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') === slug);
  }
};

/* ──────────────────────────────────────────────────────────────
   PRODUCT CARD (adapté au schéma articles)
*/
SE.productCard = a => {
  const prix   = a.prix_vente_fcfa || 0;
  const prixRef= a.prix_min_fcfa && a.prix_min_fcfa > prix ? a.prix_min_fcfa : null;
  const reduc  = prixRef ? SE.freduc(prixRef, prix) : 0;
  const stock  = (a.quantite !== undefined && a.quantite !== null) ? a.quantite : 0;
  const isOut  = stock === 0;
  const low    = !isOut && stock <= 3;
  const etat   = SE.normEtat(a.etat);
  const isWish = SE.Wishlist.has(a.reference);
  const inCart = SE.Cart.has(a.reference);
  const photo  = SE.imgUrl(a.photo_url, 600);
  const cartBtn = isOut
    ? `<button class="p-action p-action--out" onclick="location.href='produit.html?ref=${a.reference}'">Voir l\'article</button>`
    : `<button class="p-action ${inCart?'added':''}" data-cart-add="${a.reference}">${inCart ? '✓ Dans le panier' : '🛒 Ajouter'}</button>`;

  return `
    <article class="p-card${isOut?' p-card--out':''}">
      <a href="produit.html?ref=${a.reference}" class="p-image-wrap" aria-label="${a.nom}">
        <img src="${photo}" alt="${a.nom}" loading="lazy"
             onerror="this.onerror=null;this.src='https://placehold.co/600x600/1a1a1e/D4AF37?text=SenExport'">
        ${isOut?'<div class=\"p-out-overlay\"><span class=\"p-out-label\">Rupture de stock</span></div>':''}
        <div class="p-badges">
          ${reduc>0?`<span class=\"p-badge discount\">-${reduc}%</span>`:''}
          ${!isOut?`<span class=\"p-badge ${SE.etatClass(etat)}\">${SE.etatLabel(etat)}</span>`:''}
          ${low?'<span class=\"p-badge low\">Derniers</span>':''}
        </div>
      </a>
      <button class="p-wish ${isWish?'active':''}" data-ref="${a.reference}" title="Favoris">${isWish?'♥':'♡'}</button>
      <div class="p-body">
        <a href="produit.html?ref=${a.reference}" class="p-name-link">
          <h3 class="p-name">${a.nom}</h3>
        </a>
        <div class="p-prices">
          ${prixRef?`<span class=\"struck\">${SE.fprix(prixRef)}</span>`:''}
          <span class="main${isOut?' p-price--out':''}">${SE.fprix(prix)}</span>
        </div>
        ${cartBtn}
      </div>
    </article>
  `;
};
/* ──────────────────────────────────────────────────────────────
   WISHLIST (localStorage, clés = references d'articles)
*/
SE.Wishlist = {
  KEY:'se_wishlist',
  all(){ try{return JSON.parse(localStorage.getItem(this.KEY)||'[]')}catch{return []} },
  has(ref){ return this.all().includes(ref); },
  toggle(ref){
    const list = this.all();
    const i = list.indexOf(ref);
    if (i >= 0) list.splice(i,1); else list.push(ref);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    return this.has(ref);
  },
  count(){ return this.all().length; }
};

/* ──────────────────────────────────────────────────────────────
   CART (localStorage)
   Structure : [{ ref, qte }]
*/
SE.Cart = {
  KEY:'se_cart',
  all(){ try{return JSON.parse(localStorage.getItem(this.KEY)||'[]')}catch{return []} },
  has(ref){ return this.all().some(i => i.ref === ref); },
  add(ref, qte=1){
    const list = this.all();
    const existing = list.find(i => i.ref === ref);
    if (existing) existing.qte += qte; else list.push({ ref, qte });
    localStorage.setItem(this.KEY, JSON.stringify(list));
    this._notify();
  },
  remove(ref){
    const list = this.all().filter(i => i.ref !== ref);
    localStorage.setItem(this.KEY, JSON.stringify(list));
    this._notify();
  },
  setQte(ref, qte){
    qte = Math.max(1, Math.min(99, qte|0));
    const list = this.all();
    const item = list.find(i => i.ref === ref);
    if (item){ item.qte = qte; localStorage.setItem(this.KEY, JSON.stringify(list)); this._notify(); }
  },
  clear(){ localStorage.removeItem(this.KEY); this._notify(); },
  count(){ return this.all().reduce((s,i)=>s+i.qte, 0); },
  
  /* Retourne les items enrichis avec les données articles (nécessite Articles.load()) */
  async items(){
    const articles = await SE.Articles.load();
    return this.all().map(i => {
      const a = articles.find(x => x.reference === i.ref);
      return a ? { ...i, article: a } : null;
    }).filter(Boolean);
  },
  
  async total(){
    const items = await this.items();
    return items.reduce((s,i) => s + (i.article.prix_vente_fcfa * i.qte), 0);
  },
  
  _notify(){
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      const n = this.count();
      el.textContent = n;
      el.style.display = n > 0 ? '' : 'none';
    });
  }
};

/* ──────────────────────────────────────────────────────────────
   AUTH — Supabase Auth (email, téléphone, Google)
*/
SE.Auth = {
  currentUser: null,
  currentClient: null,
  _inited: false,
  
  /* Initialise l'état : charge la session en cours */
  async init(){
    if (!SE.sb) return null;
    
    // Évite la double init
    if (this._inited){
      // Si déjà inited mais pas de currentUser, refait juste un getSession
      if (!this.currentUser){
        try {
          const { data: { session } } = await SE.sb.auth.getSession();
          if (session?.user){
            this.currentUser = session.user;
            await this._loadClient();
          }
        } catch(e){ console.warn('re-init session:', e); }
      }
      return this.currentUser;
    }
    this._inited = true;
    
    try {
      const { data: { session } } = await SE.sb.auth.getSession();
      if (session?.user){
        this.currentUser = session.user;
        await this._loadClient();
      }
    } catch(e){ console.warn('init session:', e); }
    
    /* Écoute changements de session */
    SE.sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user){
        this.currentUser = session.user;
        await this._loadClient();
      } else {
        this.currentUser = null;
        this.currentClient = null;
      }
      document.dispatchEvent(new CustomEvent('se:auth-changed'));
    });
    return this.currentUser;
  },
  
  /* Charge l'enregistrement client lié au user */
  async _loadClient(){
    if (!this.currentUser) return null;
    const { data, error } = await SE.sb
      .from('clients')
      .select('*')
      .eq('id', this.currentUser.id)
      .maybeSingle();
    if (error && error.code !== 'PGRST116'){
      console.error('_loadClient:', error);
    }
    this.currentClient = data;
    return data;
  },
  
  isLogged(){ return this.currentUser !== null; },
  
  /* Inscription email + mot de passe */
  async signUpEmail({ email, password, nom_complet, telephone }){
    if (!SE.sb) throw new Error('Supabase non configuré');
    const { data, error } = await SE.sb.auth.signUp({
      email, password,
      options: {
        data: { nom_complet, telephone }
      }
    });
    if (error) throw error;
    /* Créer le client lié */
    if (data.user){
      await this._createClientRecord(data.user.id, { nom_complet, telephone, email });
    }
    return data;
  },
  
  /* Connexion email + mdp */
  async signInEmail({ email, password }){
    if (!SE.sb) throw new Error('Supabase non configuré');
    const { data, error } = await SE.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.currentUser = data.user;
    await this._loadClient();
    return data;
  },
  
  /* Inscription téléphone + mdp (sans OTP SMS, juste pour MVP) */
  async signUpPhone({ phone, password, nom_complet, email }){
    if (!SE.sb) throw new Error('Supabase non configuré');
    /* Normalise le téléphone au format E.164 (+221...) */
    const normPhone = phone.replace(/\s/g,'').replace(/^00/,'+');
    const { data, error } = await SE.sb.auth.signUp({
      phone: normPhone, password,
      options: { data: { nom_complet, email } }
    });
    if (error) throw error;
    if (data.user){
      await this._createClientRecord(data.user.id, { nom_complet, telephone:normPhone, email });
    }
    return data;
  },
  
  /* Connexion téléphone + mdp */
  async signInPhone({ phone, password }){
    if (!SE.sb) throw new Error('Supabase non configuré');
    const normPhone = phone.replace(/\s/g,'').replace(/^00/,'+');
    const { data, error } = await SE.sb.auth.signInWithPassword({ phone:normPhone, password });
    if (error) throw error;
    this.currentUser = data.user;
    await this._loadClient();
    return data;
  },
  
  /* Connexion Google */
  async signInWithGoogle(){
    if (!SE.sb) throw new Error('Supabase non configuré');
    const { data, error } = await SE.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/compte.html' }
    });
    if (error) throw error;
    return data;
  },
  
  /* Crée l'enregistrement client après inscription (trigger auto-génère numero_carte) */
  async _createClientRecord(user_id, { nom_complet, prenom='', telephone='', email='', adresse='', ville='Thies' }){
    try {
      const { error } = await SE.sb.from('clients').insert([{
        id: user_id,
        nom_complet: nom_complet || 'Client',
        prenom, telephone, email, adresse, ville,
      }]);
      if (error) console.error('_createClientRecord:', error);
    } catch(e){ console.error(e); }
  },
  
  async signOut(){
    if (SE.sb) await SE.sb.auth.signOut();
    this.currentUser = null;
    this.currentClient = null;
  }
};

/* ──────────────────────────────────────────────────────────────
   COMMANDES — écrit dans ta table `commandes` existante
   Colonnes : numero, client_id, client_nom, client_tel, client_email,
              articles_json, sous_total, remise_fidelite, frais_livraison,
              total_ttc, mode_livraison, adresse_livraison, statut, notes
*/
SE.Commandes = {
  KEY_LOCAL:'se_commandes',
  
  /* Génère un numéro de commande CMD-YYYYMMDD-NNNN */
  _genNum(){
    const d = new Date();
    const datePart = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const rand = String(Math.floor(Math.random()*9999)).padStart(4,'0');
    return `CMD-${datePart}-${rand}`;
  },
  
  /* Crée une commande dans Supabase.
     params = {
       client: {nom, tel, email, adresse},
       mode: 'retrait'|'livraison',
       items: [{ref, nom, prix, qte}],
       sous_total, frais_livraison, total_ttc,
       notes
     }
  */
  async create(params){
    const numero = this._genNum();
    
    const record = {
      numero,
      client_id: SE.Auth.currentUser?.id || null,
      client_nom: params.client.nom,
      client_tel: params.client.tel,
      client_email: params.client.email || '',
      articles_json: params.items,   // JSONB
      sous_total: params.sous_total || 0,
      remise_fidelite: params.remise_fidelite || 0,
      frais_livraison: params.frais_livraison || 0,
      total_ttc: params.total_ttc || 0,
      mode_livraison: params.mode || 'retrait',
      adresse_livraison: params.client.adresse || '',
      statut: 'nouvelle',
      notes: params.notes || '',
    };
    
    /* Écriture Supabase */
    let saved = false;
    if (SE.sb){
      try {
        const { data, error } = await SE.sb.from('commandes').insert([record]).select();
        if (error) throw error;
        saved = true;
        console.log('[SenExport] Commande créée:', numero);
        
        /* IMPORTANT : décrémenter le stock via fonction RPC sécurisée.
           Évite que 2 clients commandent la même pièce unique. */
        for (const it of params.items){
          if (it.reference){
            try {
              const { data, error } = await SE.sb.rpc('decrement_stock', {
                p_reference: it.reference,
                p_qte: it.qte || 1,
              });
              if (error){
                console.warn('[SenExport] Erreur RPC décrément stock:', error);
              } else {
                console.log('[SenExport] Stock décrémenté:', it.reference, data);
              }
            } catch(stockErr){
              console.warn('[SenExport] Erreur décrément stock:', stockErr);
            }
          }
        }
        
        // Invalide le cache articles pour que les autres clients voient le nouvel état
        SE.Articles.cache = null;
        
      } catch(e){
        console.error('[SenExport] Erreur création commande:', e);
        throw e;  // Propage l'erreur pour que le UI affiche un message
      }
    } else {
      throw new Error('Supabase non configuré');
    }
    
    /* Garde aussi en local pour affichage immédiat dans "Mes commandes" */
    if (saved){
      const localRec = { ...record, created_at: new Date().toISOString() };
      const list = this.allLocal();
      list.unshift(localRec);
      localStorage.setItem(this.KEY_LOCAL, JSON.stringify(list.slice(0,20)));
    }
    
    return record;
  },
  
  allLocal(){
    try{ return JSON.parse(localStorage.getItem(this.KEY_LOCAL)||'[]'); }
    catch{ return []; }
  },
  
  /* Récupère les commandes du client connecté depuis Supabase */
  async mine(){
    if (!SE.sb || !SE.Auth.currentUser) return this.allLocal();
    try {
      const { data, error } = await SE.sb
        .from('commandes')
        .select('*')
        .eq('client_id', SE.Auth.currentUser.id)
        .order('created_at', { ascending:false });
      if (error){ console.error(error); return this.allLocal(); }
      return data || [];
    } catch(e){ return this.allLocal(); }
  }
};

/* ──────────────────────────────────────────────────────────────
   DEMANDES SPÉCIALES — écrit dans `demandes_speciales`
*/
SE.Demandes = {
  async create(demande){
    if (!SE.sb) throw new Error('Supabase non configuré');
    const record = {
      client_id: SE.Auth.currentUser?.id || null,
      client_nom: demande.nom,
      client_tel: demande.tel,
      description: demande.description + 
        (demande.categorie ? `\n\nCatégorie : ${demande.categorie}` : '') +
        (demande.url ? `\n\nLien : ${demande.url}` : '') +
        (demande.delai ? `\n\nDélai : ${demande.delai}` : ''),
      budget: demande.budget || null,
      statut: 'nouvelle',
    };
    const { data, error } = await SE.sb.from('demandes_speciales').insert([record]).select();
    if (error) throw error;
    /* Numéro affiché à l'utilisateur (pas stocké en base, elle a que un id auto) */
    const num = `DEM-${new Date().getFullYear()}-${String(data[0]?.id||0).padStart(5,'0')}`;
    return { num, ...record };
  }
};

/* ──────────────────────────────────────────────────────────────
   HEADER + MOBILE MENU
*/
SE.initHeader = () => {
  /* ── Positionner la nav sous la barre d'annonce ── */
  const nav  = document.getElementById('nav');
  const ann  = document.querySelector('.announce-top');
  if (nav && ann) {
    const setNavTop = () => {
      const h = ann.getBoundingClientRect().height;
      // Si on a scrollé au-delà de la barre, elle disparaît → nav remonte à top:0
      const scrolled = window.scrollY >= h;
      nav.style.top = scrolled ? '0px' : `${h}px`;
    };
    setNavTop();
    window.addEventListener('scroll', setNavTop, { passive:true });
    window.addEventListener('resize', setNavTop, { passive:true });
  }

  const header = document.getElementById('header');
  if (header){
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive:true });
  }

  const burger = document.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  const backdrop = document.getElementById('mobile-backdrop');
  if (burger && menu && backdrop){
    const open = () => { menu.classList.add('open'); backdrop.classList.add('open'); };
    const close = () => { menu.classList.remove('open'); backdrop.classList.remove('open'); };
    burger.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    const closeBtn = menu.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', close);
  }

  document.querySelectorAll('[data-wish-count]').forEach(el => {
    const n = SE.Wishlist.count();
    el.textContent = n;
    if (n === 0) el.style.display = 'none';
  });
  SE.Cart._notify();
};

/* ──────────────────────────────────────────────────────────────
   CLICK DELEGATIONS : wishlist + add to cart
*/
SE.initWishlist = () => {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.p-wish');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const ref = btn.dataset.ref;
    const active = SE.Wishlist.toggle(ref);
    btn.classList.toggle('active', active);
    btn.textContent = active ? '♥' : '♡';
    document.querySelectorAll('[data-wish-count]').forEach(el => {
      const n = SE.Wishlist.count();
      el.textContent = n;
      el.style.display = n > 0 ? '' : 'none';
    });
  });
};

SE.initCart = () => {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-cart-add]');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    const ref = btn.dataset.cartAdd;
    SE.Cart.add(ref);
    btn.textContent = '✓ Dans le panier';
    btn.classList.add('added');
    SE.toast('Ajouté au panier');
  });
};

/* ──────────────────────────────────────────────────────────────
   REVEAL ON SCROLL
*/
SE.initReveal = () => {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold:0.1 });
  document.querySelectorAll('.p-card, .cat-tile, .testi, .how-step, .reveal-me').forEach(el => {
    el.classList.add('reveal'); io.observe(el);
  });
};

/* ──────────────────────────────────────────────────────────────
   GREETING
*/
SE.greeting = () => {
  const h = new Date().getHours();
  if (h < 6)  return 'Bonne nuit — SenExport veille';
  if (h < 12) return 'Bonjour — bienvenue à Thiès';
  if (h < 17) return 'Bon après-midi';
  if (h < 21) return 'Bonsoir';
  return 'Bonne soirée';
};

/* ──────────────────────────────────────────────────────────────
   TOAST
*/
SE.toast = (msg, ok=true, ms=2800) => {
  let box = document.getElementById('se-toast-box');
  if (!box){
    box = document.createElement('div');
    box.id = 'se-toast-box';
    box.style.cssText='position:fixed;top:20px;right:20px;z-index:999;display:flex;flex-direction:column;gap:8px';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.style.cssText = `
    background:${ok?'#2D6A4F':'#B93A1E'};color:#fff;
    padding:12px 18px;border-radius:8px;font-size:.88rem;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.2);
    opacity:0;transform:translateX(20px);transition:.22s;max-width:320px;`;
  t.textContent = (ok?'✓  ':'✗  ') + msg;
  box.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(0)'; });
  setTimeout(() => {
    t.style.opacity='0'; t.style.transform='translateX(20px)';
    setTimeout(() => t.remove(), 220);
  }, ms);
};

/* ──────────────────────────────────────────────────────────────
   NOTIFICATIONS STATUT COMMANDE
   Quand le client revient, on compare ses commandes avec ce qu'on
   a stocké la dernière fois. Si statut changé → grosse notif animée.
*/
SE.OrderNotif = {
  STORAGE_KEY: 'se_last_order_statuses',
  
  STATUT_MESSAGES: {
    'confirmee':      { emj:'📞', title:'Commande confirmée', msg:'Nous avons bien confirmé votre commande !' },
    'en_preparation': { emj:'📦', title:'Commande confirmée', msg:'Votre commande est en cours de traitement.' },
    'prete_retrait':  { emj:'🎉', title:'Prête au retrait !', msg:'Vous pouvez venir récupérer votre commande au dépôt.' },
    'en_livraison':   { emj:'🚚', title:'En route vers vous', msg:'Notre équipe va vous contacter sous peu.' },
    'livree':         { emj:'✅', title:'Commande livrée', msg:'Merci pour votre confiance !' },
    'annulee':        { emj:'❌', title:'Commande annulée', msg:'Contactez-nous si vous avez des questions.' },
  },
  
  // À appeler après que les commandes du client soient chargées
  async checkUpdates(commandes){
    if (!commandes || commandes.length === 0) return;
    
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}'); } catch {}
    
    const newStored = {};
    const updates = [];
    
    for (const cmd of commandes){
      const id = String(cmd.id);
      newStored[id] = cmd.statut;
      
      if (stored[id] && stored[id] !== cmd.statut){
        // Statut a changé — notification
        updates.push({
          numero: cmd.numero,
          oldStatut: stored[id],
          newStatut: cmd.statut,
        });
      }
    }
    
    // Sauvegarde
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newStored));
    
    // Affiche les notifs (max 2 pour pas spammer)
    for (const u of updates.slice(0, 2)){
      this.showBigNotif(u);
    }
  },
  
  showBigNotif({numero, newStatut}){
    const info = this.STATUT_MESSAGES[newStatut];
    if (!info) return;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(15,8,30,.65);backdrop-filter:blur(6px);
      -webkit-backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      padding:20px;animation:seFadeIn .3s ease-out;
    `;
    
    overlay.innerHTML = `
      <div style="
        background:#fff;border-radius:24px;padding:32px 28px;max-width:420px;width:100%;
        text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.3);
        animation:sePopIn .4s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <div style="font-size:4rem;margin-bottom:12px;animation:seBounce 1.5s ease-in-out infinite">${info.emj}</div>
        <h3 style="font-family:var(--f-display, serif);font-size:1.5rem;font-weight:600;
                   margin:0 0 8px;color:#1a1a1a">${info.title}</h3>
        <p style="color:#666;font-size:.95rem;margin:0 0 6px">${info.msg}</p>
        <p style="color:#999;font-size:.78rem;font-family:monospace;margin:0 0 22px">${numero}</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="commande.html?id=${this._getCmdId(numero)}" style="
            background:#D4623A;color:#fff;padding:12px 22px;border-radius:12px;
            font-weight:600;text-decoration:none;display:inline-block;
            transition:.2s;font-size:.95rem;
          ">Voir le détail</a>
          <button onclick="this.closest('[data-notif-overlay]')?.remove() || this.parentElement.parentElement.parentElement.remove()" style="
            background:#f5f0e8;color:#444;padding:12px 22px;border-radius:12px;
            font-weight:600;border:none;cursor:pointer;font-size:.95rem;
          ">OK</button>
        </div>
      </div>
    `;
    overlay.setAttribute('data-notif-overlay', '1');
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
    
    // Animations CSS si pas déjà là
    if (!document.getElementById('se-notif-anims')){
      const style = document.createElement('style');
      style.id = 'se-notif-anims';
      style.textContent = `
        @keyframes seFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sePopIn { 
          from{opacity:0;transform:scale(.7) translateY(20px)} 
          to{opacity:1;transform:scale(1) translateY(0)} 
        }
        @keyframes seBounce {
          0%, 100% { transform:translateY(0) }
          50% { transform:translateY(-8px) }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
  },
  
  _getCmdId(numero){
    // Cherche dans les commandes en cache
    return ''; // sera rempli par la page compte
  }
};

/* ──────────────────────────────────────────────────────────────
   AUTO-INIT
*/
document.addEventListener('DOMContentLoaded', async () => {
  SE.initSupabase();
  await SE.Auth.init();
  SE.initHeader();
  SE.initWishlist();
  SE.initCart();
  SE.initReveal();
  
  // Check les notifications de commandes en arrière-plan (toutes les pages)
  // Retry si l'auth est lente (OAuth Google peut prendre du temps)
  async function checkOrderNotifs(){
    let tries = 0;
    while (!SE.Auth.currentUser && tries < 10){
      await new Promise(r => setTimeout(r, 400));
      tries++;
    }
    if (!SE.Auth.currentUser) return;
    
    try {
      const cmds = await SE.Commandes.mine();
      if (cmds && cmds.length > 0){
        SE.OrderNotif._getCmdId = (numero) => {
          const c = cmds.find(x => x.numero === numero);
          return c ? c.id : '';
        };
        SE.OrderNotif.checkUpdates(cmds);
      }
    } catch(e){ console.warn('Notif check failed:', e); }
  }
  setTimeout(checkOrderNotifs, 1500);
});


/* ═══════════════════════════════════════
   TRACKER ANALYTICS — Mini tracking gratuit
   Stocke session_id en localStorage, envoie events à Supabase
   ═══════════════════════════════════════ */
SE.Track = {
  _sessionId: null,
  _isBot: null,

  /* Détection bot (Googlebot, etc.) */
  _detectBot(){
    if (this._isBot !== null) return this._isBot;
    const ua = (navigator.userAgent || '').toLowerCase();
    const botPatterns = [
      'bot', 'crawler', 'spider', 'crawling',
      'googlebot', 'bingbot', 'slurp', 'duckduckbot',
      'baiduspider', 'yandexbot', 'sogou', 'exabot',
      'facebot', 'lighthouse', 'headlesschrome', 'phantomjs',
      'puppeteer', 'playwright', 'selenium',
    ];
    this._isBot = botPatterns.some(p => ua.includes(p));
    return this._isBot;
  },

  _getSession(){
    if (this._sessionId) return this._sessionId;
    let sid = localStorage.getItem('se_session');
    // Session expirée après 30 min d'inactivité
    const lastActivity = parseInt(localStorage.getItem('se_session_last') || '0');
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min
    if (sid && (Date.now() - lastActivity) < SESSION_TIMEOUT){
      this._sessionId = sid;
      localStorage.setItem('se_session_last', String(Date.now()));
      return sid;
    }
    // Nouvelle session
    sid = 'se_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('se_session', sid);
    localStorage.setItem('se_session_last', String(Date.now()));
    this._sessionId = sid;
    return sid;
  },

  /* Envoyer un event (fire & forget, jamais bloquant) */
  async event(eventType, refData = null){
    if (!SE.sb) return;
    if (this._detectBot()) return; // skip les bots
    try {
      const payload = {
        event_type: eventType,
        page: location.pathname + (location.search || ''),
        ref_data: refData ? String(refData).slice(0, 200) : null,
        session_id: this._getSession(),
        user_agent: (navigator.userAgent || '').slice(0, 200),
        referer: document.referrer ? (() => {
          try { return new URL(document.referrer).hostname; }
          catch(e){ return null; }
        })() : null,
      };
      SE.sb.from('analytics_events').insert(payload).then(() => {}).catch(() => {});
    } catch(e) { /* silencieux */ }
  },

  pageView(){ this.event('page_view'); },
  search(query){ this.event('search', query); },
  viewArticle(ref){ this.event('article_view', ref); },
  addToCart(ref){ this.event('add_to_cart', ref); },
  checkoutStart(total){ this.event('checkout_start', String(total)); },
  orderComplete(num, total){ this.event('order_complete', num + ' (' + total + ')'); },
  click(label){ this.event('click', label); }
};

/* Auto tracker pageview au chargement */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => SE.Track.pageView(), 500);
});

/* ════════════════════════════════════════════════════════
   ONBOARDING — séquence swipeable affichée une seule fois,
   à la toute première connexion d'un client.
   ════════════════════════════════════════════════════════ */
SE.Onboarding = {
  _seenKey: 'se_onboarding_seen',
  _idx: 0,
  _cards: [
    { icon:'🛍️', title:'Commandez',           text:'Parcourez le catalogue et passez commande en quelques clics. Aucun paiement en ligne — vous payez à la récupération.' },
    { icon:'🗺️', title:'Suivez sur la carte',  text:'Suivez votre commande en temps réel : Reçue → Confirmée → Prête → Récupérée, avec la carte et l\'itinéraire jusqu\'au point de retrait.' },
    { icon:'📦', title:'Récupérez',            text:'Une fois prête, choisissez votre point de retrait, présentez votre QR code et récupérez votre commande.' },
    { icon:'💰', title:'Profitez de la cagnotte', text:'1% de chaque achat est ajouté à votre cagnotte en FCFA, utilisable sur le site ou au dépôt. Bonus à chaque palier franchi !' },
  ],

  maybeShow(){
    try {
      if (localStorage.getItem(this._seenKey)) return;
      if (!SE.Auth || !SE.Auth.isLogged()) return;
      if (document.getElementById('se-onboarding-overlay')) return; // déjà affiché
      this._idx = 0;
      this._render();
    } catch(e){ /* localStorage indisponible (mode privé...) — on ignore silencieusement */ }
  },

  _markSeen(){
    try { localStorage.setItem(this._seenKey, '1'); } catch(e){}
    const ov = document.getElementById('se-onboarding-overlay');
    if (ov) ov.remove();
  },

  _render(){
    const ov = document.createElement('div');
    ov.id = 'se-onboarding-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,9,14,.88);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit';
    ov.innerHTML = `
      <div id="se-ob-card" style="position:relative;width:100%;max-width:380px;background:#15161c;border:1px solid rgba(212,175,55,.25);border-radius:18px;padding:32px 26px 24px;text-align:center;color:#F2EDE3;box-shadow:0 30px 80px rgba(0,0,0,.6)">
        <button id="se-ob-close" aria-label="Fermer" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#9A9488;font-size:1.3rem;cursor:pointer;line-height:1">×</button>
        <div id="se-ob-body"></div>
        <div id="se-ob-dots" style="display:flex;justify-content:center;gap:6px;margin:20px 0"></div>
        <div style="display:flex;gap:10px">
          <button id="se-ob-prev" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#C9C3B6;font-weight:600;cursor:pointer">Précédent</button>
          <button id="se-ob-next" style="flex:1;padding:10px;border-radius:10px;border:none;background:#D4AF37;color:#15161c;font-weight:700;cursor:pointer">Suivant</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    document.getElementById('se-ob-close').addEventListener('click', () => this._markSeen());
    ov.addEventListener('click', e => { if (e.target === ov) this._markSeen(); });
    document.getElementById('se-ob-prev').addEventListener('click', () => this._go(-1));
    document.getElementById('se-ob-next').addEventListener('click', () => this._go(1));

    // Swipe tactile
    const cardEl = document.getElementById('se-ob-card');
    let touchX = null;
    cardEl.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive:true });
    cardEl.addEventListener('touchend', e => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) this._go(dx < 0 ? 1 : -1);
      touchX = null;
    }, { passive:true });

    this._paint();
  },

  _go(dir){
    const last = this._cards.length - 1;
    if (this._idx === last && dir === 1){ this._markSeen(); return; }
    this._idx = Math.max(0, Math.min(last, this._idx + dir));
    this._paint();
  },

  _paint(){
    const c = this._cards[this._idx];
    const body = document.getElementById('se-ob-body');
    if (!body) return;
    body.innerHTML = `
      <div style="font-size:2.6rem;margin-bottom:14px">${c.icon}</div>
      <h3 style="font-size:1.15rem;margin:0 0 10px;color:#F2EDE3">${c.title}</h3>
      <p style="font-size:.88rem;line-height:1.6;color:#9A9488;margin:0">${c.text}</p>`;

    const dots = document.getElementById('se-ob-dots');
    dots.innerHTML = this._cards.map((_, i) =>
      `<span style="width:7px;height:7px;border-radius:50%;background:${i===this._idx?'#D4AF37':'rgba(255,255,255,.18)'};transition:background .2s"></span>`
    ).join('');

    document.getElementById('se-ob-prev').style.visibility = this._idx === 0 ? 'hidden' : 'visible';
    document.getElementById('se-ob-next').textContent = this._idx === this._cards.length - 1 ? 'Terminer' : 'Suivant';
  },
};
