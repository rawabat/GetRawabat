/* =========================================================
   RAWABAT ClientFlow — main.js
   UI + Form Logic Only
   No Meta Pixel / No fbq here
========================================================= */

const CONFIG = {
  whatsappNumber: "201000045140",
  storageKey: "rawabat_last_lead",
  utmStorageKey: "rawabat_utm_data",
  sessionStorageKey: "rawabat_session_id",
  debug: true,
  totalSteps: 4,
  requiredByStep: {
    1: ["name", "phone"],
    2: ["restaurant", "location"],
    3: [],
    4: []
  }
};

const state = {
  currentStep: 1,
  pricingViewed: false,
  formStarted: false,
  leadSubmitted: false,
  trackedSteps: new Set()
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function logEvent(name, data = {}) {
  if (CONFIG.debug) console.log("[Rawabat UI]", name, data);
}

function dispatchTrackingEvent(name, detail = {}) {
  window.dispatchEvent(
    new CustomEvent("rawabat:track", {
      detail: {
        name,
        ...detail
      }
    })
  );
}

function getSessionId() {
  let id = localStorage.getItem(CONFIG.sessionStorageKey);

  if (!id) {
    id = `rb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CONFIG.sessionStorageKey, id);
  }

  return id;
}

function getUtmData() {
  const params = new URLSearchParams(window.location.search);

  const data = {
    utm_source: params.get("utm_source") || localStorage.getItem("utm_source") || "direct",
    utm_medium: params.get("utm_medium") || localStorage.getItem("utm_medium") || "none",
    utm_campaign: params.get("utm_campaign") || localStorage.getItem("utm_campaign") || "none",
    utm_content: params.get("utm_content") || localStorage.getItem("utm_content") || "none",
    utm_term: params.get("utm_term") || localStorage.getItem("utm_term") || "none",
    fbclid: params.get("fbclid") || localStorage.getItem("fbclid") || "",
    landing_page: window.location.href,
    referrer: document.referrer || "direct",
    session_id: getSessionId()
  };

  Object.entries(data).forEach(([key, value]) => {
    if (value) localStorage.setItem(key, value);
  });

  localStorage.setItem(CONFIG.utmStorageKey, JSON.stringify(data));

  return data;
}

function getForm() {
  return $("#smartLeadForm");
}

function getData() {
  const form = getForm();
  return form ? Object.fromEntries(new FormData(form).entries()) : {};
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function getWhatsAppUrl(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function calculateLeadScore() {
  const data = getData();

  let score = 55;

  if (String(data.name || "").trim()) score += 8;
  if (normalizePhone(data.phone).length >= 8) score += 12;
  if (String(data.restaurant || "").trim()) score += 10;
  if (String(data.location || "").trim()) score += 8;
  if (data.messages && !String(data.messages).includes("أقل")) score += 7;
  if (data.menu_status && String(data.menu_status).includes("جاهز")) score += 5;
  if (data.branches && !String(data.branches).includes("فرع واحد")) score += 5;
  if (data.package && !String(data.package).includes("Starter")) score += 5;
  if (data.problem && String(data.problem).trim().length > 10) score += 8;

  return Math.min(score, 100);
}

function getLeadQuality(score = calculateLeadScore()) {
  if (score >= 85) return "hot";
  if (score >= 70) return "warm";
  return "cold";
}

function buildLeadSummary() {
  const data = getData();
  const utm = getUtmData();

  return [
    "مرحبًا، أريد تجربة ClientFlow لمطعمي",
    "",
    `الاسم: ${data.name || "-"}`,
    `واتساب العميل: ${data.phone || "-"}`,
    `اسم المطعم: ${data.restaurant || "-"}`,
    `الدولة/المدينة: ${data.location || "-"}`,
    `عدد الفروع: ${data.branches || "-"}`,
    `رسائل واتساب يوميًا: ${data.messages || "-"}`,
    `حالة المنيو: ${data.menu_status || "-"}`,
    `الباقة الأقرب: ${data.package || "-"}`,
    `المشكلة الحالية: ${data.problem || "-"}`,
    "",
    `Lead Score: ${calculateLeadScore()}%`,
    `Session ID: ${utm.session_id}`,
    `UTM Source: ${utm.utm_source}`,
    `UTM Medium: ${utm.utm_medium}`,
    `Campaign: ${utm.utm_campaign}`,
    `Page: ${utm.landing_page}`
  ].join("\n");
}

function setHiddenTracking() {
  const utm = getUtmData();

  const fields = {
    utm_source: utm.utm_source,
    utm_campaign: utm.utm_campaign,
    page_url: utm.landing_page
  };

  Object.entries(fields).forEach(([key, value]) => {
    const input = $("#" + key);
    if (input) input.value = value;
  });
}

function fieldWrapper(field) {
  return field ? field.closest(".form-field") : null;
}

function validateField(name) {
  const form = getForm();
  if (!form || !form.elements[name]) return true;

  const field = form.elements[name];
  const value = String(field.value || "").trim();

  let isValid = value.length >= 2;

  if (name === "phone") {
    isValid = normalizePhone(value).length >= 8;
  }

  const wrapper = fieldWrapper(field);
  if (wrapper) wrapper.classList.toggle("is-invalid", !isValid);

  field.setAttribute("aria-invalid", String(!isValid));

  return isValid;
}

function validateStep(step) {
  return (CONFIG.requiredByStep[step] || []).every(validateField);
}

function updateLeadScore() {
  const score = calculateLeadScore();
  const bar = $("#leadScoreBar");
  const text = $("#leadScoreText");

  if (bar) bar.style.width = score + "%";
  if (text) text.textContent = score + "%";

  dispatchTrackingEvent("LeadScoreUpdated", {
    type: "custom",
    score,
    lead_quality: getLeadQuality(score)
  });
}

function updateSmartProgress() {
  const progress = Math.round((state.currentStep / CONFIG.totalSteps) * 100);

  const progressBar = $("#smartProgressBar");
  const progressText = $("#smartProgressText");
  const stepLabel = $("#smartStepLabel");

  if (progressBar) progressBar.style.width = progress + "%";
  if (progressText) progressText.textContent = progress + "%";
  if (stepLabel) stepLabel.textContent = `الخطوة ${state.currentStep} من ${CONFIG.totalSteps}`;

  $$(".smart-step").forEach((step) => {
    step.classList.toggle("is-active", Number(step.dataset.step) === state.currentStep);
  });

  $$(".smart-step-pill").forEach((pill) => {
    pill.classList.toggle("is-active", Number(pill.dataset.stepPill) === state.currentStep);
  });

  const prevBtn = $("#prevStepBtn");
  const nextBtn = $("#nextStepBtn");
  const submitBtn = $("#submitSmartFormBtn");

  if (prevBtn) prevBtn.disabled = state.currentStep === 1;
  if (nextBtn) nextBtn.hidden = state.currentStep === CONFIG.totalSteps;
  if (submitBtn) submitBtn.hidden = state.currentStep !== CONFIG.totalSteps;
}

function trackFormStep(step) {
  if (state.trackedSteps.has(step)) return;

  state.trackedSteps.add(step);

  dispatchTrackingEvent("FormStep", {
    type: "custom",
    step,
    progress: Math.round((step / CONFIG.totalSteps) * 100),
    score: calculateLeadScore()
  });
}

function goStep(direction) {
  if (direction > 0 && !validateStep(state.currentStep)) {
    dispatchTrackingEvent("FormValidationError", {
      type: "custom",
      step: state.currentStep
    });

    return;
  }

  state.currentStep = Math.max(
    1,
    Math.min(CONFIG.totalSteps, state.currentStep + direction)
  );

  updateSmartProgress();
  updateLeadScore();
  trackFormStep(state.currentStep);
}

function showSuccess() {
  const success = $("#leadSuccess");
  if (success) success.classList.add("is-visible");
}

async function copyLeadSummary() {
  const text = buildLeadSummary();

  try {
    await navigator.clipboard.writeText(text);
    showSuccess();

    dispatchTrackingEvent("CopyLeadSummary", {
      type: "standard",
      event_name: "Contact",
      source: "copy_lead_summary",
      score: calculateLeadScore()
    });
  } catch (error) {
    alert(text);
  }
}

function openTrackedWhatsApp(message, extra = {}) {
  const clickId = `wa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const url = getWhatsAppUrl(message);

  try {
    localStorage.setItem("rawabat_last_whatsapp_click_id", clickId);
  } catch (error) {}

  dispatchTrackingEvent("WhatsAppClick", {
    type: "standard",
    event_name: "Lead",
    source: "open_tracked_whatsapp",
    click_id: clickId,
    lead_type: "whatsapp_click",
    score: calculateLeadScore(),
    ...extra
  });

  dispatchTrackingEvent("whatsapp_click", {
    type: "custom",
    source: "open_tracked_whatsapp",
    click_id: clickId,
    score: calculateLeadScore(),
    ...extra
  });

  window.open(url, "_blank", "noopener,noreferrer");
}

function submitSmartForm(event) {
  event.preventDefault();

  if (state.leadSubmitted) return;

  const isValid = [1, 2].every(validateStep);

  if (!isValid) {
    state.currentStep = 1;
    updateSmartProgress();

    dispatchTrackingEvent("SubmitBlocked", {
      type: "custom",
      reason: "required_fields_missing"
    });

    return;
  }

  state.leadSubmitted = true;

  const summary = buildLeadSummary();
  const score = calculateLeadScore();
  const data = getData();

  try {
    localStorage.setItem(CONFIG.storageKey, summary);
  } catch (error) {}

  showSuccess();

  dispatchTrackingEvent("QualifiedLead", {
    type: "standard",
    event_name: "Lead",
    source: "smart_form_submit",
    lead_type: "qualified_form_submit",
    score,
    lead_quality: getLeadQuality(score),
    package: data.package || "",
    messages: data.messages || "",
    branches: data.branches || "",
    location_present: Boolean(data.location)
  });

  dispatchTrackingEvent("qualified_lead", {
    type: "custom",
    source: "smart_form_submit",
    score,
    lead_quality: getLeadQuality(score),
    package: data.package || "",
    messages: data.messages || "",
    branches: data.branches || ""
  });

  openTrackedWhatsApp(summary, {
    source: "smart_form_submit",
    score,
    qualified: true
  });
}

function handleScroll() {
  const nav = $("#nav");
  if (nav) nav.classList.toggle("is-scrolled", window.scrollY > 40);

  const pricing = $("#pricing");

  if (
    pricing &&
    !state.pricingViewed &&
    pricing.getBoundingClientRect().top < window.innerHeight * 0.75
  ) {
    state.pricingViewed = true;

    dispatchTrackingEvent("PricingView", {
      type: "standard",
      event_name: "ViewContent",
      content_name: "pricing_view",
      intent: "high",
      section: "pricing",
      score: calculateLeadScore()
    });
  }
}

function initReveal() {
  const elements = $$(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("show"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((element) => observer.observe(element));
}

function initForm() {
  const form = getForm();
  if (!form) return;

  form.addEventListener("focusin", () => {
    if (!state.formStarted) {
      state.formStarted = true;

      dispatchTrackingEvent("FormStarted", {
        type: "custom",
        step: 1,
        score: calculateLeadScore()
      });

      trackFormStep(1);
    }
  });

  form.addEventListener("input", updateLeadScore);
  form.addEventListener("change", updateLeadScore);
  form.addEventListener("submit", submitSmartForm);

  ["name", "phone", "restaurant", "location"].forEach((name) => {
    form.elements[name]?.addEventListener("blur", () => validateField(name));
  });

  $("#nextStepBtn")?.addEventListener("click", () => goStep(1));
  $("#prevStepBtn")?.addEventListener("click", () => goStep(-1));
  $("#copyLeadSummaryBtn")?.addEventListener("click", copyLeadSummary);
}

function initScrollDepthTracking() {
  let tracked25 = false;
  let tracked50 = false;
  let tracked75 = false;
  let tracked90 = false;

  function handleDepth() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const percent = Math.round((window.scrollY / docHeight) * 100);

    if (percent >= 25 && !tracked25) {
      tracked25 = true;
      dispatchTrackingEvent("ScrollDepth", { type: "custom", depth: 25 });
    }

    if (percent >= 50 && !tracked50) {
      tracked50 = true;
      dispatchTrackingEvent("ScrollDepth", { type: "custom", depth: 50 });
    }

    if (percent >= 75 && !tracked75) {
      tracked75 = true;
      dispatchTrackingEvent("ScrollDepth", { type: "custom", depth: 75 });
    }

    if (percent >= 90 && !tracked90) {
      tracked90 = true;
      dispatchTrackingEvent("ScrollDepth", { type: "custom", depth: 90 });
    }
  }

  window.addEventListener("scroll", handleDepth, { passive: true });
}

function initFAQTracking() {
  $$("details").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;

      const question = item.querySelector("summary")?.textContent || "";

      dispatchTrackingEvent("FAQOpened", {
        type: "custom",
        question
      });
    });
  });
}

function initStickyCTA() {
  const sticky = $(".sticky-cta");
  if (!sticky) return;

  window.addEventListener(
    "scroll",
    () => {
      const current = window.scrollY;

      if (current > 300) {
        sticky.style.transform = "translateY(0)";
        sticky.style.opacity = "1";
      }

      if (current < 120) {
        sticky.style.transform = "translateY(120%)";
        sticky.style.opacity = "0";
      }
    },
    { passive: true }
  );
}

function initPerformanceTracking() {
  window.addEventListener("load", () => {
    dispatchTrackingEvent("PagePerformance", {
      type: "custom",
      load_time_ms: Math.round(performance.now())
    });
  });
}

function initPageUX() {
  dispatchTrackingEvent("LandingPageViewed", {
    type: "standard",
    event_name: "ViewContent",
    content_name: "landing_view",
    funnel_step: "landing"
  });
}

function init() {
  getUtmData();
  setHiddenTracking();
  initForm();
  initReveal();
  updateSmartProgress();
  updateLeadScore();
  handleScroll();
  initScrollDepthTracking();
  initFAQTracking();
  initStickyCTA();
  initPerformanceTracking();
  initPageUX();

  window.addEventListener("scroll", handleScroll, { passive: true });
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();
