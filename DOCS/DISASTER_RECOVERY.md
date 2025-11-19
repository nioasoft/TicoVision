# 🆘 TicoVision - Disaster Recovery Runbook

**Last Updated:** 2025-01-18
**Owner:** Asaf Ben Atia
**Review Frequency:** Monthly

---

## 📋 Quick Reference

| Scenario | RTO (Recovery Time) | RPO (Data Loss) | Primary Method |
|----------|---------------------|-----------------|----------------|
| Accidental Table Drop | 10-30 minutes | < 24 hours | Supabase Daily Backup |
| Accidental Data Delete | 10-30 minutes | < 24 hours | Supabase Daily Backup |
| Database Corruption | 1-2 hours | < 24 hours | GitHub Release Backup |
| Supabase Complete Outage | 2-4 hours | < 24 hours | New Instance + GitHub Backup |
| Need older backup (>7 days) | 1-2 hours | Depends on backup age | GitHub Release Backup |

**RTO** = Recovery Time Objective (זמן לשחזור)
**RPO** = Recovery Point Objective (איבוד מקסימלי של דאטה)

---

## 🔄 Backup Layers

### Layer 1: Supabase Automated Backups
- **Frequency:** Daily at 04:00 UTC
- **Retention:** 7 days
- **Location:** Supabase internal storage
- **Access:** Via Supabase Dashboard
- **Speed:** Fastest (5-30 minutes)
- **Cost:** Included in Pro plan

### Layer 2: GitHub Releases Encrypted Backups
- **Frequency:** Daily at 23:00 UTC (02:00 Israel)
- **Retention:** 30 days
- **Location:** GitHub Releases (off-site)
- **Access:** Via GitHub CLI or web
- **Speed:** Moderate (1-2 hours)
- **Cost:** Free
- **Encryption:** GPG AES256

---

## 🚨 Procedure 1: Fast Recovery from Supabase

**Use When:**
- Need quick recovery
- Data loss within last 7 days
- Supabase platform is operational
- Simple accidental deletion/modification

### Step 1: Access Supabase Backups

1. Open browser and go to:
   ```
   https://supabase.com/dashboard/project/zbqfeebrhberddvfkuhe/database/backups
   ```

2. Log in with your Supabase account credentials

### Step 2: Select Backup

1. Click on **"Scheduled Backups"** tab
2. Review available backups (last 7 days):
   - Each backup shows date/time
   - File size
   - Status (completed/failed)

3. Select the backup from the desired restore point
   - **Important:** Check the timestamp carefully
   - Data will be restored to exactly this point in time

### Step 3: Initiate Restore

1. Click **"Restore"** button next to the selected backup
2. **⚠️ WARNING MESSAGE will appear:**
   ```
   This will restore your database to the selected backup point.
   Your project will be unavailable during the restore process.
   This action cannot be undone.
   ```

3. Type **"RESTORE"** to confirm
4. Click **"Confirm Restore"**

### Step 4: Monitor Restore Process

- **Status Updates:** Will appear in the dashboard
- **Expected Duration:** 5-30 minutes (depending on database size)
- **During Restore:**
  - ❌ Application will be OFFLINE
  - ❌ All database connections will be dropped
  - ❌ No data writes possible

### Step 5: Verify Recovery

Once restore completes:

```bash
# Connect to database
psql "postgresql://postgres.zbqfeebrhberddvfkuhe:[PASSWORD]@db.zbqfeebrhberddvfkuhe.supabase.co:5432/postgres"

# Verify critical tables
\dt

# Check record counts
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM fee_calculations;
SELECT COUNT(*) FROM generated_letters;
SELECT COUNT(*) FROM user_tenant_access;

# Verify recent data exists
SELECT created_at FROM clients ORDER BY created_at DESC LIMIT 5;
```

### Step 6: Notify Stakeholders

```markdown
✅ Database restored successfully from Supabase backup

Restore Point: [DATE TIME]
Duration: [X minutes]
Verification: ✓ All tables present, ✓ Data integrity confirmed

Application is now ONLINE.
```

**Total Time:** 10-30 minutes
**Data Loss:** Up to 24 hours

---

## 🔐 Procedure 2: Recovery from GitHub Encrypted Backup

