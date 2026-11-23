/**
 * MAIORIS.NET : section éditoriale STRATEGIC CASES & PERSPECTIVES (Cloudflare Pages Function), en lecture seule.
 *   /fr/perspectives, /en/perspectives                          accueil éditorial
 *   /{lang}/perspectives/{rubrique}                             rubrique (filtres ?format= et ?q=, pagination ?page=)
 *   /{lang}/perspectives/{rubrique}/{article}                   publication
 * Seuls les contenus « published » dont la date de mise en ligne est atteinte sont servis. Sans base liée (MAIORIS_DB), l'accueil s'affiche sans publication.
 *
 * SECTION ACTUELLEMENT RETIRÉE DU SITE PUBLIC : sans la variable d'environnement EDITORIAL_PUBLIC=1, chaque adresse renvoie vers MAIORIS Insights
 * (redirection temporaire 302, réversible). Le moteur éditorial (administration, base, images, aperçu) reste en place et inchangé.
 */
import { route } from "../../_lib/editorial/pages.js";

export async function onRequestGet({ request, env, params, next }) {
  const lang = params.lang;
  if (lang !== "fr" && lang !== "en") return next();
  if (env.EDITORIAL_PUBLIC !== "1") return new Response(null, { status: 302, headers: { Location: lang === "fr" ? "/fr/analyses" : "/en/insights", "Cache-Control": "no-store" } });
  const segs = (Array.isArray(params.path) ? params.path : params.path ? [params.path] : []).filter(Boolean);
  return route(env, request, lang, segs);
}
