-- MÉDIAS ÉDITORIAUX : registre des images téléversées dans le bucket R2 (binding MAIORIS_MEDIA). Migration ADDITIVE.
-- Les fichiers vivent dans R2 (bucket privé, jamais d'URL publique du bucket) ; cette table en tient le registre.
-- Les images sont servies par la fonction /media/<id> : seul un identifiant présent ici est lisible.
CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,                                  -- identifiant aléatoire (non devinable)
  r2_key        TEXT NOT NULL UNIQUE,
  original_name TEXT,
  mime          TEXT NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  size_bytes    INTEGER NOT NULL,
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  sha256        TEXT NOT NULL,                                     -- empreinte du fichier nettoyé (évite les doublons)
  alt           TEXT NOT NULL,                                     -- texte alternatif par défaut
  uploaded_by   TEXT NOT NULL,
  uploaded_at   TEXT NOT NULL,
  deleted_at    TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_media_sha ON media(sha256) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_media_uploaded ON media(uploaded_at);
