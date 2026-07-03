-- ═══════════════════════════════════════════════════════════════
-- SENEXPORT — DONNÉES DÉMO
-- Coller dans Supabase > SQL Editor > Run
-- Les images utilisent des URLs publiques (à remplacer par vos photos)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. COLLECTION DE DÉMO (si elle n'existe pas déjà) ──────────
INSERT INTO collections (id, nom, description, statut, date_lancement)
VALUES (
  'ed608fc2-d7ea-497d-b3d9-30273bd77fc9',
  'Arrivage Juin 2026',
  'Première sélection SenExport. Vêtements et accessoires choisis avec soin depuis la France.',
  'active',
  '2026-06-01'
) ON CONFLICT (id) DO NOTHING;

-- ── 2. ARTICLES DÉMO ──────────────────────────────────────────
-- (Utilisez photo_url avec vos propres images une fois prêt)

INSERT INTO articles
  (reference, nom, description, prix_vente_fcfa, photo_url, etat, genre, quantite, masque)
VALUES

('SE-2026-T001',
 'Blazer Croisé Premium',
 'Blazer oversize double boutonnage en laine mélangée. Coupe structurée, doublure satinée. Importé de France. Taille standard Europe.',
 85000,
 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80',
 'Neuf', 'homme', 2, false),

('SE-2026-T002',
 'Robe Midi Élégance',
 'Robe mi-longue en crêpe fluide. Col V, manches longues, ceinture intégrée. Coloris ivoire cassé. Parfaite pour occasions formelles.',
 62000,
 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80',
 'Neuf', 'femme', 1, false),

('SE-2026-T003',
 'Jean Slim Confort',
 'Jean slim stretch 5 poches, tissu japonais haute densité. Coupe moderne, très confortable. Teinte bleu marine profond.',
 38000,
 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
 'Neuf', 'homme', 4, false),

('SE-2026-T004',
 'Veste Cuir Moto',
 'Veste en cuir synthétique premium, style biker. Fermeture éclair YKK, poches multiples, doublure polaire. Très tendance.',
 95000,
 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
 'Neuf', 'femme', 0, false),

('SE-2026-T005',
 'Chemise Lin Estivale',
 'Chemise manches longues en lin lavé, col classique. Légère et respirante. Disponible en blanc optique. Fabriquée en France.',
 29000,
 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
 'Neuf', 'homme', 5, false),

('SE-2026-T006',
 'Ensemble Sport Coordonné',
 'Set veste + pantalon en jersey technique. Coupe ample, bandes latérales. Idéal running et lifestyle. Coloris gris anthracite.',
 45000,
 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
 'Neuf', 'femme', 3, false),

('SE-2026-T007',
 'Manteau Camel Long',
 'Grand manteau droit col tailleur en laine camel. Coupe épurée, très élégant. Marque française haut de gamme.',
 145000,
 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80',
 'Neuf', 'femme', 1, false),

('SE-2026-T008',
 'T-Shirt Graphique Premium',
 'T-shirt épais 320g coton peigné. Imprimé sérigraphie haute définition. Col rond renforcé. Fabriqué en France.',
 18000,
 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600&q=80',
 'Bon état', 'homme', 6, false),

('SE-2026-T009',
 'Pantalon Cargo Streetwear',
 'Pantalon cargo oversize avec poches latérales. Tissu ripstop résistant. Coloris kaki. Taille ajustable à la cheville.',
 42000,
 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80',
 'Neuf', 'homme', 0, false),

('SE-2026-T010',
 'Cardigan Laine Mérinos',
 'Cardigan col V en laine mérinos fine, boutons en corne naturelle. Coloris caramel chaud. Très doux, ne gratte pas.',
 58000,
 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80',
 'Neuf', 'femme', 2, false),

('SE-2026-T011',
 'Short Bermuda Technique',
 'Short mi-long en nylon déperlant, coupe active. Poche zippée, ceinture élastique. Coloris noir mat.',
 22000,
 'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=600&q=80',
 'Neuf', 'homme', 8, false),

('SE-2026-T012',
 'Robe Pull Oversize',
 'Robe-pull en maille côtelée, longueur midi. Manches raglan, col roulé. Style parisien décontracté. Coloris crème.',
 48000,
 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
 'Neuf', 'femme', 3, false)

ON CONFLICT (reference) DO NOTHING;

-- ── 3. LIER LES ARTICLES À LA COLLECTION ──────────────────────
INSERT INTO collection_articles (collection_id, article_id, ordre)
SELECT 
  'ed608fc2-d7ea-497d-b3d9-30273bd77fc9',
  id,
  ROW_NUMBER() OVER (ORDER BY reference)
FROM articles
WHERE reference LIKE 'SE-2026-T%'
ON CONFLICT DO NOTHING;

-- ── 4. TÉMOIGNAGES DÉMO ───────────────────────────────────────
INSERT INTO temoignages (nom, note, texte, commande)
VALUES
  ('Fatou D.', 5, 'La veste est exactement comme décrite. Livraison rapide, colis bien protégé. Je recommande vivement SenExport !', 'Mode'),
  ('Moussa K.', 5, 'Article reçu en parfait état. Le suivi WhatsApp est super clair, on sait toujours où en est sa commande.', 'Catalogue'),
  ('Aïssatou B.', 4, 'Première commande et je suis très satisfaite. La robe est magnifique. Paiement à la récupération, c''est rassurant.', 'Mode')
ON CONFLICT DO NOTHING;
