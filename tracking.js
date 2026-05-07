(function () {
  const PIXEL_ID = "910167190291826";

  function getMarket() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("riyadh")) return "riyadh";
    if (path.includes("jeddah")) return "jeddah";
    if (path.includes("saudi")) return "saudi";

    return "global";
  }

  function getUTMs() {
    const params = new URLSearchParams(window.location.search);

    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || "",
    };
  }

  function basePayload(extra = {}) {
    return {
      market: getMarket(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      ...getUTMs(),
      ...extra,
    };
  }

  function loadMetaPixel() {
    if (window.fbq) return;

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;

      n = f.fbq = function () {
        n.callMethod
          ? n.callMethod.apply(n, arguments)
          : n.queue.push(arguments);
      };

      if (!f._fbq) f._fbq = n;

      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];

      t = b.createElement(e);
      t.async = true;
      t.src = v;

      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      "script",
      "https://connect.facebook.net/en_US/fbevents.js"
    );

    fbq("init", PIXEL_ID);
    fbq("track", "PageView", basePayload());
    fbq("trackCustom", "MarketPageView", basePayload());
  }

  function trackStandard(eventName, extra = {}) {
    if (typeof fbq === "function") {
      fbq("track", eventName, basePayload(extra));
    }
  }

  function trackCustom(eventName, extra = {}) {
    if (typeof fbq === "function") {
      fbq("trackCustom", eventName, basePayload(extra));
    }
  }

  function initWhatsAppTracking() {
    document.querySelectorAll("[data-track-lead]").forEach((el) => {
      el.addEventListener("click", function () {
        const source = el.dataset.trackLead || "unknown_lead_click";

        trackStandard("Lead", {
          source,
          lead_type: "whatsapp_click",
        });

        trackCustom("whatsapp_click", {
          source,
        });
      });
    });
  }

  function initContactTracking() {
    document.querySelectorAll("[data-track-contact]").forEach((el) => {
      el.addEventListener("click", function () {
        const source = el.dataset.trackContact || "unknown_contact_click";

        trackStandard("Contact", {
          source,
          contact_type: "form_or_cta_click",
        });

        trackCustom("form_start", {
          source,
        });
      });
    });
  }

  function initFormTracking() {
    const form = document.getElementById("smartLeadForm");

    if (!form) return;

    const fields = form.querySelectorAll("input, select, textarea");

    fields.forEach((field) => {
      field.addEventListener(
        "focus",
        function () {
          if (form.dataset.started === "true") return;

          form.dataset.started = "true";

          trackCustom("form_started", {
            source: "smart_form",
          });
        },
        { once: true }
      );
    });

    form.addEventListener("submit", function () {
      const data = new FormData(form);

      trackStandard("Lead", {
        source: "smart_form_submit",
        lead_type: "qualified_form_submit",
        restaurant: data.get("restaurant") || "",
        location: data.get("location") || "",
        branches: data.get("branches") || "",
        messages: data.get("messages") || "",
        package: data.get("package") || "",
      });

      trackCustom("qualified_lead", {
        source: "smart_form",
        restaurant: data.get("restaurant") || "",
        location: data.get("location") || "",
        branches: data.get("branches") || "",
        messages: data.get("messages") || "",
        package: data.get("package") || "",
      });
    });
  }

  function initScrollTracking() {
    let tracked25 = false;
    let tracked50 = false;
    let tracked75 = false;
    let tracked90 = false;

    window.addEventListener(
      "scroll",
      function () {
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;

        if (docHeight <= 0) return;

        const percent = Math.round((window.scrollY / docHeight) * 100);

        if (percent >= 25 && !tracked25) {
          tracked25 = true;
          trackCustom("ScrollDepth", { depth: 25 });
        }

        if (percent >= 50 && !tracked50) {
          tracked50 = true;
          trackCustom("ScrollDepth", { depth: 50 });
        }

        if (percent >= 75 && !tracked75) {
          tracked75 = true;
          trackCustom("ScrollDepth", { depth: 75 });
        }

        if (percent >= 90 && !tracked90) {
          tracked90 = true;
          trackCustom("ScrollDepth", { depth: 90 });
        }
      },
      { passive: true }
    );
  }

  function initFAQTracking() {
    document.querySelectorAll("details").forEach((item) => {
      item.addEventListener("toggle", function () {
        if (!item.open) return;

        const question = item.querySelector("summary")?.innerText || "";

        trackCustom("FAQOpened", {
          question,
        });
      });
    });
  }

  function initOutboundTracking() {
    document.querySelectorAll("a[href^='mailto:']").forEach((el) => {
      el.addEventListener("click", function () {
        trackCustom("email_click", {
          source: el.href,
        });
      });
    });
  }

  function init() {
    loadMetaPixel();
    initWhatsAppTracking();
    initContactTracking();
    initFormTracking();
    initScrollTracking();
    initFAQTracking();
    initOutboundTracking();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
