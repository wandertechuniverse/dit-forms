// Sentry initialization for vanilla JS frontend
// Include this script after api.js in all HTML pages
(function() {
  const SENTRY_DSN = ''; // Add your frontend DSN here
  const isProd = window.location.hostname !== 'localhost';

  if (isProd && SENTRY_DSN && typeof Sentry !== 'undefined') {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: window.location.hostname.includes('vercel') ? 'production' : 'staging',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Don't send auth-related errors
        if (event.message && event.message.includes('Session expired')) return null;
        // Don't send CORS/network errors
        if (event.exception && event.exception.values) {
          const type = event.exception.values[0]?.type;
          if (type === 'TypeError' && event.exception.values[0]?.value?.includes('fetch')) return null;
        }
        return event;
      }
    });
  }

  // Global error handler for unhandled errors
  window.addEventListener('error', function(e) {
    console.error('[Error]', e.message, e.filename, e.lineno);
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(e.error || new Error(e.message));
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(e) {
    console.error('[Unhandled Promise]', e.reason);
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
    }
  });
})();
