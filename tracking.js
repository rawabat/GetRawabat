/* =========================================================
   RAWABAT ClientFlow — tracking.js
   Meta Pixel + Advanced Front-End Tracking
========================================================= */

(function () {
  const TRACKING_CONFIG = {
    pixelId: "910167190291826",
    debug: true,
    sessionStorageKey: "rawabat_session_id",
    utmStorageKey: "rawabat_utm_data",
    eventStorageKey: "rawabat_event_log"
  };

  const state = {
    pixelLoaded: false,
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

    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem(TRACKING_CONFIG.utmStorageKey) || "{}");
      } catch {
        return {};
      }
    })();

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

  function loadMetaPixel() {
    if (hasPixel()) {
      state.pixelLoaded = true;
      return;
    }

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

    state.pixelLoaded = true;
  }

  function initPixel() {
    loadMetaPixel();

    if (!hasPixel()) {
      log("PixelBlockedOrUnavailable", {
        reason: "fbq_not_available"
      });
      return;
    }

    fbq("init", TRACKING_CONFIG.pixelId);

    if (!state.pageViewSent) {
      const eventID = getEventId("PageView");

      fbq("track", "PageView", basePayload(), { eventID });

      state.pageViewSent = true;

      log("PageView", {
        eventID,
        ...basePayload()
      });
    }

    trackCustom("MarketPageView", {
      market: getMarket(),
      page_type: getPageType()
    });
  }

  function saveEventLog(eventName, payload = {}) {
    try {
      const current = JSON.parse(localStorage.getItem(TRACKING_CONFIG.eventStorageKey) || "[]");
      current.push({
        eventName,
        payload,
        at: new Date().toISOString()
      });

      localStorage.setItem(
        TRACKING_CONFIG.eventStorageKey,
        JSON.stringify(current.slice(-50))
      );
    } catch {}
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

    saveEventLog(eventName, payload);
    log(eventName, payload);
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

  function initFormStartedTracking() {
    const form = document.getElementById("smartLeadForm");
    if (!form) return;

    const fields = form.querySelectorAll("input, select, textarea");

    fields.forEach((field) => {
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
    let sent = false;

    setTimeout(() => {
      if (sent) return;
      sent = true;

      trackCustom("EngagedSession", {
        time_on_page_seconds: 30
      });
    }, 30000);
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    getUTMs();
    initPixel();
    initClickTracking();
    initFormStartedTracking();
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
