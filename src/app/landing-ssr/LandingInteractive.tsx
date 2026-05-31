"use client";
// Sprint F.5b — interactive bits of the landing page lifted out of the
// static HTML inline <script>: hamburger sidebar, form-submit fake,
// scroll-to-top button, nav padding-on-scroll, email obfuscation,
// sidebar close on ESC + link click.
//
// Stays small and self-contained so the SSR page (page.tsx) remains
// a pure server component. Each effect tears down on unmount.

import { useEffect } from "react";

export function LandingInteractive() {
  useEffect(() => {
    const hamburger = document.getElementById("hamburger");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const closeBtn = document.getElementById("sidebarClose");

    function openSidebar() {
      if (!hamburger || !sidebar || !overlay) return;
      hamburger.className = "hamburger active";
      sidebar.className = "sidebar active";
      overlay.className = "sidebar-overlay active";
      document.body.style.overflow = "hidden";
    }
    function closeSidebar() {
      if (!hamburger || !sidebar || !overlay) return;
      hamburger.className = "hamburger";
      sidebar.className = "sidebar";
      overlay.className = "sidebar-overlay";
      document.body.style.overflow = "";
    }

    function onHamburgerClick(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      if (sidebar && sidebar.className.indexOf("active") !== -1) closeSidebar();
      else openSidebar();
    }
    function onCloseClick(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    }
    function onOverlayClick(e: Event) {
      e.preventDefault();
      closeSidebar();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && sidebar && sidebar.className.indexOf("active") !== -1) closeSidebar();
    }

    hamburger?.addEventListener("click", onHamburgerClick);
    closeBtn?.addEventListener("click", onCloseClick);
    overlay?.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKey);

    const sidebarLinks = document.querySelectorAll(".sidebar-link");
    const sidebarLinkHandlers: Array<{ el: Element; handler: () => void }> = [];
    sidebarLinks.forEach((link) => {
      const handler = () => setTimeout(closeSidebar, 100);
      link.addEventListener("click", handler);
      sidebarLinkHandlers.push({ el: link, handler });
    });

    // Form submit "fake" (parity with static HTML; real wire-up is a future sprint).
    const formBtn = document.getElementById("formSubmit");
    function onFormSubmit(this: HTMLElement) {
      this.textContent = "Sending...";
      this.style.opacity = ".6";
      setTimeout(() => {
        const content = document.getElementById("formContent");
        const success = document.getElementById("successMsg");
        if (content) content.style.display = "none";
        if (success) success.className = "success-msg show";
      }, 1200);
    }
    formBtn?.addEventListener("click", onFormSubmit);

    // Nav padding shrink on scroll.
    function onScrollNav() {
      const n = document.querySelector("nav");
      if (!n) return;
      if (window.innerWidth > 900) {
        (n as HTMLElement).style.padding = window.scrollY > 80 ? "14px 48px" : "16px 48px";
      } else {
        (n as HTMLElement).style.padding = window.scrollY > 80 ? "10px 20px" : "12px 20px";
      }
    }
    window.addEventListener("scroll", onScrollNav);

    // Scroll-to-top button.
    const scrollTopBtn = document.getElementById("scrollTopBtn");
    function onScrollTopVisibility() {
      if (!scrollTopBtn) return;
      if (window.scrollY > 400) scrollTopBtn.classList.add("visible");
      else scrollTopBtn.classList.remove("visible");
    }
    function onScrollTopClick() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("scroll", onScrollTopVisibility, { passive: true });
    scrollTopBtn?.addEventListener("click", onScrollTopClick);

    // Email anti-scrape — assemble at runtime, no static MAILTO in HTML.
    const ea = document.getElementById("emailAddr");
    if (ea) ea.textContent = "inf" + "o@erp" + "ai.io";

    // Sprint F.10 — fade-in observer (port of /public/landing-fadein.js).
    // Without this, .fade-in elements render normally (no scroll-triggered
    // animation), which would be a subtle feature regression vs the static
    // HTML. IntersectionObserver fallback: if unsupported, .fade-in stays
    // visible (CSS has no opacity:0 base for .fade-in, so default state is
    // already visible — animation is enrichment, not gating).
    let fadeObserver: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      fadeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("visible");
              fadeObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
      );
      document.querySelectorAll(".fade-in").forEach((el) => fadeObserver?.observe(el));
    }

    return () => {
      hamburger?.removeEventListener("click", onHamburgerClick);
      closeBtn?.removeEventListener("click", onCloseClick);
      overlay?.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKey);
      sidebarLinkHandlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
      formBtn?.removeEventListener("click", onFormSubmit);
      window.removeEventListener("scroll", onScrollNav);
      window.removeEventListener("scroll", onScrollTopVisibility);
      scrollTopBtn?.removeEventListener("click", onScrollTopClick);
      fadeObserver?.disconnect();
    };
  }, []);

  return null;
}
