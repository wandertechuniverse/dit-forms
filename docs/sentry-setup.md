# Sentry Integration Guide

## Backend (FastAPI) - Already Implemented

Sentry is initialized in `app/main.py` when `SENTRY_DSN` is set in `.env`.

### Setup
1. Create account at [sentry.io](https://sentry.io)
2. Create a FastAPI project
3. Copy the DSN to `.env`:
   ```
   SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
   ENVIRONMENT=production
   GIT_SHA=<commit-sha>
   ```

## Frontend (Vanilla JS)

Add this script tag to `<head>` in all HTML pages:

```html
<script src="https://browser.sentry-sdk.com/7.119.0/bundle.min.js" crossorigin="anonymous"></script>
<script>
  if (window.location.hostname !== 'localhost') {
    Sentry.init({
      dsn: 'YOUR_FRONTEND_DSN',
      environment: window.location.hostname.includes('vercel') ? 'production' : 'staging',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  }
</script>
```

## Validation Checklist

- [ ] Backend: Trigger `raise Exception("Sentry test")` → appears in dashboard
- [ ] Frontend: Add `<button onclick="undefinedVar()">Test</button>` → error captured
- [ ] Source maps resolve correctly (if using build step)
- [ ] Email/Slack alerts configured for critical errors
- [ ] `SENTRY_DSN` added to production environment variables

## Alert Rules (Recommended)

| Rule | Threshold | Action |
|------|-----------|--------|
| Error spike | >5 errors/min | Email + Slack |
| High latency | >2s p95 | Email warning |
| New issue | Any | Email notification |
| Crash rate | >1% of sessions | Critical alert |
