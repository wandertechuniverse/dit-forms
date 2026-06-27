# Admin Troubleshooting Runbook

## DIT Forms — Production Operations

---

## Architecture Overview

| Component | URL | Hosting |
|---|---|---|
| Frontend | https://dit-tracker.vercel.app | Vercel (static) |
| Backend | https://dit-l200-api.onrender.com | Render (Docker) |
| Database | MongoDB Atlas | Cloud |
| File Storage | Cloudflare R2 | Cloud |
| CI/CD | GitHub Actions | Auto-deploy on push to `main` |

---

## Quick Health Check

```bash
# Backend health
curl https://dit-l200-api.onrender.com/health

# Expected response:
# {"status":"ok","app":"DIT Forms"}
```

---

## Common Issues & Fixes

### 1. Frontend shows "Network Error" or 404 on API calls

**Cause:** `VITE_API_BASE_URL` not set or wrong.

**Fix:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify `VITE_API_BASE_URL` = `https://dit-l200-api.onrender.com`
3. Trigger redeploy: Deployments → ⋯ → Redeploy

---

### 2. CORS errors in browser console

**Cause:** Backend doesn't allow requests from Vercel domain.

**Fix:**
1. Go to Render Dashboard → Environment
2. Set `CORS_ORIGINS` = `https://dit-tracker.vercel.app,http://localhost:3000`
3. Service auto-redeploys

---

### 3. Backend returning 500 errors

**Check logs:**
```bash
# On Render dashboard: Logs tab
# Or via CLI if you have access:
curl https://dit-l200-api.onrender.com/health
```

**Common causes:**
- MongoDB Atlas IP whitelist changed
- JWT secret mismatch
- Missing environment variables

**Fix:** Check Render environment variables match `.env.production.example`

---

### 4. PDF invoice download fails

**Cause:** `reportlab` not installed in backend image.

**Fix:**
1. Ensure `reportlab==4.2.2` is in `requirements.txt`
2. Push to `main` to trigger Docker rebuild
3. Verify: download a PDF from the live site

---

### 5. Students can't submit forms

**Check:**
1. Is the form published? (status = "published", not "draft")
2. Is the form type "handout_tracker"?
3. Does the student ID exist in the students collection?

**Fix:**
```bash
# Check form status via API
curl -H "Authorization: Bearer $TOKEN" \
  https://dit-l200-api.onrender.com/forms | python -m json.tool
```

---

### 6. Duplicate handout not being blocked

**Cause:** Form version or submission service has wrong status check.

**Verify:** In `submission_service.py`:
- `form_def.status != "published"` (not "active")
- `FormVersion.status == "published"` (not `isActive == True`)

---

### 7. PWA not installing on mobile

**Check:**
- HTTPS is working (Vercel provides this)
- `manifest.json` exists at `/manifest.json`
- Service worker registered (`/sw.js`)
- User visited the site at least twice

---

### 8. Render service sleeping (free tier)

**Symptom:** First request after idle takes 30+ seconds.

**Fix options:**
- Upgrade to paid tier (no sleep)
- Add a cron ping every 10 minutes:
  ```bash
  # Crontab on any server:
  */10 * * * * curl -s https://dit-l200-api.onrender.com/health > /dev/null
  ```

---

## Database Operations

### Backup MongoDB Atlas
```bash
# Via Atlas UI: Database → Backup → Take Snapshot
# Or mongodump:
mongodump "mongodb+srv://user:pass@cluster.mongodb.net/dit_forms" --out /backups/$(date +%Y%m%d)
```

### Restore from Backup
```bash
mongorestore "mongodb+srv://user:pass@cluster.mongodb.net/dit_forms" /backups/20260627/
```

### Run Migration Script
```bash
# After schema changes:
docker compose exec backend python app/scripts/migrate_version_status.py
```

### Seed Admin User
```bash
docker compose exec backend python app/scripts/seed_admin.py
```

---

## Deploy Operations

### Manual Deploy (after code push)
Vercel auto-deploys on push to `main`. For Render:
1. Push to `main`
2. Render auto-builds from `Dockerfile`
3. Health check passes → traffic routes to new container

### Rollback
```bash
# Vercel: Dashboard → Deployments → click ⋯ on previous → Promote to Production
# Render: Dashboard → Manual Deploy → redeploy previous image
```

### Force Redeploy
```bash
# Vercel: Dashboard → Deployments → ⋯ → Redeploy
# Render: Dashboard → Manual Deploy → Clear build cache & deploy
```

---

## User Management

### Create a Class Rep
1. Admin Dashboard → Class Reps
2. Enter email, password
3. Assign scope: programClassId + termId
4. Share login credentials

### Import Students
1. Go to Students page
2. Click "Import Student List"
3. Upload Excel file (.xlsx)
4. Columns: idNumber, fullName, programClassId, termId
5. System skips duplicates automatically

### Reset Admin Password
```python
# Run in Python shell with DB access:
from app.models.user import User
from app.core.security import hash_password
import asyncio

async def reset():
    user = await User.find_one(User.email == "admin@dit.edu")
    user.hashedPassword = hash_password("new_password_here")
    await user.save()

asyncio.run(reset())
```

---

## Monitoring Checklist

| Task | How | Frequency |
|---|---|---|
| Backend health | `curl /health` | Daily |
| Check for 500 errors | Render logs | Daily |
| Test PDF download | Download from live site | Weekly |
| Verify backups | Restore test | Monthly |
| Rotate JWT secret | Update env var | Quarterly |
| Check disk usage | Render dashboard | Monthly |
| Review CORS config | Browser console | After changes |

---

## Environment Variables Reference

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URI` | Render | MongoDB connection string |
| `JWT_SECRET` | Render | Token signing secret |
| `CORS_ORIGINS` | Render | Allowed frontend domains |
| `R2_ENDPOINT` | Render | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY` | Render | R2 API key |
| `R2_SECRET_KEY` | Render | R2 API secret |
| `VITE_API_BASE_URL` | Vercel | Backend API URL |

---

## Emergency Contacts

| Role | Contact |
|---|---|
| System Admin | admin@dit.edu |
| MongoDB Atlas | Atlas Dashboard → Support |
| Vercel | Vercel Dashboard → Support |
| Render | Render Dashboard → Support |

---

*Last updated: June 2026*
