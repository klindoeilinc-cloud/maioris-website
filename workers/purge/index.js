/* MAIORIS : Worker de purge planifiée. Cloudflare Pages ne sait pas lancer de tâche planifiée : ce petit Worker, lié à la même base D1,
   efface chaque nuit les données dont la durée de conservation est dépassée (même code que le bouton « Purger » de l'administration).
   Déploiement : voir README (section « Purge planifiée »). */
import { purgeExpired } from "../../site/functions/_lib/purge.js";

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(purgeExpired(env.MAIORIS_DB, "system:cron").then((r) => {
      // Quand le stockage R2 existera : supprimer ici les objets listés dans r.r2_keys.
      console.log("purge", JSON.stringify({ evaluations: r.evaluations, profiles: r.profiles, documents: r.documents, audit_events: r.audit_events }));
    }));
  },
};
