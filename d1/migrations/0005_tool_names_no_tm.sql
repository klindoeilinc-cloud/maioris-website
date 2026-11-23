-- Retire le symbole ™ des noms d'outils stockés (la migration 0002, déjà appliquée, reste inchangée).
UPDATE tools SET name = 'Creative Operations Intelligence' WHERE id = 'coi' AND name LIKE '%™';
UPDATE tools SET name = 'Creative Maturity Assessment' WHERE id = 'maturity' AND name LIKE '%™';
UPDATE tools SET name = 'Brand Consistency Review' WHERE id = 'brand' AND name LIKE '%™';
