-- MAIORIS INTELLIGENCE CORE : schéma initial de la base D1 `maioris-intelligence` (binding MAIORIS_DB).
-- Migration ADDITIVE : uniquement des CREATE ... IF NOT EXISTS. Aucune suppression, aucune modification de table existante.
-- Conventions : identifiants ULID générés côté serveur ; dates en UTC, texte ISO 8601 ; JSON en TEXT contrôlé par json_valid ; aucune adresse IP conservée.

CREATE TABLE IF NOT EXISTS tools (
  id   TEXT PRIMARY KEY CHECK (id IN ('brief','diag','coi','maturity','brand')),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('questionnaire','guided_review'))
);

-- Chaque évaluation référence une version exacte de questionnaire, avec l'empreinte de sa définition.
CREATE TABLE IF NOT EXISTS questionnaire_versions (
  id              TEXT PRIMARY KEY,                       -- ex. 'maturity@1.0'
  tool_id         TEXT NOT NULL REFERENCES tools(id),
  version         TEXT NOT NULL,
  content_hash    TEXT NOT NULL,                          -- SHA-256 de la définition (questions, échelles)
  scoring_method  TEXT NOT NULL,                          -- ex. 'mat-score-v1'
  definition_json TEXT CHECK (definition_json IS NULL OR json_valid(definition_json)),
  validity_notes  TEXT,                                   -- limites de validité de l'instrument
  published_at    TEXT NOT NULL,
  retired_at      TEXT,
  UNIQUE (tool_id, version)
);

-- Profil organisationnel commun. Le jeton de reprise n'est jamais stocké : seulement son empreinte.
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  org_name          TEXT,
  sector            TEXT,
  size              TEXT,
  market            TEXT,
  resume_token_hash TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','erased')),
  erased_at         TEXT
);

-- Données personnelles isolées dans une table à part, pour pouvoir les effacer sans toucher au reste.
CREATE TABLE IF NOT EXISTS contacts (
  id         TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  name       TEXT,
  email      TEXT,
  created_at TEXT NOT NULL,
  erased_at  TEXT
);
CREATE INDEX IF NOT EXISTS ix_contacts_profile ON contacts(profile_id);

-- Libellé exact du consentement présenté au visiteur, versionné.
CREATE TABLE IF NOT EXISTS consent_texts (
  id           TEXT PRIMARY KEY,                          -- ex. 'tx-maturity-fr-v1'
  tool_id      TEXT NOT NULL REFERENCES tools(id),
  purpose      TEXT NOT NULL CHECK (purpose IN ('transmission','document_upload','ai_analysis','resume_link')),
  lang         TEXT NOT NULL CHECK (lang IN ('fr','en')),
  body         TEXT NOT NULL,
  body_hash    TEXT NOT NULL,
  published_at TEXT NOT NULL
);

-- Consentements donnés : lignes immuables, seul withdrawn_at peut être renseigné.
CREATE TABLE IF NOT EXISTS consents (
  id              TEXT PRIMARY KEY,
  profile_id      TEXT REFERENCES profiles(id),
  purpose         TEXT NOT NULL CHECK (purpose IN ('transmission','document_upload','ai_analysis','resume_link')),
  consent_text_id TEXT NOT NULL REFERENCES consent_texts(id),
  granted_at      TEXT NOT NULL,
  withdrawn_at    TEXT
);
CREATE INDEX IF NOT EXISTS ix_consents_profile ON consents(profile_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id                       TEXT PRIMARY KEY,
  tool_id                  TEXT NOT NULL REFERENCES tools(id),
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  profile_id               TEXT REFERENCES profiles(id),
  consent_id               TEXT NOT NULL REFERENCES consents(id),
  idempotency_key          TEXT UNIQUE,                   -- évite qu'un double envoi crée deux évaluations
  lang                     TEXT NOT NULL CHECK (lang IN ('fr','en')),
  completeness             TEXT NOT NULL CHECK (completeness IN ('complete','partial')),
  headline                 TEXT,
  score                    REAL,
  level                    TEXT,
  answers_json             TEXT CHECK (answers_json IS NULL OR json_valid(answers_json)),
  result_json              TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
  basis                    TEXT NOT NULL DEFAULT 'declared' CHECK (basis IN ('declared','documentary')),
  client_elapsed_ms        INTEGER,
  email_status             TEXT CHECK (email_status IS NULL OR email_status IN ('sent','failed','skipped')),
  submitted_at             TEXT NOT NULL,
  expires_at               TEXT NOT NULL,
  deleted_at               TEXT
);
CREATE INDEX IF NOT EXISTS ix_eval_tool    ON evaluations(tool_id, submitted_at);
CREATE INDEX IF NOT EXISTS ix_eval_profile ON evaluations(profile_id, submitted_at);
CREATE INDEX IF NOT EXISTS ix_eval_expiry  ON evaluations(expires_at) WHERE deleted_at IS NULL;

