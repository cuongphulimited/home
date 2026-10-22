(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const nav = document.getElementById("primary-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const backToTop = document.querySelector(".back-to-top");
  const solidHeader = header?.hasAttribute("data-solid");

  /* ---------- Header state & back-to-top ---------- */
  let menuOpen = false;
  const syncHeader = () => {
    header?.classList.toggle("scrolled", solidHeader || menuOpen || window.scrollY > 12);
    backToTop?.classList.toggle("show", window.scrollY > 640);
  };
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
  backToTop?.addEventListener("click", () => window.scrollTo({ top: 0 }));

  /* ---------- Mobile menu ---------- */
  const setMenu = (open) => {
    menuOpen = open;
    nav?.classList.toggle("open", open);
    menuToggle?.setAttribute("aria-expanded", String(open));
    syncHeader();
  };
  menuToggle?.addEventListener("click", () => setMenu(!menuOpen));
  nav?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) { setMenu(false); menuToggle?.focus(); }
  });
  window.matchMedia("(min-width: 1101px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Active nav link (scrollspy) ---------- */
  const navLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  // Observe every section so unlinked ones (hero, industries) clear the highlight.
  const spyTargets = navLinks.length ? [...document.querySelectorAll("main > section[id]")] : [];
  if (spyTargets.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyTargets.forEach((el) => spy.observe(el));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Once revealed, drop the reveal classes so the element's own hover transitions apply again.
        const settle = (e) => {
          if (e.target !== el || e.propertyName !== "opacity") return;
          el.removeEventListener("transitionend", settle);
          el.classList.remove("reveal", "in");
        };
        el.addEventListener("transitionend", settle);
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Language (EN in markup, VI from i18n-vi.js) ---------- */
  const STORAGE_KEY = "cmp-lang";
  const VI = window.I18N_VI || {};
  const textNodes = [...document.querySelectorAll("[data-i18n]")];
  const placeholderNodes = [...document.querySelectorAll("[data-i18n-placeholder]")];
  const ariaNodes = [...document.querySelectorAll("[data-i18n-aria]")];
  const langBlocks = [...document.querySelectorAll("[data-lang-block]")];
  const metaDesc = document.querySelector('meta[name="description"]');
  const pageKey = document.body.dataset.page || "home";

  const en = {
    text: new Map(textNodes.map((el) => [el, el.innerHTML])),
    placeholder: new Map(placeholderNodes.map((el) => [el, el.getAttribute("placeholder")])),
    aria: new Map(ariaNodes.map((el) => [el, el.getAttribute("aria-label")])),
    title: document.title,
    desc: metaDesc?.getAttribute("content"),
  };

  const applyLang = (lang) => {
    const vi = lang === "vi";
    const pick = (key, fallback) => (vi && VI[key] != null ? VI[key] : fallback);

    textNodes.forEach((el) => { el.innerHTML = pick(el.dataset.i18n, en.text.get(el)); });
    placeholderNodes.forEach((el) => el.setAttribute("placeholder", pick(el.dataset.i18nPlaceholder, en.placeholder.get(el))));
    ariaNodes.forEach((el) => el.setAttribute("aria-label", pick(el.dataset.i18nAria, en.aria.get(el))));
    langBlocks.forEach((el) => { el.hidden = el.dataset.langBlock !== lang; });

    document.title = pick(`meta.${pageKey}.title`, en.title);
    metaDesc?.setAttribute("content", pick(`meta.${pageKey}.desc`, en.desc));
    document.documentElement.lang = lang;
    document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });
  };

  const saved = (() => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } })();
  const initial = saved || ((navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en");
  if (initial !== "en") applyLang(initial);

  document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      applyLang(lang);
      try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage unavailable */ }
    });
  });

  /* ---------- Contact form → mailto ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = form.querySelector(".form-status");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      // Trim first so whitespace-only answers fail the `required` check.
      form.querySelectorAll("input, textarea").forEach((el) => { el.value = el.value.trim(); });
      if (!form.reportValidity()) return;
      const vi = document.documentElement.lang === "vi";
      const data = new FormData(form);
      const service = form.elements.service.selectedOptions[0]?.textContent.trim() || "";
      const name = data.get("name");
      const subject = `[Website] ${service} — ${name}`;
      const body = [
        `${vi ? "Họ tên" : "Name"}: ${name}`,
        `Email: ${data.get("email")}`,
        `${vi ? "Điện thoại" : "Phone"}: ${data.get("phone") || "-"}`,
        `${vi ? "Công ty" : "Company"}: ${data.get("company") || "-"}`,
        `${vi ? "Dịch vụ" : "Service"}: ${service}`,
        "",
        data.get("message"),
      ].join("\r\n");
      const url = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Some mail clients (notably on Windows) drop links over ~2,000 characters, so keep a copy on the clipboard.
      const copied = url.length > 1900 && navigator.clipboard
        ? navigator.clipboard.writeText(`${subject}\n\n${body}`).then(() => true, () => false)
        : Promise.resolve(false);
      window.location.href = url;
      copied.then((wasCopied) => {
        if (!status) return;
        const email = form.dataset.mailto;
        if (wasCopied) {
          status.textContent = vi
            ? `Nội dung khá dài nên đã được sao chép sẵn — nếu email bị thiếu, hãy dán vào hoặc gửi trực tiếp tới ${email}`
            : `Your message is long, so we copied it to your clipboard — paste it in if the email looks cut off, or write to ${email}`;
        } else {
          status.textContent = vi
            ? `Đang mở ứng dụng email của bạn… Nếu không thấy, hãy gửi trực tiếp tới ${email}`
            : `Opening your email app… If nothing happens, email us directly at ${email}`;
        }
        status.hidden = false;
      });
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