**Use When:**
- Supabase backups unavailable
- Need backup older than 7 days
- Complete Supabase outage
- Migrating to new Supabase instance

### Prerequisites

```bash
# Install required tools
brew install gh                    # GitHub CLI
brew install postgresql@15         # PostgreSQL client
brew install gnupg                # GPG for decryption
brew install jq                   # JSON processor

# Authenticate with GitHub
gh auth login
```

### Step 1: List Available Backups

```bash
# List all backup releases
gh release list --repo nioasoft/TicoVision --limit 30

# You'll see output like:
# backup-45    Database Backup 2025-01-18    Latest    Jan 18, 2025
# backup-44    Database Backup 2025-01-17              Jan 17, 2025
# backup-43    Database Backup 2025-01-16              Jan 16, 2025
```

### Step 2: Download Backup

```bash
# Choose the backup number you want (e.g., backup-45)
BACKUP_TAG="backup-45"

# Download encrypted backup
gh release download "$BACKUP_TAG" \
  --repo nioasoft/TicoVision \
  --pattern "*.gpg"

# Download metadata
gh release download "$BACKUP_TAG" \
  --repo nioasoft/TicoVision \
  --pattern "metadata.json"

# Verify download
ls -lh *.gpg metadata.json

# Check metadata
cat metadata.json | jq .
```

### Step 3: Decrypt Backup

```bash
# You'll need the BACKUP_ENCRYPTION_KEY from GitHub Secrets
# Contact Asaf if you don't have it

# Decrypt the backup
gpg --decrypt \
  --passphrase "YOUR-ENCRYPTION-KEY-HERE" \
  --batch --yes \
  ticovision-backup-*.tar.gz.gpg > backup.tar.gz

# Verify decryption succeeded
file backup.tar.gz
# Should output: backup.tar.gz: gzip compressed data

# Extract backup
tar -xzf backup.tar.gz

# Verify contents
ls -lh backups/
# Should show: roles.sql, schema.sql, data.sql
```

### Step 4: Verify Backup Integrity

```bash
# Check SQL files are valid
head -n 20 backups/schema.sql
head -n 20 backups/data.sql

# Count lines in each file
wc -l backups/*.sql
```

### Step 5: Choose Restore Target

#### Option A: Restore to Existing Database (Destructive!)

**⚠️ WARNING:** This will OVERWRITE all existing data!

```bash
# Set connection string
export DB_URL="postgresql://postgres.zbqfeebrhberddvfkuhe:[PASSWORD]@db.zbqfeebrhberddvfkuhe.supabase.co:5432/postgres"

# Backup current state (just in case!)
pg_dump "$DB_URL" > current_state_backup.sql

# Drop all existing data (DANGEROUS!)
psql "$DB_URL" << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF
```

#### Option B: Create New Supabase Instance (Recommended)

1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - Name: `TicoVision Recovery` or `TicoVision v2`
   - Database Password: Generate strong password
   - Region: Same as current (eu-central-1)
4. Wait for project creation (2-3 minutes)
5. Copy the new connection string:
   ```
   Settings → Database → Connection String → URI
   ```

```bash
# Set new connection string
export DB_URL="postgresql://postgres.[NEW-REF]:[NEW-PASSWORD]@db.[NEW-REF].supabase.co:5432/postgres"
```

### Step 6: Restore Data

```bash
# Restore in correct order (CRITICAL!)
echo "📝 Restoring roles..."
psql "$DB_URL" -f backups/roles.sql

echo "🗂️  Restoring schema..."
psql "$DB_URL" -f backups/schema.sql

echo "📊 Restoring data..."
psql "$DB_URL" -f backups/data.sql

echo "✅ Restore completed!"
```

### Step 7: Verify Restored Database

```bash
# Connect to restored database
psql "$DB_URL"

# Run verification queries
\dt                                         # List all tables

-- Check table counts
SELECT schemaname, tablename, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Verify tenant isolation
SELECT tenant_id, COUNT(*)
FROM clients
GROUP BY tenant_id;

-- Check most recent data
SELECT created_at FROM fee_calculations ORDER BY created_at DESC LIMIT 10;

-- Verify RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 8: Update Application Configuration

If you created a NEW Supabase instance:

#### Update Vercel Environment Variables

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Update production env vars
vercel env rm VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL production
# Paste new URL: https://[NEW-REF].supabase.co

vercel env rm VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SUPABASE_ANON_KEY production
# Paste new anon key from Supabase Dashboard

# Update service role key
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste new service role key

# Redeploy
vercel --prod
```

