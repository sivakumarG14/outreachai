/**
 * OutreachAI Page Tracker
 * Embed on any page to track visits for a lead.
 * Usage: <script src="https://your-backend.com/tracker.js?tid=TRACKING_ID"></script>
 */
(function () {
  var params = new URLSearchParams(document.currentScript
    ? document.currentScript.src.split('?')[1]
    : window.location.search);
  var trackingId = params.get('tid');
  if (!trackingId) return;

  var sessionId = sessionStorage.getItem('outreachai_sid') || Math.random().toString(36).slice(2);
  sessionStorage.setItem('outreachai_sid', sessionId);

  var startTime = Date.now();
  var backendUrl = document.currentScript
    ? document.currentScript.src.split('/tracker.js')[0]
    : '';

  function sendVisit(timeSpent) {
    var payload = JSON.stringify({
      trackingId: trackingId,
      page: window.location.href,
      sessionId: sessionId,
      timeSpent: timeSpent || 0,
    });
    // Use sendBeacon for reliability on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(backendUrl + '/track/visit', new Blob([payload], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', backendUrl + '/track/visit', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    }
  }

  window.addEventListener('beforeunload', function () {
    sendVisit(Math.round((Date.now() - startTime) / 1000));
  });

  // Also send after 5s to capture quick visits
  setTimeout(function () {
    sendVisit(5);
  }, 5000);
})();
