-- STRATEGIC CASES & PERSPECTIVES : tables éditoriales. Migration ADDITIVE (CREATE ... IF NOT EXISTS uniquement).
-- Les cinq rubriques et les six formats sont permanents : ils sont définis dans le code et contrôlés ici par des CHECK.
-- Un contenu n'est public que si status = 'published' ET published_at <= maintenant (une date future programme la mise en ligne).

CREATE TABLE IF NOT EXISTS articles (
  id                  TEXT PRIMARY KEY,
  category_id         TEXT NOT NULL CHECK (category_id IN ('cases','perspectives','future','intelligence','african')),
  format_id           TEXT NOT NULL CHECK (format_id IN ('case','brief','deep','signals','framework','outlook')),
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','published','archived')),
  featured            INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),        -- publication à la une
  selection           INTEGER NOT NULL DEFAULT 0 CHECK (selection IN (0,1)),       -- « Strategic Selection » pour dirigeants
  tool_suggestion     TEXT CHECK (tool_suggestion IS NULL OR tool_suggestion IN ('brief','diag','coi','maturity','brand')),
  hero_image          TEXT,
  hero_alt            TEXT,
  author              TEXT NOT NULL DEFAULT 'MAIORIS',
  is_demo             INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0,1)),         -- exemple éditorial fictif : jamais indexé
  quality_json        TEXT CHECK (quality_json IS NULL OR json_valid(quality_json)),  -- grille interne, jamais publique
  quality_total       INTEGER,
  published_at        TEXT,
  first_published_at  TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  created_by          TEXT NOT NULL,
  updated_by          TEXT,
  approved_by         TEXT,
  published_by        TEXT
);
CREATE INDEX IF NOT EXISTS ix_articles_status ON articles(status, published_at);
CREATE INDEX IF NOT EXISTS ix_articles_category ON articles(category_id, status, published_at);

CREATE TABLE IF NOT EXISTS article_translations (
  article_id       TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  lang             TEXT NOT NULL CHECK (lang IN ('fr','en')),
  ready            INTEGER NOT NULL DEFAULT 0 CHECK (ready IN (0,1)),             -- version prête à être publiée
  slug             TEXT,                                                          -- NULL tant que non renseigné
  title            TEXT NOT NULL DEFAULT '',
  subtitle         TEXT NOT NULL DEFAULT '',
  summary          TEXT NOT NULL DEFAULT '',
  body_md          TEXT NOT NULL DEFAULT '',
  meta_title       TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  takeaways_json   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(takeaways_json)),
  word_count       INTEGER NOT NULL DEFAULT 0,
  reading_minutes  INTEGER NOT NULL DEFAULT 1,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (article_id, lang),
  UNIQUE (lang, slug)
);

CREATE TABLE IF NOT EXISTS article_sources (
  id          TEXT PRIMARY KEY,
  article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ordinal     INTEGER NOT NULL,                                                  -- numéro cité dans le texte : [^1], [^2]...
  label       TEXT NOT NULL,
  url         TEXT,
  publisher   TEXT,
  kind        TEXT NOT NULL DEFAULT 'primary' CHECK (kind IN ('primary','secondary','data','illustrative')),
  accessed_on TEXT,
  note        TEXT,
  UNIQUE (article_id, ordinal)
);

CREATE TABLE IF NOT EXISTS article_related (
  article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  related_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ordinal    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (article_id, related_id),
  CHECK (article_id <> related_id)
);

CREATE TABLE IF NOT EXISTS article_revisions (
  id            TEXT PRIMARY KEY,
  article_id    TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  lang          TEXT NOT NULL,
  saved_at      TEXT NOT NULL,
  saved_by      TEXT NOT NULL,
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json))
);
CREATE INDEX IF NOT EXISTS ix_revisions_article ON article_revisions(article_id, saved_at);
