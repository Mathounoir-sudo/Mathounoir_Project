import type { Ingredient } from '../domain/types'

/**
 * Catalogue des ingrédients connus. Les recettes y font référence par `id`,
 * et les produits du garde-manger y sont rattachés automatiquement.
 * Pour ajouter un ingrédient : choisir un id stable (il ne doit plus changer ensuite).
 */
export const INGREDIENTS: Ingredient[] = [
  // Bases que l'on suppose toujours présentes dans une cuisine
  { id: 'sel', name: 'Sel', category: 'base' },
  { id: 'poivre', name: 'Poivre', category: 'base' },
  { id: 'huile', name: 'Huile', category: 'base', aliases: ["huile d'olive", 'huile de tournesol', 'huile de colza'] },
  { id: 'eau', name: 'Eau', category: 'base' },

  // Légumes
  { id: 'tomate', name: 'Tomate', category: 'légume' },
  { id: 'courgette', name: 'Courgette', category: 'légume' },
  { id: 'aubergine', name: 'Aubergine', category: 'légume' },
  { id: 'poivron', name: 'Poivron', category: 'légume' },
  { id: 'carotte', name: 'Carotte', category: 'légume' },
  { id: 'pomme-de-terre', name: 'Pomme de terre', category: 'légume', aliases: ['patate', 'pdt'] },
  { id: 'oignon', name: 'Oignon', category: 'légume', aliases: ['oignon rouge', 'oignon jaune'] },
  { id: 'ail', name: 'Ail', category: 'légume', aliases: ["gousse d'ail"] },
  { id: 'echalote', name: 'Échalote', category: 'légume' },
  { id: 'poireau', name: 'Poireau', category: 'légume' },
  { id: 'champignon', name: 'Champignon', category: 'légume', aliases: ['champignon de paris'] },
  { id: 'epinard', name: 'Épinard', category: 'légume', aliases: ['pousse d epinard'] },
  { id: 'salade', name: 'Salade', category: 'légume', aliases: ['laitue', 'mesclun', 'roquette'] },
  { id: 'brocoli', name: 'Brocoli', category: 'légume' },
  { id: 'chou-fleur', name: 'Chou-fleur', category: 'légume' },
  { id: 'chou', name: 'Chou', category: 'légume', aliases: ['chou blanc', 'chou vert', 'chou rouge'] },
  { id: 'concombre', name: 'Concombre', category: 'légume' },
  { id: 'potiron', name: 'Potiron', category: 'légume', aliases: ['courge', 'butternut', 'potimarron', 'citrouille'] },
  { id: 'celeri', name: 'Céleri', category: 'légume' },
  { id: 'petits-pois', name: 'Petits pois', category: 'légume' },
  { id: 'herbes', name: 'Herbes fraîches', category: 'légume', aliases: ['persil', 'ciboulette', 'basilic', 'coriandre', 'menthe', 'aneth'] },

  // Fruits
  { id: 'pomme', name: 'Pomme', category: 'fruit' },
  { id: 'poire', name: 'Poire', category: 'fruit' },
  { id: 'banane', name: 'Banane', category: 'fruit' },
  { id: 'citron', name: 'Citron', category: 'fruit' },
  { id: 'orange', name: 'Orange', category: 'fruit' },
  { id: 'fruits-rouges', name: 'Fruits rouges', category: 'fruit', aliases: ['fraise', 'framboise', 'myrtille', 'mure'] },
  { id: 'avocat', name: 'Avocat', category: 'fruit' },

  // Produits laitiers et œufs
  { id: 'oeuf', name: 'Œuf', category: 'œuf' },
  { id: 'lait', name: 'Lait', category: 'produit laitier' },
  { id: 'beurre', name: 'Beurre', category: 'produit laitier' },
  { id: 'creme', name: 'Crème', category: 'produit laitier', aliases: ['creme fraiche', 'creme liquide', 'creme epaisse'] },
  { id: 'yaourt', name: 'Yaourt', category: 'produit laitier', aliases: ['yogourt', 'fromage blanc'] },
  { id: 'fromage-rape', name: 'Fromage râpé', category: 'produit laitier', aliases: ['emmental', 'gruyere', 'comte', 'parmesan'] },
  { id: 'fromage', name: 'Fromage', category: 'produit laitier', aliases: ['chevre', 'feta', 'mozzarella', 'camembert', 'reste de fromage'] },

  // Féculents
  { id: 'pain', name: 'Pain', category: 'féculent', aliases: ['pain rassis', 'baguette', 'pain de mie'] },
  { id: 'pates', name: 'Pâtes', category: 'féculent', aliases: ['spaghetti', 'penne', 'coquillette', 'farfalle', 'tagliatelle'] },
  { id: 'riz', name: 'Riz', category: 'féculent', aliases: ['riz cuit', 'reste de riz'] },
  { id: 'semoule', name: 'Semoule', category: 'féculent', aliases: ['couscous', 'boulgour', 'quinoa'] },
  { id: 'farine', name: 'Farine', category: 'épicerie' },
  { id: 'pate-a-tarte', name: 'Pâte à tarte', category: 'féculent', aliases: ['pate brisee', 'pate feuilletee'] },
  { id: 'tortilla', name: 'Tortilla', category: 'féculent', aliases: ['wrap', 'galette de ble'] },

  // Viandes et poissons
  { id: 'jambon', name: 'Jambon', category: 'viande-poisson' },
  { id: 'lardons', name: 'Lardons', category: 'viande-poisson', aliases: ['bacon'] },
  { id: 'poulet', name: 'Poulet', category: 'viande-poisson', aliases: ['reste de poulet', 'blanc de poulet'] },
  { id: 'viande-hachee', name: 'Viande hachée', category: 'viande-poisson', aliases: ['steak hache', 'boeuf hache'] },
  { id: 'thon', name: 'Thon', category: 'viande-poisson', aliases: ['thon en boite'] },
  { id: 'saumon', name: 'Saumon', category: 'viande-poisson' },
  { id: 'chorizo', name: 'Chorizo', category: 'viande-poisson', aliases: ['saucisse'] },

  // Légumineuses
  { id: 'lentilles', name: 'Lentilles', category: 'légumineuse', aliases: ['lentille corail'] },
  { id: 'pois-chiches', name: 'Pois chiches', category: 'légumineuse' },
  { id: 'haricots-rouges', name: 'Haricots rouges', category: 'légumineuse', aliases: ['haricot blanc'] },

  // Épicerie
  { id: 'sucre', name: 'Sucre', category: 'épicerie', aliases: ['sucre roux', 'cassonade'] },
  { id: 'levure', name: 'Levure chimique', category: 'épicerie', aliases: ['poudre a lever'] },
  { id: 'flocons-avoine', name: "Flocons d'avoine", category: 'épicerie', aliases: ['avoine'] },
  { id: 'coulis-tomate', name: 'Coulis de tomate', category: 'épicerie', aliases: ['sauce tomate', 'tomate concassee', 'passata'] },
  { id: 'bouillon', name: 'Bouillon', category: 'épicerie', aliases: ['cube de bouillon', 'bouillon cube'] },
  { id: 'sauce-soja', name: 'Sauce soja', category: 'épicerie' },
  { id: 'epices', name: 'Épices', category: 'épicerie', aliases: ['curry', 'cumin', 'paprika', 'cannelle', 'herbes de provence'] },
  { id: 'moutarde', name: 'Moutarde', category: 'épicerie' },
  { id: 'vinaigre', name: 'Vinaigre', category: 'épicerie' },
  { id: 'chocolat', name: 'Chocolat', category: 'épicerie', aliases: ['pepite de chocolat', 'cacao'] },
  { id: 'lait-coco', name: 'Lait de coco', category: 'épicerie' },
]

export const INGREDIENTS_BY_ID: ReadonlyMap<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.id, i]))