#### Update GitHub Secrets

```bash
# Go to: https://github.com/nioasoft/TicoVision/settings/secrets/actions

# Update:
# - SUPABASE_DB_URL
# - SUPABASE_ACCESS_TOKEN (get from new project)
```

### Step 9: Post-Recovery Validation

```bash
# Test application functionality
1. Open https://ticovision.vercel.app
2. Login with test account
3. Verify:
   ✓ Can view clients list
   ✓ Can create new client
   ✓ Can generate fee calculation
   ✓ Can send letter
   ✓ Can view dashboard

# Check logs for errors
vercel logs --prod
```

### Step 10: Document Recovery

Create a post-mortem document:

```markdown
## Recovery Event - [DATE]

**Incident:** [What happened]
**Recovery Method:** GitHub Backup
**Backup Used:** backup-[NUMBER] from [DATE]
**Data Loss:** [X hours/days]
**Downtime:** [X hours]
**Root Cause:** [Why recovery was needed]
**Lessons Learned:** [What can be improved]
**Action Items:** [Preventive measures]
```

**Total Time:** 1-4 hours
**Data Loss:** Depends on backup age (usually < 24 hours)

---

## 🧪 Testing & Drills

### Monthly Backup Test (10 minutes)

```bash
# 1. Download latest backup
gh release list --repo nioasoft/TicoVision --limit 1
gh release download backup-[LATEST] --pattern "*.gpg" --pattern "metadata.json"

# 2. Decrypt and extract
gpg -d backup.tar.gz.gpg > backup.tar.gz
tar -xzf backup.tar.gz

# 3. Verify files exist and are valid
ls -lh backups/
head -100 backups/schema.sql

# 4. Document test
echo "✅ Backup test passed - $(date)" >> docs/backup-tests.log

# 5. Cleanup
rm -rf backup.tar.gz.gpg backup.tar.gz backups/
```

### Quarterly Full DR Drill (2 hours)

1. Create a separate **Staging** Supabase project
2. Download production backup from GitHub
3. Perform complete restore to staging
4. Verify data integrity
5. Test application against staging DB
6. Document results and timing
7. Delete staging project

**Schedule Next Drill:** First Monday of each quarter at 10:00

---

## 📞 Emergency Contacts

| Name | Role | Contact | Availability |
|------|------|---------|--------------|
| Asaf Ben Atia | Owner/Lead Dev | [PHONE] / [EMAIL] | 24/7 |
| Supabase Support | Platform Support | https://supabase.com/dashboard/support | 24/7 |
| GitHub Support | Version Control | support@github.com | 24/7 |
| Vercel Support | Hosting | support@vercel.com | 24/7 |

---

## 📚 Related Documentation

- [Backup Monitoring Guide](./BACKUP_MONITORING.md)
- [Database Reference](./DATABASE_REFERENCE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions Workflow](./.github/workflows/daily-backup.yml)

---

## ✅ Recovery Checklist

Print this and keep it handy:

### Fast Recovery (Supabase)
- [ ] Access Supabase Dashboard
- [ ] Select backup from desired date
- [ ] Confirm restore (type "RESTORE")
- [ ] Wait for completion (5-30 min)
- [ ] Verify data integrity
- [ ] Notify stakeholders
- [ ] Document incident

### Full Recovery (GitHub)
- [ ] List available backups
- [ ] Download encrypted backup + metadata
- [ ] Decrypt backup with GPG
- [ ] Extract tar.gz archive
- [ ] Verify SQL files integrity
- [ ] Choose restore target (existing/new)
- [ ] Restore roles → schema → data
- [ ] Verify restored database
- [ ] Update app configuration (if needed)
- [ ] Test application functionality
- [ ] Document recovery event

---

**Remember:** The best disaster recovery plan is the one that's tested regularly! 🧪
