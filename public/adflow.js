// public/adflow.js
(function (window, document) {
  "use strict";

  var PIXEL_ID = window.__ADFLOW_PIXEL_ID;
  var ENDPOINT = (window.__ADFLOW_ENDPOINT || "https://app.adflow.com.br") + "/api/pixel/" + PIXEL_ID;

  // Consent state: 'granted' | 'denied' | 'unknown'
  // 'unknown' = aguardando CMP — eventos ficam na fila
  var _consentState = 'unknown';
  var _consentResolved = false;
  var _queue = []; // { eventType, properties } — drenado após consent update

  // ── Session ID (só usado quando consentimento granted) ──────────────────────
  function getSessionId() {
    if (_consentState === 'denied') return null;
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

  function clearSessionId() {
    try { localStorage.removeItem("_adflow_sid"); } catch (_) {}
  }

  // ── Mapeamento GCM v2 → consentState ───────────────────────────────────────
  function gcmSignalsToState(signals) {
    if (!signals || typeof signals !== 'object') return 'unknown';
    if (signals.analytics_storage === 'granted') return 'granted';
    if (signals.analytics_storage === 'denied') return 'denied';
    return 'unknown';
  }

  // ── Build payload ───────────────────────────────────────────────────────────
  function buildPayload(eventType, properties) {
    var denied = _consentState === 'denied';
    var payload = {
      event_type:    eventType,
      consent_state: _consentState,
      // PII omitida quando denied
      url:        denied ? (window.location.origin || null) : window.location.href,
      referrer:   denied ? null : (document.referrer || null),
      session_id: denied ? null : getSessionId(),
    };
    if (!denied && properties && typeof properties === "object") {
      if (properties.event_name) payload.event_name = properties.event_name;
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
      var extra = {};
      var reserved = ["event_name", "value", "currency"];
      Object.keys(properties).forEach(function (k) {
        if (reserved.indexOf(k) === -1) extra[k] = properties[k];
      });
      if (Object.keys(extra).length > 0) payload.properties = extra;
    } else if (!denied && properties) {
      // valor/currency mesmo sem event_name
      if (properties.value != null) payload.value = properties.value;
      if (properties.currency) payload.currency = properties.currency;
    }
    return payload;
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  function send(eventType, properties) {
    if (!PIXEL_ID) {
      console.warn("[adflow] window.__ADFLOW_PIXEL_ID is not set.");
      return;
    }
    var payload = buildPayload(eventType, properties);
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(body);
    } catch (_) {}
  }

  // ── Drain queue ─────────────────────────────────────────────────────────────
  function drainQueue() {
    var items = _queue.splice(0);
    for (var i = 0; i < items.length; i++) {
      send(items[i].eventType, items[i].properties);
    }
  }

  // ── Consent command ─────────────────────────────────────────────────────────
  function handleConsent(subcommand, signals) {
    var newState = gcmSignalsToState(signals);
    if (subcommand === 'default') {
      if (_consentResolved) return; // default só tem efeito antes do update
      _consentState = newState;
      if (newState !== 'unknown') {
        _consentResolved = true;
        if (newState === 'denied') clearSessionId();
        drainQueue();
      }
    } else if (subcommand === 'update') {
      _consentState = newState;
      _consentResolved = true;
      if (newState === 'denied') clearSessionId();
      drainQueue();
    }
  }

  // ── Auto-fire page_view (queued se consent ainda unknown) ──────────────────
  if (_consentState === 'unknown') {
    _queue.push({ eventType: 'page_view', properties: undefined });
  } else {
    send('page_view');
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.adflow = function (command, arg1, arg2) {
    if (command === 'track') {
      var eventType = arg1;
      var properties = arg2;
      if (_consentState === 'unknown') {
        _queue.push({ eventType: eventType, properties: properties });
      } else {
        send(eventType, properties);
      }
    } else if (command === 'consent') {
      handleConsent(arg1, arg2); // arg1 = 'default'|'update', arg2 = signals
    }
  };

  // ── Integração AdOpt (CMP BR) ───────────────────────────────────────────────
  // Se o site usa AdOpt, o snippet de embed chama esta função após resolução
  window.__adflowConsentCallback = function (granted) {
    window.adflow('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage:        granted ? 'granted' : 'denied',
    });
  };

})(window, document);
