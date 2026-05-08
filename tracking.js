/* =========================================================
   RAWABAT ClientFlow — tracking.js
   Meta Pixel + GA4 + Advanced WhatsApp Conversion Tracking
   Version: 12
========================================================= */

(function () {
  const TRACKING_CONFIG = {
    pixelId: "910167190291826",
    ga4Id: "G-PMQECRC15N",
    debug: true,

    sessionStorageKey: "rawabat_session_id",
    utmStorageKey: "rawabat_utm_data",
    eventStorageKey: "rawabat_event_log",

    // يمنع تكرار نفس الحدث بسبب تعدد listeners أو double click
    dedupeWindowMs: 1200,

    // أسماء الفانل
    funnelName: "clientflow_restaurants"
  };

  const state = {
    pixelLoaded: false,
    ga4Loaded: false,
    pageViewSent: false,
    initialized: false,
    recentEvents: new Map()
  };

  function log(name, data = {}) {
    if (TRACKING_CONFIG.debug) {
      console.log("[Rawabat Tracking]", name, data);
    }
  }

  function safeLocalStorageGet(key, fallback = "") {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function getSessionId() {
    let id = safeLocalStorageGet(TRACKING_CONFIG.sessionStorageKey);

    if (!id) {
      id = `rb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      safeLocalStorageSet(TRACKING_CONFIG.sessionStorageKey, id);
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
      stored = JSON.parse(
        safeLocalStorageGet(TRACKING_CONFIG.utmStorageKey, "{}")
      );
    } catch {
      stored = {};
    }

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

    safeLocalStorageSet(TRACKING_CONFIG.utmStorageKey, JSON.stringify(data));

    return data;
  }

  function getCookie(name) {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)")
    );

    return match ? decodeURIComponent(match[2]) : "";
  }

  function getEventId(eventName) {
    return `rb_${eventName}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  function getElementText(el) {
    return String(el?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function isWhatsAppHref(href = "") {
    const value = String(href || "").toLowerCase();

    return (
      value.includes("wa.me/") ||
      value.includes("api.whatsapp.com") ||
      value.includes("web.whatsapp.com") ||
      value.includes("whatsapp://")
    );
  }

  function getWhatsAppMessageFromHref(href = "") {
    try {
      const url = new URL(href, window.location.origin);
      const text = url.searchParams.get("text") || "";
      return decodeURIComponent(text).slice(0, 500);
    } catch {
      return "";
    }
  }

  function getWhatsAppPhoneFromHref(href = "") {
    try {
      const url = new URL(href, window.location.origin);

      if (url.hostname.includes("wa.me")) {
        return url.pathname.replace(/\D/g, "");
      }

      const phone = url.searchParams.get("phone") || "";
      return phone.replace(/\D/g, "");
    } catch {
      return "";
    }
  }

  function getClickPosition(el) {
    const rect = el.getBoundingClientRect();

    return {
      element_top: Math.round(rect.top + window.scrollY),
      element_visible_top: Math.round(rect.top),
      viewport_height: window.innerHeight,
      scroll_y: Math.round(window.scrollY)
    };
  }

  function getScrollPercent() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;

    return Math.max(
      0,
      Math.min(100, Math.round((window.scrollY / docHeight) * 100))
    );
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
      funnel: TRACKING_CONFIG.funnelName,
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

  function loadGA4() {
    if (!TRACKING_CONFIG.ga4Id) {
      log("GA4_NotConfigured", {
        reason: "missing_measurement_id"
      });

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
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      TRACKING_CONFIG.ga4Id;

    document.head.appendChild(script);

    gtag("js", new Date());

    gtag("config", TRACKING_CONFIG.ga4Id, {
      send_page_view: false,
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });

    state.ga4Loaded = true;

    log("GA4Loaded", {
      measurement_id: TRACKING_CONFIG.ga4Id
    });
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
  }

  function shouldDedupe(eventName, payload = {}) {
    const key = [
      eventName,
      payload.source || "",
      payload.href || "",
      payload.click_id || ""
    ].join("|");

    const now = Date.now();
    const last = state.recentEvents.get(key) || 0;

    if (now - last < TRACKING_CONFIG.dedupeWindowMs) {
      return true;
    }

    state.recentEvents.set(key, now);

    return false;
  }

  function saveEventLog(eventName, payload = {}) {
    try {
      const current = JSON.parse(
        safeLocalStorageGet(TRACKING_CONFIG.eventStorageKey, "[]")
      );

      current.push({
        eventName,
        payload,
        at: new Date().toISOString()
      });

      safeLocalStorageSet(
        TRACKING_CONFIG.eventStorageKey,
        JSON.stringify(current.slice(-80))
      );
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
      page_url: payload.page_url,
      page_title: payload.page_title,
      session_id: payload.session_id,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_content: payload.utm_content,
      utm_term: payload.utm_term,
      click_id: payload.click_id || "",
      lead_type: payload.lead_type || "",
      contact_type: payload.contact_type || "",
      value: payload.value || 0
    });
  }

  function trackStandard(eventName, extra = {}) {
    const eventID = extra.event_id || getEventId(eventName);

    const payload = basePayload({
      event_id: eventID,
      ...extra
    });

    if (shouldDedupe(eventName, payload)) {
      log("Deduped_" + eventName, payload);
      return payload;
    }

    if (hasPixel()) {
      fbq("track", eventName, payload, {
        eventID
      });
    }

    trackGA4(eventName, payload);
    saveEventLog(eventName, payload);
    log(eventName, payload);

    return payload;
  }

  function trackCustom(eventName, extra = {}) {
    const eventID = extra.event_id || getEventId(eventName);

    const payload = basePayload({
      event_id: eventID,
      ...extra
    });

    if (shouldDedupe(eventName, payload)) {
      log("Deduped_" + eventName, payload);
      return payload;
    }

    if (hasPixel()) {
      fbq("trackCustom", eventName, payload, {
        eventID
      });
    }

    trackGA4(eventName, payload);
    saveEventLog(eventName, payload);
    log(eventName, payload);

    return payload;
  }

  function trackInitialPageView() {
    if (state.pageViewSent) return;

    const eventID = getEventId("PageView");

    const payload = basePayload({
      event_id: eventID
    });

    if (hasPixel()) {
      fbq("track", "PageView", payload, {
        eventID
      });
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

  function buildClickPayload(el, source, href, extra = {}) {
    return {
      source,
      href,
      element_text: getElementText(el),
      element_id: el.id || "",
      element_classes: String(el.className || "").slice(0, 180),
      scroll_percent: getScrollPercent(),
      ...getClickPosition(el),
      ...extra
    };
  }

  function trackWhatsAppClick(el, source, href) {
    const clickId = `wa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const message = getWhatsAppMessageFromHref(href);
    const phone = getWhatsAppPhoneFromHref(href);

    safeLocalStorageSet("rawabat_last_whatsapp_click_id", clickId);
    safeLocalStorageSet("rawabat_last_whatsapp_source", source);
    safeLocalStorageSet("rawabat_last_whatsapp_href", href);
    safeLocalStorageSet("rawabat_last_whatsapp_at", new Date().toISOString());

    const payload = buildClickPayload(el, source, href, {
      click_id: clickId,
      destination: "whatsapp",
      channel: "whatsapp",
      intent: "demo_request",
      lead_type: "whatsapp_demo_request",
      contact_type: "whatsapp_click",
      funnel_step: "cta_to_whatsapp",
      whatsapp_phone: phone,
      whatsapp_message: message,
      value: 1
    });

    // Standard Meta events
    trackStandard("Lead", payload);
    trackStandard("Contact", payload);

    // مفيد كإشارة قوية للـ Pixel حتى لو Meta لم يحسب Messaging Started
    trackStandard("InitiateCheckout", {
      ...payload,
      checkout_type: "whatsapp_demo_request"
    });

    // Custom events للقراءة والتحسين داخل Events Manager
    trackCustom("whatsapp_click", payload);
    trackCustom("QualifiedLead", payload);
    trackCustom("whatsapp_demo_request", payload);

    return payload;
  }

  function trackRegularLeadClick(el, source, href) {
    const payload = buildClickPayload(el, source, href, {
      lead_type: "cta_click"
    });

    trackStandard("Lead", payload);
    trackCustom("cta_click", payload);

    return payload;
  }

  function trackContactClick(el, source, href) {
    const isWhatsApp = isWhatsAppHref(href);

    if (isWhatsApp) {
      return trackWhatsAppClick(el, source, href);
    }

    const payload = buildClickPayload(el, source, href, {
      contact_type: "cta_click"
    });

    trackStandard("Contact", payload);
    trackCustom("form_start", payload);

    return payload;
  }

  function initClickTracking() {
    document.querySelectorAll("[data-track-lead]").forEach((el) => {
      el.addEventListener(
        "click",
        function () {
          const source = el.dataset.trackLead || "unknown_lead_click";
          const href = el.getAttribute("href") || "";

          if (isWhatsAppHref(href)) {
            trackWhatsAppClick(el, source, href);
            return;
          }

          trackRegularLeadClick(el, source, href);
        },
        {
          capture: true
        }
      );
    });

    document.querySelectorAll("[data-track-contact]").forEach((el) => {
      el.addEventListener(
        "click",
        function () {
          const source = el.dataset.trackContact || "unknown_contact_click";
          const href = el.getAttribute("href") || "";

          trackContactClick(el, source, href);
        },
        {
          capture: true
        }
      );
    });

    document.querySelectorAll("a[href^='mailto:']").forEach((el) => {
      el.addEventListener("click", function () {
        trackCustom("email_click", {
          source: "email_link",
          href: el.href,
          element_text: getElementText(el)
        });
      });
    });

    // احتياط: أي رابط واتساب لا يحمل data-track-lead أو data-track-contact
    document.querySelectorAll("a[href]").forEach((el) => {
      const href = el.getAttribute("href") || "";
      const hasManualTracking =
        el.hasAttribute("data-track-lead") ||
        el.hasAttribute("data-track-contact");

      if (!isWhatsAppHref(href) || hasManualTracking) return;

      el.addEventListener(
        "click",
        function () {
          trackWhatsAppClick(el, "auto_whatsapp_link", href);
        },
        {
          capture: true
        }
      );
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
            contact_type: "form_focus",
            funnel_step: "form_start"
          });

          trackCustom("form_started", {
            source: "smart_form",
            funnel_step: "form_start"
          });
        },
        {
          once: true
        }
      );
    });

    form.addEventListener("submit", function () {
      const data = new FormData(form);

      const payload = {
        source: "smart_form_submit",
        lead_type: "form_submit",
        funnel_step: "form_submit_to_whatsapp",
        location: data.get("location") || "",
        branches: data.get("branches") || "",
        messages: data.get("messages") || "",
        package: data.get("package") || "",
        value: 1
      };

      trackStandard("Lead", payload);
      trackStandard("Contact", {
        ...payload,
        contact_type: "form_submit"
      });

      trackCustom("qualified_lead", payload);
      trackCustom("QualifiedLead", payload);
    });
  }

  function initScrollTracking() {
    const marks = [25, 50, 75, 90];
    const sent = new Set();

    window.addEventListener(
      "scroll",
      function () {
        const percent = getScrollPercent();

        marks.forEach((mark) => {
          if (percent >= mark && !sent.has(mark)) {
            sent.add(mark);

            trackCustom("scroll_depth", {
              depth: mark
            });
          }
        });
      },
      {
        passive: true
      }
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

    const payload = {
      ...detail
    };

    delete payload.name;
    delete payload.type;
    delete payload.event_name;

    // لو main.js فتح واتساب عن طريق openTrackedWhatsApp
    if (
      name === "WhatsAppClick" ||
      eventName === "WhatsAppClick" ||
      payload.lead_type === "whatsapp_click"
    ) {
      const virtualEl = {
        id: "",
        className: "js-open-tracked-whatsapp",
        textContent: payload.source || "open_tracked_whatsapp",
        getBoundingClientRect: function () {
          return {
            top: 0,
            left: 0,
            width: 0,
            height: 0
          };
        }
      };

      const source = payload.source || "open_tracked_whatsapp";
      const href = payload.href || "";

      const waPayload = {
        ...payload,
        source,
        href,
        destination: "whatsapp",
        channel: "whatsapp",
        intent: "demo_request",
        lead_type: "whatsapp_demo_request",
        contact_type: "whatsapp_click",
        funnel_step: payload.funnel_step || "js_to_whatsapp",
        value: 1
      };

      trackStandard("Lead", waPayload);
      trackStandard("Contact", waPayload);
      trackStandard("InitiateCheckout", waPayload);
      trackCustom("whatsapp_click", waPayload);
      trackCustom("QualifiedLead", waPayload);
      trackCustom("whatsapp_demo_request", waPayload);

      return;
    }

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

    log("TrackingInitialized", {
      pixel_id: TRACKING_CONFIG.pixelId,
      ga4_id: TRACKING_CONFIG.ga4Id,
      market: getMarket(),
      page_type: getPageType()
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();

  window.RawabatTracking = {
    trackStandard,
    trackCustom,
    trackWhatsAppClick,
    basePayload,
    getMarket,
    getPageType,
    getUTMs
  };
})();
