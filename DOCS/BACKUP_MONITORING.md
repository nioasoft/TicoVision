# 📊 TicoVision Backup Monitoring Guide

**Last Updated:** 2025-01-18
**Owner:** Asaf Ben Atia
**Review Frequency:** Weekly

---

## 🎯 Monitoring Strategy

Our backup monitoring follows a **layered approach**:

1. **Automated Monitoring** - GitHub Actions checks
2. **Daily Verification** - Automated workflow outputs
3. **Weekly Manual Review** - Human verification
4. **Monthly Testing** - Restore dry runs
5. **Quarterly Drills** - Full disaster recovery exercises

---

## 🤖 Automated Monitoring (GitHub Actions)

### What's Monitored Automatically

✅ **Backup Success/Failure**
- Workflow runs daily at 23:00 UTC
- Auto-creates GitHub Issue on failure
- Labeled: `backup`, `urgent`, `automated`

✅ **Backup Size Tracking**
- Metadata includes database size
- Compressed backup size logged
- Encrypted backup size logged

✅ **Cleanup of Old Backups**
- Automatically deletes backups older than 30 days
- Logs deletion events

✅ **Database Statistics**
- Table count
- Total row count
- Database size
- All stored in metadata.json

### Monitoring Dashboard

**Primary Dashboard:**
```
https://github.com/nioasoft/TicoVision/actions/workflows/daily-backup.yml
```

**What to Check:**
- ✅ Green checkmark = Success
- ❌ Red X = Failure
- 🟡 Yellow dot = In progress

---

## 📅 Daily Verification (5 minutes)

### Morning Checklist (Every Day at 09:00)

```bash
# 1. Check if last night's backup succeeded
gh run list \
  --workflow="daily-backup.yml" \
  --limit 1 \
  --repo nioasoft/TicoVision

# Expected output:
# ✓ Daily Database Backup  main  push  1234567  2025-01-18  success

# 2. View latest backup metadata
gh release list --repo nioasoft/TicoVision --limit 1

# 3. Download and check metadata
gh release download backup-[LATEST] \
  --repo nioasoft/TicoVision \
  --pattern "metadata.json" \
  --clobber

cat metadata.json | jq .

# Expected fields:
# {
#   "backup_date": "2025-01-18T21:00:00Z",
#   "backup_date_israel": "2025-01-18 23:00:00",
#   "database": "TicoVision Production",
#   "tables_count": 45,
#   "total_rows": 12543,
#   "database_size": "125 MB"
# }

# 4. Verify backup age (should be < 26 hours)
BACKUP_TIME=$(cat metadata.json | jq -r '.backup_date')
echo "Last backup: $BACKUP_TIME"

# 5. Cleanup
rm metadata.json
```

### Automated Email Report (Optional)

Add this to the workflow if you want daily email reports:

```yaml
- name: Send daily summary email
  if: success()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "✅ TicoVision Daily Backup Report"
    to: asaf@example.com
    from: backups@ticovision.com
    body: |
      Daily backup completed successfully.

      Date: ${{ env.BACKUP_DATE }}
      Tables: ${{ env.TABLES_COUNT }}
      Total Rows: ${{ env.TOTAL_ROWS }}
      DB Size: ${{ env.DB_SIZE }}

      View backup: https://github.com/nioasoft/TicoVision/releases/tag/backup-${{ github.run_number }}
```

---

## 📊 Weekly Manual Review (15 minutes)

### Every Monday at 10:00

#### 1. Check Backup Success Rate

```bash
# Get last 7 days of backup runs
gh run list \
  --workflow="daily-backup.yml" \
  --limit 7 \
  --repo nioasoft/TicoVision \
  --json conclusion,createdAt,displayTitle

# Count successes
gh run list --workflow="daily-backup.yml" --limit 7 --json conclusion \
  | jq '[.[] | select(.conclusion=="success")] | length'

# Target: 7/7 = 100% success rate
```

#### 2. Verify Backup Integrity

