# Admin Troubleshooting Runbook
**DIT Tracker Production Environment | Emergency Response Guide**

## 1. System Health Checks

```bash
# Check all services running
cd /opt/dit-forms && docker compose ps

# Test backend health
curl http://localhost/health

# Test frontend proxy
curl http://localhost/api/health

# View recent backend errors
docker compose logs backend --tail=100 | grep ERROR
```

## 2. Common Issues & Fixes

### Backend Won't Start

```bash
# Check logs for specific error
docker compose logs backend --tail=50

# Common causes:
# - Missing env vars: docker compose config
# - DB connection fail: verify MONGO_URI in .env.production
# - Port conflict: sudo lsof -i :8000

# Restart with fresh build
docker compose down && docker compose up -d --build
```

### Frontend Shows Blank Page / API Errors

```bash
# Verify Vercel env var is set correctly
# VITE_API_BASE_URL = https://dit-l200-api.onrender.com

# Check browser console for CORS errors
# Fix: Update Render CORS_ORIGINS to include https://dit-tracker.vercel.app

# Force Vercel redeploy
vercel --prod
```

### PDF Invoice Generation Fails

```bash
# Verify reportlab is installed in backend image
docker compose exec backend pip show reportlab

# If missing, rebuild backend image
docker compose build backend && docker compose up -d backend
```

### Database Connection Issues

```bash
# Test MongoDB connectivity from backend container
docker compose exec backend mongosh "$MONGO_URI" --eval "db.runCommand({ping:1})"

# Check backup integrity
ls -la /opt/dit-forms/backups/
```

## 3. Emergency Rollback Procedure

If a deployment breaks production:

```bash
cd /opt/dit-forms

# Stop broken containers
docker compose down

# Pull last known-good images (if using SHA tags)
# OR revert docker-compose.yml to previous version
git checkout HEAD~1 docker-compose.prod.yml

# Restart with previous state
docker compose up -d

# Verify rollback
curl http://localhost/health
```

## 4. Data Recovery & Backups

```bash
# List available backups
ls -la /opt/dit-forms/backups/

# Restore from backup (CAUTION: Overwrites current DB)
docker compose exec mongodb mongorestore \
  --uri="mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:27017/dit_forms?authSource=admin" \
  /backups/YYYYMMDD/dit_forms

# Verify restoration
docker compose exec backend python app/scripts/smoke_test.py
```

## 5. Security Incident Response

| Scenario | Immediate Action |
|---|---|
| Suspected breach | Rotate JWT_SECRET + R2 keys via GitHub Secrets; redeploy |
| Unauthorized access | Revoke compromised user tokens; audit `/admin/users` |
| Data leak | Disable public endpoints; rotate DB credentials |
| DDoS | Enable Cloudflare WAF; rate-limit Nginx |

## 6. Maintenance Schedule

- **Daily:** Check cron backup logs (`/var/log/cron`)
- **Weekly:** Review backend error logs; test PDF generation
- **Monthly:** Restore test DB from backup; rotate secrets
- **Quarterly:** Full security audit; update Docker base images
