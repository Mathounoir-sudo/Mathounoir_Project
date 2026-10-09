import type { CatalogIngredient } from '../domain/types'

/**
 * Catalogue des ingrédients courants : recherche à la saisie, catégorie proposée,
 * et lien entre l'inventaire et les recettes.
 * Pour ajouter un ingrédient : choisir un id stable (il ne doit plus changer ensuite).
 */
export const CATALOG: CatalogIngredient[] = [
  // Basiques : jamais supposés présents, l'utilisateur les confirme (« Mes basiques »)
  { id: 'sel', name: 'Sel', category: 'staple' },
  { id: 'poivre', name: 'Poivre', category: 'staple' },
  { id: 'huile', name: 'Huile', category: 'staple', aliases: ["huile d'olive", 'huile de tournesol', 'huile de colza'] },
  { id: 'eau', name: 'Eau', category: 'staple' },

  // Légumes
  { id: 'tomate', name: 'Tomate', category: 'vegetable' },
  { id: 'courgette', name: 'Courgette', category: 'vegetable' },
  { id: 'aubergine', name: 'Aubergine', category: 'vegetable' },
  { id: 'poivron', name: 'Poivron', category: 'vegetable' },
  { id: 'carotte', name: 'Carotte', category: 'vegetable' },
  { id: 'pomme-de-terre', name: 'Pomme de terre', category: 'vegetable', aliases: ['patate', 'pdt'] },
  { id: 'oignon', name: 'Oignon', category: 'vegetable', aliases: ['oignon rouge', 'oignon jaune'] },
  { id: 'ail', name: 'Ail', category: 'vegetable', aliases: ["gousse d'ail"] },
  { id: 'echalote', name: 'Échalote', category: 'vegetable' },
  { id: 'poireau', name: 'Poireau', category: 'vegetable' },
  { id: 'champignon', name: 'Champignon', category: 'vegetable', aliases: ['champignon de paris'] },
  { id: 'epinard', name: 'Épinard', category: 'vegetable', aliases: ['pousse d epinard'] },
  { id: 'salade', name: 'Salade', category: 'vegetable', aliases: ['laitue', 'mesclun', 'roquette'] },
  { id: 'brocoli', name: 'Brocoli', category: 'vegetable' },
  { id: 'chou-fleur', name: 'Chou-fleur', category: 'vegetable' },
  { id: 'chou', name: 'Chou', category: 'vegetable', aliases: ['chou blanc', 'chou vert', 'chou rouge'] },
  { id: 'concombre', name: 'Concombre', category: 'vegetable' },
  { id: 'potiron', name: 'Potiron', category: 'vegetable', aliases: ['courge', 'butternut', 'potimarron', 'citrouille'] },
  { id: 'celeri', name: 'Céleri', category: 'vegetable' },
  { id: 'petits-pois', name: 'Petits pois', category: 'vegetable' },
  { id: 'herbes', name: 'Herbes fraîches', category: 'vegetable', aliases: ['persil', 'ciboulette', 'basilic', 'coriandre', 'menthe', 'aneth'] },

  // Fruits
  { id: 'pomme', name: 'Pomme', category: 'fruit' },
  { id: 'poire', name: 'Poire', category: 'fruit' },
  { id: 'banane', name: 'Banane', category: 'fruit' },
  { id: 'citron', name: 'Citron', category: 'fruit' },
  { id: 'orange', name: 'Orange', category: 'fruit' },
  { id: 'fruits-rouges', name: 'Fruits rouges', category: 'fruit', aliases: ['fraise', 'framboise', 'myrtille', 'mure'] },
  { id: 'avocat', name: 'Avocat', category: 'fruit' },

  // Produits laitiers et œufs
  { id: 'oeuf', name: 'Œuf', category: 'egg' },
  { id: 'lait', name: 'Lait', category: 'dairy' },
  { id: 'beurre', name: 'Beurre', category: 'dairy' },
  { id: 'creme', name: 'Crème', category: 'dairy', aliases: ['creme fraiche', 'creme liquide', 'creme epaisse'] },
  { id: 'yaourt', name: 'Yaourt', category: 'dairy', aliases: ['yogourt', 'fromage blanc'] },
  { id: 'fromage-rape', name: 'Fromage râpé', category: 'dairy', aliases: ['emmental', 'gruyere', 'comte', 'parmesan'] },
  { id: 'fromage', name: 'Fromage', category: 'dairy', aliases: ['chevre', 'feta', 'mozzarella', 'camembert', 'reste de fromage'] },

  // Féculents
  { id: 'pain', name: 'Pain', category: 'starch', aliases: ['pain rassis', 'baguette', 'pain de mie'] },
  { id: 'pates', name: 'Pâtes', category: 'starch', aliases: ['spaghetti', 'penne', 'coquillette', 'farfalle', 'tagliatelle'] },
  { id: 'riz', name: 'Riz', category: 'starch', aliases: ['riz cru', 'riz basmati', 'riz rond'] },
  { id: 'semoule', name: 'Semoule', category: 'starch', aliases: ['couscous', 'boulgour', 'quinoa'] },
  { id: 'farine', name: 'Farine', category: 'grocery' },
  { id: 'pate-a-tarte', name: 'Pâte à tarte', category: 'starch', aliases: ['pate brisee', 'pate feuilletee'] },
  { id: 'tortilla', name: 'Tortilla', category: 'starch', aliases: ['wrap', 'galette de ble'] },

  // Viandes et poissons
  { id: 'jambon', name: 'Jambon', category: 'meat-fish' },
  { id: 'lardons', name: 'Lardons', category: 'meat-fish', aliases: ['bacon'] },
  { id: 'poulet', name: 'Poulet', category: 'meat-fish', aliases: ['blanc de poulet', 'poulet cru', 'cuisse de poulet'] },
  { id: 'viande-hachee', name: 'Viande hachée', category: 'meat-fish', aliases: ['steak hache', 'boeuf hache'] },
  { id: 'thon', name: 'Thon', category: 'meat-fish', aliases: ['thon en boite'] },
  { id: 'saumon', name: 'Saumon', category: 'meat-fish' },
  { id: 'chorizo', name: 'Chorizo', category: 'meat-fish', aliases: ['saucisse'] },

  // Légumineuses
  { id: 'lentilles', name: 'Lentilles', category: 'legume', aliases: ['lentille corail'] },
  { id: 'pois-chiches', name: 'Pois chiches', category: 'legume' },
  { id: 'haricots-rouges', name: 'Haricots rouges', category: 'legume', aliases: ['haricot blanc'] },

  // Plats et restes cuisinés (phase 3) : jamais confondus avec les produits crus ci-dessus.
  { id: 'riz-cuit', name: 'Riz cuit', category: 'prepared', aliases: ['reste de riz'] },
  { id: 'pates-cuites', name: 'Pâtes cuites', category: 'prepared', aliases: ['reste de pates'] },
  { id: 'legumes-cuits', name: 'Légumes cuits', category: 'prepared', aliases: ['legumes rotis', 'reste de legumes', 'poelee de legumes'] },
  { id: 'poulet-cuit', name: 'Poulet cuit', category: 'prepared', aliases: ['reste de poulet', 'poulet roti'] },
  { id: 'soupe', name: 'Soupe', category: 'prepared', aliases: ['potage', 'veloute', 'reste de soupe'] },
  { id: 'puree', name: 'Purée', category: 'prepared', aliases: ['puree de pomme de terre', 'reste de puree'] },

  // Épicerie
  { id: 'sucre', name: 'Sucre', category: 'grocery', aliases: ['sucre roux', 'cassonade'] },
  { id: 'levure', name: 'Levure chimique', category: 'grocery', aliases: ['poudre a lever'] },
  { id: 'flocons-avoine', name: "Flocons d'avoine", category: 'grocery', aliases: ['avoine'] },
  { id: 'coulis-tomate', name: 'Coulis de tomate', category: 'grocery', aliases: ['sauce tomate', 'tomate concassee', 'passata'] },
  { id: 'bouillon', name: 'Bouillon', category: 'grocery', aliases: ['cube de bouillon', 'bouillon cube'] },
  { id: 'sauce-soja', name: 'Sauce soja', category: 'grocery' },
  { id: 'epices', name: 'Épices', category: 'grocery', aliases: ['curry', 'cumin', 'paprika', 'cannelle', 'herbes de provence'] },
  { id: 'moutarde', name: 'Moutarde', category: 'grocery' },
  { id: 'vinaigre', name: 'Vinaigre', category: 'grocery' },
  { id: 'chocolat', name: 'Chocolat', category: 'grocery', aliases: ['pepite de chocolat', 'cacao'] },
  { id: 'lait-coco', name: 'Lait de coco', category: 'grocery' },
]

export const CATALOG_BY_ID: ReadonlyMap<string, CatalogIngredient> = new Map(CATALOG.map((i) => [i.id, i]))