```bash
# Download latest backup
LATEST_TAG=$(gh release list --repo nioasoft/TicoVision --limit 1 | awk '{print $1}')

gh release download "$LATEST_TAG" \
  --repo nioasoft/TicoVision \
  --pattern "*.gpg" \
  --pattern "metadata.json"

# Decrypt (test decryption works)
gpg --decrypt \
  --passphrase "$BACKUP_ENCRYPTION_KEY" \
  --batch \
  ticovision-backup-*.tar.gz.gpg > test-backup.tar.gz

# Verify it's a valid tar.gz
file test-backup.tar.gz
# Expected: gzip compressed data

# Extract and count files
tar -tzf test-backup.tar.gz | wc -l
# Expected: 4 files (metadata.json + 3 SQL files)

# List contents
tar -tzf test-backup.tar.gz
# Expected:
# backups/
# backups/metadata.json
# backups/roles.sql
# backups/schema.sql
# backups/data.sql

# Cleanup
rm -f ticovision-backup-*.tar.gz.gpg test-backup.tar.gz metadata.json
```

#### 3. Check Disk Usage Trends

```bash
# Get backup sizes from last 7 days
for i in {1..7}; do
  TAG="backup-$(($(gh run list --workflow="daily-backup.yml" --limit 1 --json databaseId --jq '.[0].databaseId') - i + 1))"

  if gh release view "$TAG" --repo nioasoft/TicoVision > /dev/null 2>&1; then
    SIZE=$(gh release view "$TAG" --repo nioasoft/TicoVision --json assets --jq '.assets[] | select(.name | endswith(".gpg")) | .size')
    DATE=$(gh release view "$TAG" --repo nioasoft/TicoVision --json publishedAt --jq -r '.publishedAt' | cut -d'T' -f1)
    echo "$DATE: $(numfmt --to=iec-i --suffix=B $SIZE)"
  fi
done

# Look for:
# - Consistent size (±20% variance is normal)
# - Sudden jumps might indicate data growth or issues
```

#### 4. Review GitHub Issues

```bash
# Check for failed backup alerts
gh issue list \
  --repo nioasoft/TicoVision \
  --label backup \
  --state open

# If any issues exist, investigate immediately!
```

#### 5. Document Weekly Review

```bash
# Add entry to weekly log
cat >> docs/backup-weekly-review.log << EOF
$(date +%Y-%m-%d): Weekly review completed
- Success rate: 7/7 (100%)
- Latest backup size: [SIZE]
- Integrity check: PASSED
- Open issues: 0
- Reviewed by: [YOUR NAME]
---
EOF
```

---

## 🧪 Monthly Backup Test (30 minutes)

### First Monday of Each Month at 14:00

#### Complete Test Procedure

```bash
#!/bin/bash
# monthly-backup-test.sh

set -e

echo "🧪 Starting Monthly Backup Test - $(date)"
echo "=============================================="

# 1. Download latest backup
echo "📥 Step 1: Downloading latest backup..."
LATEST_TAG=$(gh release list --repo nioasoft/TicoVision --limit 1 | awk '{print $1}')
echo "Using backup: $LATEST_TAG"

gh release download "$LATEST_TAG" \
  --repo nioasoft/TicoVision \
  --pattern "*.gpg" \
  --pattern "metadata.json"

# 2. Verify metadata
echo "📊 Step 2: Verifying metadata..."
cat metadata.json | jq .
TABLES=$(cat metadata.json | jq -r '.tables_count')
ROWS=$(cat metadata.json | jq -r '.total_rows')
echo "Tables: $TABLES, Rows: $ROWS"

# 3. Decrypt backup
echo "🔓 Step 3: Decrypting backup..."
gpg --decrypt \
  --passphrase "$BACKUP_ENCRYPTION_KEY" \
  --batch \
  ticovision-backup-*.tar.gz.gpg > backup.tar.gz

# 4. Extract backup
echo "📦 Step 4: Extracting backup..."
tar -xzf backup.tar.gz

# 5. Verify SQL files
echo "✅ Step 5: Verifying SQL files..."
for file in backups/*.sql; do
  if [ -f "$file" ]; then
    LINES=$(wc -l < "$file")
    SIZE=$(du -h "$file" | cut -f1)
    echo "  - $(basename $file): $LINES lines, $SIZE"

    # Verify file is valid SQL
    if ! head -n 1 "$file" | grep -q "^--"; then
      echo "  ⚠️  Warning: $file doesn't start with SQL comment"
    fi
  fi
done

# 6. Spot check SQL contents
echo "🔍 Step 6: Spot checking SQL contents..."
echo "Schema file preview:"
head -n 20 backups/schema.sql

echo ""
echo "Data file preview:"
head -n 20 backups/data.sql

# 7. Cleanup
echo "🧹 Step 7: Cleaning up..."
rm -rf ticovision-backup-*.tar.gz.gpg backup.tar.gz backups/ metadata.json

echo ""
echo "=============================================="
echo "✅ Monthly Backup Test PASSED - $(date)"
echo "=============================================="

# 8. Document results
echo "$(date +%Y-%m-%d): Monthly test PASSED - Backup: $LATEST_TAG" >> docs/backup-monthly-tests.log
```

