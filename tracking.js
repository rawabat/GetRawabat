/* =========================================================
   RAWABAT ClientFlow — tracking.js
   Meta Pixel + GA4 + Advanced Front-End Tracking
========================================================= */

(function () {
  const TRACKING_CONFIG = {
    pixelId: "910167190291826",
    ga4Id: "G-PMQECRC15N",
    debug: true,
    sessionStorageKey: "rawabat_session_id",
    utmStorageKey: "rawabat_utm_data",
    eventStorageKey: "rawabat_event_log"
  };

  const state = {
    pixelLoaded: false,
    ga4Loaded: false,
    pageViewSent: false,
    initialized: false
  };

  function log(name, data = {}) {
    if (TRACKING_CONFIG.debug) {
      console.log("[Rawabat Tracking]", name, data);
    }
  }

  function getSessionId() {
    let id = localStorage.getItem(TRACKING_CONFIG.sessionStorageKey);
    if (!id) {
      id = `rb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(TRACKING_CONFIG.sessionStorageKey, id);
    }
    return id;
  }

  function getMarket() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("riyadh")) return "riyadh";
    if (path.includes("jeddah")) return "jeddah";
    if (path.includes("saudi")) return "saudi";
    return "global";
  }

  function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path === "/" || path === "/index.html") return "homepage";
    if (path.includes("riyadh")) return "local_riyadh";
    if (path.includes("jeddah")) return "local_jeddah";
    if (path.includes("saudi")) return "country_saudi";
    return "landing_page";
  }

  function getUTMs() {
    const params = new URLSearchParams(window.location.search);

    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(TRACKING_CONFIG.utmStorageKey) || "{}");
    } catch {}

    const data = {
      utm_source: params.get("utm_source") || stored.utm_source || "direct",
      utm_medium: params.get("utm_medium") || stored.utm_medium || "none",
      utm_campaign: params.get("utm_campaign") || stored.utm_campaign || "none",
      utm_content: params.get("utm_content") || stored.utm_content || "none",
      utm_term: params.get("utm_term") || stored.utm_term || "none",
      fbclid: params.get("fbclid") || stored.fbclid || "",
      gclid: params.get("gclid") || stored.gclid || "",
      referrer: document.referrer || stored.referrer || "direct",
      landing_page: stored.landing_page || window.location.href
    };

    localStorage.setItem(TRACKING_CONFIG.utmStorageKey, JSON.stringify(data));
    return data;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : "";
  }

  function getEventId(eventName) {
    return `rb_${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function basePayload(extra = {}) {
    return {
      market: getMarket(),
      page_type: getPageType(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      session_id: getSessionId(),
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      ...getUTMs(),
      ...extra
    };
  }

  function hasPixel() {
    return typeof window.fbq === "function";
  }

  function hasGA4() {
    return typeof window.gtag === "function";
  }

  function loadMetaPixel() {
    if (hasPixel()) {
      state.pixelLoaded = true;
      return;
    }

    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
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
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    state.pixelLoaded = true;
  }

  function loadGA4() {
    if (!TRACKING_CONFIG.ga4Id || TRACKING_CONFIG.ga4Id === "G-PMQECRC15N") {
      log("GA4_NotConfigured", { reason: "missing_measurement_id" });
      return;
    }

    if (hasGA4()) {
      state.ga4Loaded = true;
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${TRACKING_CONFIG.ga4Id}`;
    document.head.appendChild(script);

    gtag("js", new Date());
    gtag("config", TRACKING_CONFIG.ga4Id, {
      send_page_view: false
    });

    state.ga4Loaded = true;
  }

  function initPixel() {
    loadMetaPixel();

    if (!hasPixel()) {
      log("PixelBlockedOrUnavailable", { reason: "fbq_not_available" });
      return;
    }

    fbq("init", TRACKING_CONFIG.pixelId);
  }

  function saveEventLog(eventName, payload = {}) {
    try {
      const current = JSON.parse(localStorage.getItem(TRACKING_CONFIG.eventStorageKey) || "[]");
      current.push({
        eventName,
        payload,
        at: new Date().toISOString()
      });
      localStorage.setItem(TRACKING_CONFIG.eventStorageKey, JSON.stringify(current.slice(-50)));
    } catch {}
  }

  function trackGA4(eventName, payload = {}) {
    if (!hasGA4()) return;

    gtag("event", eventName, {
      event_category: "clientflow_restaurants",
      event_label: payload.source || payload.page_type || "unknown",
      market: payload.market,
      page_type: payload.page_type,
      page_path: payload.page_path,
      session_id: payload.session_id,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      value: payload.value || 0
    });
  }

  function trackStandard(eventName, extra = {}) {
    const eventID = getEventId(eventName);
    const payload = basePayload({
      event_id: eventID,
      funnel: "clientflow_restaurants",
      ...extra
    });

    if (hasPixel()) {
      fbq("track", eventName, payload, { eventID });
    }

    trackGA4(eventName, payload);
    saveEventLog(eventName, payload);
    log(eventName, payload);
  }

  function trackCustom(eventName, extra = {}) {
    const eventID = getEventId(eventName);
    const payload = basePayload({
      event_id: eventID,
      funnel: "clientflow_restaurants",
      ...extra
    });

    if (hasPixel()) {
      fbq("trackCustom", eventName, payload, { eventID });
    }

    trackGA4(eventName, payload);
    saveEventLog(eventName, payload);
    log(eventName, payload);
  }

  function trackInitialPageView() {
    if (state.pageViewSent) return;

    const eventID = getEventId("PageView");
    const payload = basePayload({ event_id: eventID });

    if (hasPixel()) {
      fbq("track", "PageView", payload, { eventID });
    }

    if (hasGA4()) {
      gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        market: getMarket(),
        page_type: getPageType(),
        session_id: getSessionId()
      });
    }

    state.pageViewSent = true;
    saveEventLog("PageView", payload);
    log("PageView", payload);

    trackCustom("MarketPageView", {
      market: getMarket(),
      page_type: getPageType()
    });
  }

  function initClickTracking() {
    document.querySelectorAll("[data-track-lead]").forEach((el) => {
      el.addEventListener("click", function () {
        const source = el.dataset.trackLead || "unknown_lead_click";
        const href = el.getAttribute("href") || "";

        trackStandard("Lead", {
          source,
          lead_type: "cta_click",
          href
        });

        trackCustom("whatsapp_click", {
          source,
          href
        });
      });
    });

    document.querySelectorAll("[data-track-contact]").forEach((el) => {
      el.addEventListener("click", function () {
        const source = el.dataset.trackContact || "unknown_contact_click";
        const href = el.getAttribute("href") || "";

        trackStandard("Contact", {
          source,
          contact_type: "cta_click",
          href
        });

        trackCustom("form_start", {
          source,
          href
        });
      });
    });

    document.querySelectorAll("a[href^='mailto:']").forEach((el) => {
      el.addEventListener("click", function () {
        trackCustom("email_click", {
          source: el.href
        });
      });
    });
  }

  function initFormTracking() {
    const form = document.getElementById("smartLeadForm");
    if (!form) return;

    form.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener(
        "focus",
        function () {
          if (form.dataset.trackingStarted === "true") return;
          form.dataset.trackingStarted = "true";

          trackStandard("Contact", {
            source: "smart_form_started",
            contact_type: "form_focus"
          });

          trackCustom("form_started", {
            source: "smart_form"
          });
        },
        { once: true }
      );
    });

    form.addEventListener("submit", function () {
      trackStandard("Lead", {
        source: "smart_form_submit",
        lead_type: "form_submit"
      });

      trackCustom("qualified_lead", {
        source: "smart_form",
        value: 1
      });
    });
  }

  function initScrollTracking() {
    const marks = [25, 50, 75, 90];
    const sent = new Set();

    window.addEventListener(
      "scroll",
      function () {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;

        const percent = Math.round((scrollTop / docHeight) * 100);

        marks.forEach((mark) => {
          if (percent >= mark && !sent.has(mark)) {
            sent.add(mark);
            trackCustom("scroll_depth", {
              depth: mark
            });
          }
        });
      },
      { passive: true }
    );
  }

  function initVisibilityTracking() {
    let sent = false;

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && !sent) {
        sent = true;
        trackCustom("PageHidden", {
          time_on_page_ms: Math.round(performance.now())
        });
      }
    });
  }

  function initEngagedSessionTracking() {
    setTimeout(() => {
      trackCustom("EngagedSession", {
        time_on_page_seconds: 30
      });
    }, 30000);
  }

  function handleRawabatTrack(event) {
    const detail = event.detail || {};
    const name = detail.name || "CustomEvent";
    const type = detail.type || "custom";
    const eventName = detail.event_name || name;

    const payload = { ...detail };
    delete payload.name;
    delete payload.type;
    delete payload.event_name;

    if (type === "standard") {
      trackStandard(eventName, payload);
    } else {
      trackCustom(eventName, payload);
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    getUTMs();
    loadGA4();
    initPixel();
    trackInitialPageView();

    initClickTracking();
    initFormTracking();
    initScrollTracking();
    initVisibilityTracking();
    initEngagedSessionTracking();

    window.addEventListener("rawabat:track", handleRawabatTrack);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();

  window.RawabatTracking = {
    trackStandard,
    trackCustom,
    basePayload,
    getMarket,
    getUTMs
  };
})();