-- Un indicateur ou une dimension par ligne : permet tris, filtres et comparaisons entre outils.
CREATE TABLE IF NOT EXISTS evaluation_metrics (
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  metric_key    TEXT NOT NULL,
  dimension_id  TEXT NOT NULL DEFAULT '',
  value_num     REAL,
  lo_num        REAL,
  hi_num        REAL,
  unit          TEXT,
  status        TEXT,                                     -- 'ok' ou 'not_computed' (jamais remplacé par zéro)
  meta_json     TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  PRIMARY KEY (evaluation_id, metric_key, dimension_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id               TEXT PRIMARY KEY,
  evaluation_id    TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL CHECK (kind IN ('summary','brand_review')),
  format           TEXT NOT NULL CHECK (format IN ('text','json')),
  lang             TEXT NOT NULL CHECK (lang IN ('fr','en')),
  content          TEXT,
  content_hash     TEXT NOT NULL,
  generated_by     TEXT NOT NULL CHECK (generated_by IN ('client','server')),
  renderer_version TEXT,
  created_at       TEXT NOT NULL,
  expires_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_reports_eval ON reports(evaluation_id);

-- Documents : table prête pour le stockage de fichiers (R2). Aucun fichier n'est reçu à ce jour.
CREATE TABLE IF NOT EXISTS documents (
  id            TEXT PRIMARY KEY,
  profile_id    TEXT NOT NULL REFERENCES profiles(id),
  r2_key        TEXT NOT NULL UNIQUE,                     -- clé aléatoire, aucune URL publique
  original_name TEXT,
  mime_declared TEXT,
  mime_detected TEXT,
  size_bytes    INTEGER,
  sha256        TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','stored','rejected','quarantined','deleted')),
  uploaded_at   TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS ix_documents_profile ON documents(profile_id);

CREATE TABLE IF NOT EXISTS evaluation_documents (
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  document_id   TEXT NOT NULL REFERENCES documents(id),
  support_ref   TEXT,
  category      TEXT,
  PRIMARY KEY (evaluation_id, document_id)
);

CREATE TABLE IF NOT EXISTS retention_policies (
  kind       TEXT PRIMARY KEY,                            -- 'evaluation','report','document','audit'
  days       INTEGER NOT NULL CHECK (days > 0),
  updated_at TEXT NOT NULL
);

-- Journal : qui a fait quoi (administration, purge, effacement). Sans adresse IP.
CREATE TABLE IF NOT EXISTS audit_events (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  actor       TEXT NOT NULL,                              -- 'visitor', 'system' ou e-mail d'un administrateur
  action      TEXT NOT NULL,
  object_type TEXT,
  object_id   TEXT,
  meta_json   TEXT CHECK (meta_json IS NULL OR json_valid(meta_json))
);
CREATE INDEX IF NOT EXISTS ix_audit_at ON audit_events(at);