Save this script and run it:

```bash
chmod +x scripts/monthly-backup-test.sh
./scripts/monthly-backup-test.sh
```

---

## 📈 Metrics to Track

### Key Performance Indicators (KPIs)

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Backup Success Rate** | 100% | < 95% |
| **Backup Completion Time** | < 10 minutes | > 20 minutes |
| **Backup Size Growth** | ±20%/month | > 50%/month |
| **Backup Age (Latest)** | < 24 hours | > 26 hours |
| **Failed Restore Tests** | 0% | > 0% |
| **Time to Restore (Tested)** | < 2 hours | > 3 hours |

### Tracking Spreadsheet Template

Create a Google Sheet with these columns:

| Date | Success | Duration | Size (MB) | Tables | Rows | Notes |
|------|---------|----------|-----------|--------|------|-------|
| 2025-01-18 | ✅ | 8 min | 125 | 45 | 12543 | Normal |
| 2025-01-17 | ✅ | 7 min | 123 | 45 | 12398 | Normal |
| 2025-01-16 | ❌ | - | - | - | - | DB connection timeout |

---

## 🚨 Alert Configuration

### GitHub Issues (Automatic)

Already configured in workflow. Failed backups automatically create issues with:
- ❌ Title: "Database Backup Failed - [DATE]"
- 🏷️ Labels: `backup`, `urgent`, `automated`
- 📋 Body: Workflow run link, timestamp, troubleshooting steps

### Slack Notifications (Optional)

To add Slack alerts, create a Slack webhook and add to workflow:

```yaml
- name: Notify Slack on success
  if: success()
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "✅ TicoVision backup completed",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*✅ Database Backup Successful*\n\nDate: $(date)\nTables: ${{ env.TABLES_COUNT }}\nRows: ${{ env.TOTAL_ROWS }}\nSize: ${{ env.DB_SIZE }}"
          }
        }]
      }'

- name: Notify Slack on failure
  if: failure()
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "❌ TicoVision backup FAILED",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*❌ Database Backup FAILED*\n\nAction required: Check <https://github.com/nioasoft/TicoVision/actions|GitHub Actions>\n\nWorkflow: ${{ github.run_id }}"
          }
        }]
      }'
```

### Email Notifications (Optional)

See "Daily Verification" section above for email setup.

---

## 🔧 Troubleshooting Common Issues

### Issue 1: Backup Workflow Failed

**Symptoms:**
- Red X in GitHub Actions
- Auto-created Issue with "Backup Failed"

**Investigation:**
```bash
# View failed workflow logs
gh run view [RUN_ID] --repo nioasoft/TicoVision --log-failed
```

**Common Causes:**
1. **Database connection timeout**
   - Solution: Check Supabase is online
   - Verify `SUPABASE_DB_URL` secret is correct

