/* MAIORIS.NET 2.0 — interactions et mesure (sans dépendance) */
{
  const root = document.documentElement;
  const body = document.body;
  const lang = body.dataset.lang || "en";
  const pageId = body.dataset.page || "";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- mesure : Plausible ou Umami si présents, sinon rien ---- */
  const track = (name, props) => {
    const p = Object.assign({ page: pageId, lang }, props || {});
    try {
      if (typeof window.plausible === "function") window.plausible(name, { props: p });
      else if (window.umami && typeof window.umami.track === "function") window.umami.track(name, p);
      document.dispatchEvent(new CustomEvent("maioris:track", { detail: { name, props: p } }));
    } catch (e) { /* la mesure ne doit jamais casser la page */ }
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-track]");
    if (!a) return;
    if (a.dataset.track === "cta_click") track("cta_click", { label: a.dataset.label, rank: a.dataset.rank });
    if (a.dataset.track === "lang_switch") {
      track("lang_switch", { from: lang, to: a.dataset.to });
      try { localStorage.setItem("maioris-lang", a.dataset.to); } catch (err) {}
    }
  });

  /* ---- header compact au scroll ---- */
  const hd = document.querySelector(".hd");
  let lastY = window.scrollY;
  const sym = document.querySelector(".hero-sym");
  const onScroll = () => {
    const y = window.scrollY;
    if (hd) {
      hd.classList.toggle("compact", y > 40);
      const menuOpen = document.getElementById("nav") && document.getElementById("nav").classList.contains("open");
      hd.classList.toggle("hide", !menuOpen && y > 240 && y > lastY + 4);
      if (y < lastY - 4) hd.classList.remove("hide");
    }
    if (sym && !reduce && y < 1200) sym.style.transform = "translateY(" + (y * -0.12).toFixed(1) + "px)";
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- menu mobile ---- */
  const burger = document.querySelector(".burger");
  const nav = document.getElementById("nav");
  if (burger && nav) {
    const close = () => { burger.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); body.style.overflow = ""; };
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") !== "true";
      burger.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      body.style.overflow = open ? "hidden" : "";
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { close(); burger.focus(); } });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  }

  /* ---- apparition au scroll (désactivée si mouvement réduit) ---- */
  const items = document.querySelectorAll("[data-reveal]");
  document.querySelectorAll(".index, .plan, .circuit, ul.outcomes").forEach((list) => {
    [...list.children].forEach((el, k) => el.style.setProperty("--i", k));
  });
  document.querySelectorAll(".offer-row").forEach((el, k) => el.style.setProperty("--i", k % 3));
  const t0 = performance.now(), hold = root.classList.contains("door-in") ? 900 : 0;
  const later = (fn) => { const w = hold - (performance.now() - t0); if (w > 0) setTimeout(fn, w); else fn(); };
  if (!reduce && "IntersectionObserver" in window) {
    root.classList.add("js");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { const el = en.target; io.unobserve(el); later(() => el.classList.add("in")); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  }


  /* ---- titres mot par mot ---- */
  if (!reduce) {
    const split = (el) => {
      let n = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((ch) => {
          if (ch.nodeType === 3) {
            const parts = ch.textContent.split(/(\s+)/);
            const frag = document.createDocumentFragment();
            parts.forEach((p) => {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
              const w = document.createElement("span"); w.className = "w";
              const wi = document.createElement("span"); wi.className = "wi"; wi.style.setProperty("--wi", n++);
              wi.textContent = p; w.appendChild(wi); frag.appendChild(w);
            });
            ch.replaceWith(frag);
          } else if (ch.nodeType === 1 && ch.tagName !== "BR" && ch.tagName !== "SVG") walk(ch);
        });
      };
      walk(el);
      el.classList.add("ws");
    };
    const heads = document.querySelectorAll(".thesis, .h2, .closing-t, .cta-band p, .industries-line");
    heads.forEach(split);
    const sio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const el = e.target; sio.unobserve(el); later(() => el.classList.add("on")); } }), { rootMargin: "0px 0px -10% 0px" });
    heads.forEach((h) => sio.observe(h));
  }

  /* ---- barre de progression ---- */
  if (hd && !reduce) {
    const bar = document.createElement("div"); bar.className = "progress"; bar.setAttribute("aria-hidden", "true"); hd.appendChild(bar);
    const upd = () => { const h = document.documentElement.scrollHeight - window.innerHeight; bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")"; };
    window.addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* ---- circuit : une étape s'allume à tour de rôle quand il est visible ---- */
  document.querySelectorAll(".circuit").forEach((c) => {
    if (reduce || (c.closest(".cps-scroll") && window.matchMedia("(min-width: 900px)").matches)) return;
    const steps = [...c.children]; let k = 0, t = null;
    const tick = () => { steps.forEach((s, i) => s.classList.toggle("lit", i === k)); k = (k + 1) % steps.length; };
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !t) { tick(); t = setInterval(tick, 1100); }
      else if (!e.isIntersecting && t) { clearInterval(t); t = null; steps.forEach((s) => s.classList.remove("lit")); }
    }), { threshold: .4 }).observe(c);
  });


  /* ================= ANIMATIONS AVANCÉES ================= */
  const fine = window.matchMedia("(pointer: fine)").matches;
  const SYM = '<svg viewBox="385 213 1312 1311" aria-hidden="true"><path d="M385 213L670 379V1359L385 1524Z"/><path d="M750 424L1024 581L995 606V1131L1024 1156L750 1313Z"/><path d="M1332 424L1059 581L1087 606V1131L1059 1156L1332 1313Z"/><path d="M1697 213L1412 379V1359L1697 1524Z"/></svg>';

  /* 1. portes entre les pages : les panneaux du logo se referment et annoncent la destination */
  const doors = document.querySelector(".doors");
  if (!reduce && doors) {
    const label = doors.querySelector(".dr-to");
    const came = doors.classList.contains("shut");
    try { sessionStorage.removeItem("maioris-door"); } catch (e) {}
    let leaving = false;
    if (came) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        doors.classList.remove("instant"); doors.classList.add("opening");
        setTimeout(() => { doors.classList.remove("shut"); }, 320);
        setTimeout(() => { doors.classList.remove("opening"); root.classList.remove("door-in"); }, 1500);
      }));
    }
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      leaving = false; root.classList.remove("door-in");
      const nav = document.getElementById("nav"), burger = document.querySelector(".burger");
      if (nav) nav.classList.remove("open"); if (burger) burger.setAttribute("aria-expanded", "false"); document.body.style.overflow = "";
      doors.classList.remove("shut", "instant");
    });
    const internal = (a) => {
      if (!a || a.target === "_blank") return null;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || /^(mailto:|tel:|https?:|javascript:)/.test(href)) return null;
      const url = new URL(href, location.href);
      return url.pathname === location.pathname ? null : url;
    };
    const fetched = new Set();
    const prefetch = (e) => {
      const url = internal(e.target.closest && e.target.closest("a[href]"));
      if (!url || fetched.has(url.href)) return;
      fetched.add(url.href);
      const l = document.createElement("link"); l.rel = "prefetch"; l.href = url.href; document.head.appendChild(l);
    };
    document.addEventListener("pointerover", prefetch, { passive: true });
    document.addEventListener("touchstart", prefetch, { passive: true });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = internal(a);
      if (!url) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      let t = a.classList.contains("logo") ? "MAIORIS" : (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").replace(/[→•]/g, "").trim();
      if (t.length > 44) t = t.slice(0, 42).replace(/\s\S*$/, "") + "…";
      try { sessionStorage.setItem("maioris-door", t || "1"); sessionStorage.setItem("maioris-last", String(Date.now())); } catch (err) {}
      label.textContent = t;
      doors.classList.add("shut");
      setTimeout(() => { location.href = url.href; }, 1000);
      setTimeout(() => { doors.classList.remove("shut"); leaving = false; }, 4000);
    });
  }

  /* 2. parallaxe des photos */
  const pics = [...document.querySelectorAll(".photo img, .photo .corridor")];
  if (pics.length && !reduce) {
    let ticking = false;
    const par = () => {
      const vh = window.innerHeight;
      pics.forEach((p) => {
        const r = p.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const d = (r.top + r.height / 2 - vh / 2) / vh;
        p.style.setProperty("--py", (d * -6).toFixed(2) + "%");
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
    par();
  }

  /* 3. méthode pilotée par le défilement */
  const cps = document.querySelector(".cps-scroll");
  if (cps && !reduce && window.matchMedia("(min-width: 900px)").matches) {
    const steps = [...cps.querySelectorAll(".circuit li")];
    const meter = document.createElement("div"); meter.className = "cps-meter"; meter.innerHTML = "<i></i>";
    cps.querySelector(".circuit").after(meter);
    const bar = meter.firstChild;
    const run = () => {
      const r = cps.getBoundingClientRect();
      const total = cps.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
      const k = Math.min(steps.length - 1, Math.floor(p * steps.length));
      steps.forEach((s, i) => { s.classList.toggle("act", i === k); s.classList.toggle("done-step", i < k); });
      bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    };
    window.addEventListener("scroll", run, { passive: true }); run();
  }

  /* 5. boutons magnétiques */
  if (fine && !reduce) {
    document.querySelectorAll(".hero .btn, .closing .btn, .cta-band .btn").forEach((btn) => {
      btn.classList.add("mag");
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .22, y = (e.clientY - r.top - r.height / 2) * .32;
        btn.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
      });
      btn.addEventListener("pointerleave", () => { btn.style.transform = ""; });
    });
  }

  /* 6. secteurs : description au survol ou au clavier */
  const line = document.querySelector(".industries-line");
  const desc = document.querySelector(".ind-desc");
  if (line && desc) {
    const show = (a) => { line.classList.add("hovering"); line.querySelectorAll("a").forEach((x) => x.classList.toggle("hl", x === a)); desc.textContent = a.dataset.d || ""; desc.classList.add("on"); };
    const hide = () => { line.classList.remove("hovering"); line.querySelectorAll("a").forEach((x) => x.classList.remove("hl")); desc.classList.remove("on"); };
    line.querySelectorAll("a[data-d]").forEach((a) => { a.addEventListener("mouseenter", () => show(a)); a.addEventListener("focus", () => show(a)); });
    line.addEventListener("mouseleave", hide);
    line.addEventListener("focusout", (e) => { if (!line.contains(e.relatedTarget)) hide(); });
  }

  /* 7. symbole d'accueil sensible à la souris */
  const hero = document.querySelector('body[data-page="home"] .hero');
  if (hero && fine && !reduce) {
    const groups = [...hero.querySelectorAll(".hero-sym .pg")];
    const k = [-14, -6, 6, 14];
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - .5, my = (e.clientY - r.top) / r.height - .5;
      groups.forEach((g, i) => { g.style.transform = "translate(" + (mx * k[i]).toFixed(1) + "px," + (my * Math.abs(k[i]) * .6).toFixed(1) + "px)"; });
    });
    hero.addEventListener("pointerleave", () => groups.forEach((g) => { g.style.transform = ""; }));
  }

  /* ---- engagement page offre / cas : 50 % de lecture + 30 s ---- */
  const engage = body.dataset.engage;
  if (engage) {
    const [kind, id] = engage.split(":");
    let seen = false, timeOk = false, done = false;
    const fire = () => { if (!done && seen && timeOk) { done = true; track(kind === "service" ? "service_engaged" : "case_engaged", { item: id }); } };
    setTimeout(() => { timeOk = true; fire(); }, 30000);
    window.addEventListener("scroll", () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (h <= 0 || window.scrollY / h >= 0.5) { seen = true; fire(); }
    }, { passive: true });
  }

  /* ---- formulaire de qualification ---- */
  const form = document.getElementById("qualify");
  if (form) {
    const t = lang === "fr"
      ? { req: "Merci de compléter les champs indiqués.", pick: "Merci de choisir au moins une option.", fail: "L'envoi n'a pas abouti. Vous pouvez réessayer ou écrire directement à hello@maioris.net.", sending: "Envoi…" }
      : { req: "Please complete the highlighted fields.", pick: "Please choose at least one option.", fail: "Your request could not be sent. Please try again or write directly to hello@maioris.net.", sending: "Sending…" };
    const steps = [...form.querySelectorAll("fieldset[data-step]")];
    const marks = [...form.querySelectorAll(".steps li")];
    const prev = form.querySelector("[data-prev]");
    const next = form.querySelector("[data-next]");
    const submit = form.querySelector("[type=submit]");
    const err = form.querySelector(".err");
    let cur = 0, started = false;

    // pré-sélection depuis une page offre : contact.html#diagnostic
    const pre = (location.hash || "").slice(1);
    const map = { diagnostic: "diagnostic", brand: "project", growth: "project", cos: "project", t90: "t90", claas: "claas" };
    if (map[pre]) { const r = form.querySelector('input[name=support][value="' + map[pre] + '"]'); if (r) r.checked = true; }

    let lastStep = 0;
    const show = (i) => {
      steps.forEach((s, k) => { s.hidden = k !== i; s.classList.toggle("back", i < lastStep); });
      lastStep = i;
      marks.forEach((m, k) => { m.classList.toggle("on", k === i); m.classList.toggle("ok", k < i); });
      prev.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      err.hidden = true;
      const lg = steps[i].querySelector("legend");
      if (lg) { lg.setAttribute("tabindex", "-1"); lg.focus({ preventScroll: true }); }
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };

    const valid = (i) => {
      const s = steps[i];
      let ok = true;
      s.querySelectorAll("input, select, textarea").forEach((f) => f.removeAttribute("aria-invalid"));
      s.querySelectorAll("[required]").forEach((f) => {
        if (f.type === "radio") return;
        const bad = f.type === "checkbox" ? !f.checked : !f.checkValidity() || !f.value.trim();
        if (bad) { f.setAttribute("aria-invalid", "true"); ok = false; }
      });
      let msg = t.req;
      const groups = new Set([...s.querySelectorAll("input[type=checkbox][name=challenges], input[type=radio]")].map((x) => x.name));
      groups.forEach((g) => {
        if (!s.querySelector('input[name="' + g + '"]:checked')) { ok = false; msg = t.pick; }
      });
      if (!ok) { err.textContent = msg; err.hidden = false; const f = s.querySelector('[aria-invalid="true"]'); if (f) f.focus(); }
      return ok;
    };

    form.addEventListener("input", () => { if (!started) { started = true; track("contact_start", { prefilled: map[pre] ? "yes" : "no" }); } });
    next.addEventListener("click", () => { if (valid(cur)) { cur++; track("contact_step", { step: cur + 1 }); show(cur); } });
    prev.addEventListener("click", () => { cur--; show(cur); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!valid(cur)) return;
      const fd = new FormData(form);
      const data = {};
      fd.forEach((v, k) => { data[k] = data[k] ? [].concat(data[k], v) : v; });
      submit.disabled = true;
      const label = submit.textContent;
      submit.textContent = t.sending;
      try {
        const res = await fetch(form.dataset.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error("send");
        track("contact_submit", { support: data.support || "", sector: data.sector || "", budget: data.budget || "" });
        form.hidden = true;
        const done = document.getElementById("done");
        done.hidden = false;
        done.focus();
      } catch (x) {
        err.textContent = t.fail;
        err.hidden = false;
      } finally {
        submit.disabled = false;
        submit.textContent = label;
      }
    });
  }

  /* ---- compteurs des chiffres de parcours ---- */
  const counters = document.querySelectorAll("[data-count]");
  if (!reduce && counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target, end = parseInt(el.dataset.count, 10), node = el.firstChild, t0 = performance.now(), dur = 1200;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        node.nodeValue = String(v);
        if (k < 1) requestAnimationFrame(step);
      };
      node.nodeValue = "0"; requestAnimationFrame(step);
    }), { threshold: .6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---- mur de logos : rotation premium, case par case ---- */
  const wall = document.querySelector(".brands ul");
  if (wall && !reduce && "IntersectionObserver" in window) {
    const items = [...wall.querySelectorAll("img.bl")].map((im) => ({ src: im.getAttribute("src"), alt: im.alt, w: parseFloat(im.style.width) || 160 }));
    const N = window.matchMedia("(max-width: 640px)").matches ? 4 : 6;
    if (items.length > N) {
      const rot = document.createElement("div");
      rot.className = "lw-rot"; rot.setAttribute("aria-hidden", "true");
      const mk = (k) => { const im = document.createElement("img"); im.className = "lw-img"; im.src = items[k].src; im.alt = ""; im.style.setProperty("--w", items[k].w); im.decoding = "async"; return im; };
      const cells = [];
      for (let c = 0; c < N; c++) {
        const cell = document.createElement("div"); cell.className = "lw-cell"; cell.style.setProperty("--d", c);
        cell.appendChild(mk(c)); cell.dataset.k = c; rot.appendChild(cell); cells.push(cell);
      }
      const queue = items.map((_, k) => k).slice(N);
      wall.classList.add("lw-sr"); wall.after(rot);
      const pattern = N === 6 ? [0, 4, 2, 3, 1, 5] : [0, 3, 1, 2];
      let step = 0, timer = null, paused = false;
      const swap = () => {
        if (paused || document.hidden) return;
        const cell = cells[pattern[step++ % pattern.length]];
        const nextK = queue.shift(); queue.push(+cell.dataset.k); cell.dataset.k = nextK;
        const old = cell.querySelector(".lw-img:not(.leave)");
        const nu = mk(nextK); nu.classList.add("enter"); cell.appendChild(nu);
        cell.classList.remove("tick"); void cell.offsetWidth; cell.classList.add("tick");
        requestAnimationFrame(() => requestAnimationFrame(() => { if (old) old.classList.add("leave"); }));
        setTimeout(() => nu.classList.remove("enter"), old ? 420 : 30);
        setTimeout(() => { if (old) old.remove(); }, 1100);
      };
      rot.addEventListener("pointerenter", () => { paused = true; });
      rot.addEventListener("pointerleave", () => { paused = false; });
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) {
          rot.classList.add("lw-in");
          if (!timer) timer = setInterval(swap, 2300);
        } else { clearInterval(timer); timer = null; }
      }), { threshold: .3 }).observe(rot);
    }
  }

  /* ---- autodiagnostic : sept affirmations, une contrainte principale ---- */
  const dg = document.getElementById("diag");
  if (dg) {
    const D = JSON.parse(document.getElementById("diag-data").textContent);
    const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
    const pad = (n) => String(n).padStart(2, "0");
    const ans = new Array(D.q.length).fill(null);
    let i = 0, busy = false;
    const enter = () => { dg.classList.remove("dg-in"); void dg.offsetWidth; dg.classList.add("dg-in"); };
    const render = () => {
      if (i >= D.q.length) return result();
      dg.innerHTML = '<div class="dg-top"><span class="dg-count">' + esc(D.t.q) + " " + pad(i + 1) + " <em>" + esc(D.t.of) + " " + pad(D.q.length) + '</em></span>' +
        '<span class="dg-bar"><i style="width:' + (i / D.q.length * 100) + '%"></i></span></div>' +
        '<div class="dg-q"><span class="dg-ico">' + D.ch[i].icon + '</span><p class="dg-text">' + esc(D.q[i]) + "</p></div>" +
        '<div class="dg-scale" role="radiogroup" aria-label="' + esc(D.q[i]) + '">' +
        D.scale.map((s, k) => '<button type="button" class="dg-opt' + (ans[i] === k ? " on" : "") + '" data-v="' + k + '" role="radio" aria-checked="' + (ans[i] === k) + '"><span class="dg-n">' + k + "</span>" + esc(s) + "</button>").join("") +
        '</div><div class="dg-nav">' + (i ? '<button type="button" class="dg-prev">← ' + esc(D.t.prev) + "</button>" : "") + "</div>";
      enter();
      const first = dg.querySelector(".dg-opt.on") || dg.querySelector(".dg-opt");
      if (first && document.activeElement && document.activeElement.closest && document.activeElement.closest("#diag")) first.focus({ preventScroll: true });
    };
    const result = () => {
      const max = Math.max(...ans);
      const top = ans.indexOf(max);
      const ch = D.ch[top];
      const order = ans.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
      const bars = order.map(([v, k]) => '<li class="' + (k === top && max > 1 ? "top" : "") + '"><span class="dg-bt">' + esc(D.ch[k].t) + '</span><span class="dg-bv"><i style="--v:' + (v / 3) + '"></i></span><span class="dg-bs">' + v + "/3</span></li>").join("");
      const head = max > 1
        ? '<p class="lbl">' + esc(D.t.res_l) + '</p><h2 class="dg-rt"><span class="dg-ico xl">' + ch.icon + "</span>" + esc(ch.t) + '</h2><p class="dg-rd">' + esc(ch.d) + "</p>" +
          '<p class="dg-ans">' + esc(D.t.answer) + " : <strong>" + esc(ch.offer) + "</strong></p>" +
          '<div class="dg-cta"><a class="btn" href="' + D.contact + "#" + ch.oid + '" data-track="cta_click" data-label="diag_talk" data-rank="primary">' + esc(D.t.talk) + ' <span class="dot"></span></a><a class="lnk" href="' + ch.ourl + '">' + esc(D.t.see) + " →</a></div>"
        : '<p class="lbl">' + esc(D.t.res_l) + '</p><h2 class="dg-rt">' + esc(D.t.low) + '</h2><div class="dg-cta"><a class="btn" href="' + D.contact + '">' + esc(D.t.talk) + ' <span class="dot"></span></a></div>';
      dg.innerHTML = '<div class="dg-res">' + head + '<div class="dg-prof"><p class="lbl">' + esc(D.t.profile) + '</p><ol>' + bars + '</ol></div>' +
        '<p class="dg-note">' + esc(D.t.note) + '</p><button type="button" class="dg-again">↺ ' + esc(D.t.again) + "</button></div>";
      enter();
      try { sessionStorage.setItem("maioris-diag", max > 1 ? ch.t : ""); } catch (e) {}
      track("diag_result", { top: max > 1 ? ch.id : "none" });
      const h = dg.querySelector(".dg-rt"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      dg.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    const choose = (v) => {
      if (busy) return; busy = true;
      ans[i] = v;
      dg.querySelectorAll(".dg-opt").forEach((b) => { const on = +b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      if (i === 0) track("diag_start", {});
      setTimeout(() => { i++; busy = false; render(); }, reduce ? 60 : 320);
    };
    dg.addEventListener("click", (e) => {
      const o = e.target.closest(".dg-opt"); if (o) return choose(+o.dataset.v);
      if (e.target.closest(".dg-prev")) { i = Math.max(0, i - 1); render(); }
      if (e.target.closest(".dg-again")) { ans.fill(null); i = 0; render(); }
    });
    dg.addEventListener("keydown", (e) => { if (i < D.q.length && /^[0-3]$/.test(e.key)) choose(+e.key); });
    render();
  }
  /* contact : reprendre le résultat de l'autodiagnostic */
  const ctxField = document.getElementById("context");
  if (ctxField) {
    try {
      const r = sessionStorage.getItem("maioris-diag");
      if (r && !ctxField.value) { ctxField.value = (document.documentElement.lang === "en" ? "Self-assessment — main constraint: " : "Autodiagnostic — contrainte principale : ") + r + ".\n"; }
      sessionStorage.removeItem("maioris-diag");
    } catch (e) {}
  }
}
