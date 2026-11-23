/* En-têtes de sécurité des réponses dynamiques. Cloudflare Pages n'applique pas le fichier _headers aux réponses des Functions :
   les pages servies par une fonction (section éditoriale, aperçu) doivent donc les porter elles-mêmes.
   Cette politique reproduit celle de site/_headers ; un test vérifie qu'elles restent identiques. */
export const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://plausible.io; frame-src https://cal.com https://app.cal.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
export const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};