2. **GPG encryption failed**
   - Solution: Verify `BACKUP_ENCRYPTION_KEY` secret is set
   - Check key is at least 8 characters

3. **GitHub API rate limit**
   - Solution: Wait 1 hour and retry manually
   - Rare, usually resolves automatically

**Resolution:**
```bash
# Manually trigger backup workflow
gh workflow run daily-backup.yml --repo nioasoft/TicoVision
```

### Issue 2: Backup Size Suddenly Changed

**Symptoms:**
- Backup size jumped > 50%
- Or backup size dropped significantly

**Investigation:**
```bash
# Compare table sizes
psql "$SUPABASE_DB_URL" << EOF
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

**Common Causes:**
1. **Large data import** - Intentional growth
2. **Forgot to delete test data** - Unintentional growth
3. **Data corruption** - Unexpected patterns

### Issue 3: Cannot Decrypt Backup

**Symptoms:**
- GPG decryption fails
- Error: "decryption failed: Bad session key"

**Solution:**
```bash
# Verify you're using the correct encryption key
# The key is stored in GitHub Secrets: BACKUP_ENCRYPTION_KEY
# Contact Asaf if you don't have access

# Check GPG version
gpg --version
# Should be 2.x or higher

# Try with verbose output
gpg --decrypt --verbose \
  --passphrase "YOUR-KEY" \
  backup.tar.gz.gpg > backup.tar.gz
```

---

## 📚 Useful Commands Reference

```bash
# List recent backups
gh release list --repo nioasoft/TicoVision --limit 10

# Download specific backup
gh release download backup-45 --repo nioasoft/TicoVision

# View backup metadata
gh release view backup-45 --repo nioasoft/TicoVision --json body

# Check workflow status
gh run list --workflow="daily-backup.yml" --limit 5

# View workflow logs
gh run view --log

# Trigger manual backup
gh workflow run daily-backup.yml --repo nioasoft/TicoVision

# List open backup issues
gh issue list --label backup --state open

# Database connection test
psql "$SUPABASE_DB_URL" -c "SELECT version();"

# Check database size
psql "$SUPABASE_DB_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

---

## 📞 Escalation Path

| Level | Condition | Action | Contact |
|-------|-----------|--------|---------|
| **Level 1** | Single backup failure | Investigate logs, retry manually | Asaf |
| **Level 2** | 2+ consecutive failures | Check Supabase health, verify secrets | Asaf + Supabase Support |
| **Level 3** | Recovery needed | Follow Disaster Recovery runbook | Asaf (urgent) |
| **Level 4** | Cannot restore any backup | Create new instance, contact all support | All hands |

---

## 📅 Review Schedule

| Frequency | Activity | Owner | Duration |
|-----------|----------|-------|----------|
| **Daily** | Check backup success | Automated | 0 min |
| **Weekly** | Manual verification | Asaf | 15 min |
| **Monthly** | Full integrity test | Asaf | 30 min |
| **Quarterly** | Complete DR drill | Team | 2 hours |
| **Yearly** | Review & update docs | Asaf | 1 hour |

---

## ✅ Monitoring Checklist

**Daily (Automated):**
- [ ] Backup workflow runs successfully
- [ ] GitHub Release created
- [ ] Metadata captured
- [ ] Old backups cleaned up

**Weekly (Manual - 15 min):**
- [ ] Check 7-day success rate (target: 100%)
- [ ] Verify latest backup integrity
- [ ] Review backup size trends
- [ ] Check for open issues
- [ ] Update weekly log

**Monthly (Manual - 30 min):**
- [ ] Download latest backup
- [ ] Decrypt and extract
- [ ] Verify all SQL files present
- [ ] Spot check file contents
- [ ] Document test results

**Quarterly (Manual - 2 hours):**
- [ ] Create staging environment
- [ ] Full restore test
- [ ] Verify application works
- [ ] Test RTO/RPO metrics
- [ ] Update runbook if needed
- [ ] Schedule next drill

---

**Remember:** Monitoring is not just about checking if backups exist - it's about ensuring they can be RESTORED when needed! 🔄
