(function (window, document) {
  "use strict";

  var PIXEL_ID = window.__ADFLOW_PIXEL_ID;
  var ENDPOINT = (window.__ADFLOW_ENDPOINT || "https://app.adflow.com.br") + "/api/pixel/" + PIXEL_ID;

  // Anonymous session ID persisted in localStorage
  function getSessionId() {
    try {
      var key = "_adflow_sid";
      var sid = localStorage.getItem(key);
      if (!sid) {
        sid = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, sid);
      }
      return sid;
    } catch (_) {
      return null;
    }
  }

  function buildPayload(eventType, properties) {
    var payload = {
      event_type: eventType,
      url: window.location.href,
      referrer: document.referrer || null,
      session_id: getSessionId(),
    };
    if (properties && typeof properties === "object") {
      if (properties.event_name) payload.event_name = properties.event_name;
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
      // remaining keys go to `properties`
      var extra = {};
      var reserved = ["event_name", "value", "currency"];
      Object.keys(properties).forEach(function (k) {
        if (reserved.indexOf(k) === -1) extra[k] = properties[k];
      });
      if (Object.keys(extra).length > 0) payload.properties = extra;
    }
    return payload;
  }

  function send(eventType, properties) {
    if (!PIXEL_ID) {
      console.warn("[adflow] window.__ADFLOW_PIXEL_ID is not set.");
      return;
    }
    var payload = buildPayload(eventType, properties);
    var body = JSON.stringify(payload);

    // Primary: sendBeacon (non-blocking, survives page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    // Fallback: async XHR
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(body);
    } catch (_) {
      // Silent fail — tracking should never break the page
    }
  }

  // Auto-fire page_view
  send("page_view");

  // Public API: adflow("track", "purchase", { value: 99, currency: "BRL" })
  window.adflow = function (command, eventType, properties) {
    if (command === "track") {
      send(eventType, properties);
    }
  };
})(window, document);