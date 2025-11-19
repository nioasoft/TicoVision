# ✅ Backup System Setup Checklist

**Setup Time:** 30 minutes
**Prerequisites:** GitHub repo access, Supabase project access
**Difficulty:** Easy

---

## 📋 Pre-Setup Verification

Before starting, verify you have:

- [ ] Admin access to GitHub repository (nioasoft/TicoVision)
- [ ] Admin access to Supabase project (zbqfeebrhberddvfkuhe)
- [ ] Supabase Database password
- [ ] GitHub CLI installed (`gh --version`)
- [ ] PostgreSQL client installed (`psql --version`)
- [ ] GPG installed (`gpg --version`)

---

## 🔐 Step 1: Create GitHub Personal Access Token

**Time:** 5 minutes

1. **Open GitHub Settings:**
   ```
   https://github.com/settings/tokens
   ```

2. **Click:** "Personal access tokens" → "Tokens (classic)"

3. **Click:** "Generate new token (classic)"

4. **Fill in:**
   - **Note:** `TicoVision Backup Automation`
   - **Expiration:** `No expiration` (or 1 year)
   - **Scopes:** Check the following:
     - ✅ `repo` (Full control of private repositories)
       - ✅ repo:status
       - ✅ repo_deployment
       - ✅ public_repo
       - ✅ repo:invite
       - ✅ security_events

5. **Click:** "Generate token"

6. **IMPORTANT:** Copy the token immediately (starts with `ghp_`)
   ```
   Example: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

7. **Save it securely:**
   - Password manager
   - Or temporary note (will add to GitHub Secrets next)

**⚠️ WARNING:** You cannot see this token again! Save it now.

**✅ Checkpoint:** Token saved securely

---

## 🗄️ Step 2: Get Supabase Database URL

**Time:** 3 minutes

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/zbqfeebrhberddvfkuhe/settings/database
   ```

2. **Scroll to:** "Connection string" section

3. **Select:** "URI" tab

4. **Copy the connection string:**
   ```
   postgresql://postgres.[YOUR-PROJECT]:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   ```

5. **Replace `[YOUR-PASSWORD]`** with your actual database password

6. **Save it temporarily** (will add to GitHub Secrets next)

**Example:**
```
postgresql://postgres.zbqfeebrhberddvfkuhe:MySecurePassword123@db.zbqfeebrhberddvfkuhe.supabase.co:5432/postgres
```

**⚠️ Security Note:** This URL contains your password - keep it secret!

**✅ Checkpoint:** Database URL ready

---

## 🔑 Step 3: Generate Encryption Key

**Time:** 2 minutes

1. **Generate a strong random password** (32+ characters):

   **Option A - macOS/Linux:**
   ```bash
   openssl rand -base64 32
   ```

   **Option B - Online Generator:**
   ```
   https://bitwarden.com/password-generator/
   Settings: 32 characters, all types
   ```

   **Option C - Manual:**
   ```
   Create something like: Xk9$mP2#vR8@nL4!qW6^hT1&bY3*sD7%
   ```

2. **Copy the generated key**

3. **Save it securely** (you'll need it to decrypt backups!)

**Example:**
```
jK8mN2pQ5rT7vX9zA3cF6hL4nP8sW1yB
```

**✅ Checkpoint:** Encryption key generated and saved

---

## 🔒 Step 4: Add Secrets to GitHub Repository

**Time:** 5 minutes

### Method A: Via GitHub Web UI (Recommended)

1. **Open Repository Settings:**
   ```
   https://github.com/nioasoft/TicoVision/settings/secrets/actions
   ```

2. **Add Secret #1: SUPABASE_DB_URL**
   - Click: "New repository secret"
   - Name: `SUPABASE_DB_URL`
   - Value: Paste the database URL from Step 2
   - Click: "Add secret"

3. **Add Secret #2: BACKUP_ENCRYPTION_KEY**
   - Click: "New repository secret"
   - Name: `BACKUP_ENCRYPTION_KEY`
   - Value: Paste the encryption key from Step 3
   - Click: "Add secret"

4. **Verify both secrets are added:**
   - You should see:
     - `SUPABASE_DB_URL`
     - `BACKUP_ENCRYPTION_KEY`
     - `GITHUB_TOKEN` (already exists - don't change it)

### Method B: Via GitHub CLI

```bash
# Set SUPABASE_DB_URL
gh secret set SUPABASE_DB_URL \
  --repo nioasoft/TicoVision \
  --body "postgresql://postgres.zbqfeebrhberddvfkuhe:YOUR-PASSWORD@db.zbqfeebrhberddvfkuhe.supabase.co:5432/postgres"

# Set BACKUP_ENCRYPTION_KEY
gh secret set BACKUP_ENCRYPTION_KEY \
  --repo nioasoft/TicoVision \
  --body "YOUR-32-CHAR-ENCRYPTION-KEY"

# Verify secrets are set
gh secret list --repo nioasoft/TicoVision
```

**✅ Checkpoint:** All 2 secrets added to GitHub

---

## 🧪 Step 5: Test Backup Workflow

**Time:** 10 minutes

1. **Open GitHub Actions:**
   ```
   https://github.com/nioasoft/TicoVision/actions
   ```

2. **Find:** "Daily Database Backup" workflow

3. **Click:** "Run workflow" dropdown

4. **Click:** "Run workflow" button (on main branch)

5. **Wait for completion** (5-10 minutes):
   - ⏳ Yellow dot = Running
   - ✅ Green checkmark = Success
   - ❌ Red X = Failed

6. **If successful:**
   - Go to: https://github.com/nioasoft/TicoVision/releases
   - You should see a new release: "Database Backup [TODAY'S DATE]"
   - Tagged as: `backup-1` (or similar number)

7. **Click on the release** and verify:
   - [ ] Has encrypted file: `ticovision-backup-*.tar.gz.gpg`
   - [ ] Has metadata file: `metadata.json`
   - [ ] Release body has restore instructions

**✅ Checkpoint:** First backup created successfully

---

## 🔍 Step 6: Verify Backup Integrity

**Time:** 5 minutes

```bash
# Download the backup you just created
gh release list --repo nioasoft/TicoVision --limit 1

# Get the tag name (e.g., backup-1)
TAG=$(gh release list --repo nioasoft/TicoVision --limit 1 | awk '{print $1}')

# Download files
gh release download "$TAG" \
  --repo nioasoft/TicoVision \
  --pattern "*.gpg" \
  --pattern "metadata.json"

# Check metadata
cat metadata.json
# Should show: backup_date, tables_count, total_rows, database_size

# Decrypt backup (using the encryption key from Step 3)
gpg --decrypt \
  --passphrase "YOUR-ENCRYPTION-KEY" \
  --batch \
  ticovision-backup-*.tar.gz.gpg > test-backup.tar.gz

# Extract
tar -xzf test-backup.tar.gz

# Verify files exist
ls -lh backups/
# Should show:
# - roles.sql
# - schema.sql
# - data.sql

# Check first few lines of schema
head -n 20 backups/schema.sql
# Should show SQL commands

# Cleanup
rm -rf ticovision-backup-*.tar.gz.gpg test-backup.tar.gz backups/ metadata.json
```

**✅ Checkpoint:** Backup can be decrypted and extracted successfully

---

## 📅 Step 7: Verify Automated Schedule

**Time:** 2 minutes

The workflow is set to run automatically every night at **23:00 UTC** (02:00 Israel time).

**To verify:**

1. **Check workflow file:**
   ```bash
   cat .github/workflows/daily-backup.yml | grep cron
   ```

   Should show:
   ```yaml
   - cron: '0 23 * * *'
   ```

2. **Tomorrow morning, check that it ran:**
   ```bash
   # Check if backup ran last night
   gh run list --workflow="daily-backup.yml" --limit 1
   ```

**✅ Checkpoint:** Schedule verified

---

## 📝 Step 8: Document Encryption Key

**Time:** 3 minutes

**CRITICAL:** Save the encryption key in a secure location!

### Option A: Password Manager (Recommended)

Add to 1Password/LastPass/Bitwarden:
- **Title:** TicoVision Backup Encryption Key
- **Password:** [your-32-char-key]
- **Notes:**
  ```
  Used for: Decrypting daily database backups from GitHub Releases
  Location: GitHub repo nioasoft/TicoVision
  Also stored in: GitHub Secrets (BACKUP_ENCRYPTION_KEY)
  Created: [today's date]
  ```

### Option B: Secure Note

Create a file on encrypted drive:
- **Location:** `~/Documents/TicoVision/backup-encryption-key.txt`
- **Content:**
  ```
  TicoVision Backup Encryption Key
  ================================
  Key: [your-32-char-key]
  Created: [date]
  Purpose: Decrypt backups from GitHub Releases
  GitHub Secret: BACKUP_ENCRYPTION_KEY
  ```
- **Permissions:** `chmod 600 backup-encryption-key.txt` (owner read/write only)

**⚠️ IMPORTANT:**
- This key is NOT stored in the repository
- Without this key, backups CANNOT be decrypted
- Keep it safe and accessible to authorized personnel only

**✅ Checkpoint:** Encryption key documented securely

---

## ✅ Final Verification Checklist

Run through this checklist to ensure everything is working:

- [ ] GitHub Personal Access Token created (not needed for basic setup, but useful for scripts)
- [ ] `SUPABASE_DB_URL` secret set in GitHub
- [ ] `BACKUP_ENCRYPTION_KEY` secret set in GitHub
- [ ] Workflow can run manually and succeeds
- [ ] GitHub Release created with backup files
- [ ] Backup can be downloaded
- [ ] Backup can be decrypted with encryption key
- [ ] Backup extracts to valid SQL files
- [ ] Encryption key saved in secure location
- [ ] Workflow schedule verified (23:00 UTC daily)

---

## 🎉 Setup Complete!

Your backup system is now fully operational with:

✅ **Daily automated backups** at 02:00 Israel time
✅ **30 days retention** of encrypted backups
✅ **Off-site storage** in GitHub Releases
✅ **Automatic cleanup** of old backups
✅ **Failure alerts** via GitHub Issues
✅ **Complete documentation** for disaster recovery

---

## 📅 Next Steps

### Immediate (Today):
- [ ] Read [Disaster Recovery Guide](./DISASTER_RECOVERY.md)
- [ ] Read [Backup Monitoring Guide](./BACKUP_MONITORING.md)
- [ ] Add backup checks to your daily routine

### This Week:
- [ ] Wait for tomorrow's automated backup
- [ ] Verify it runs successfully
- [ ] Practice downloading and decrypting a backup

### This Month:
- [ ] Run monthly backup integrity test
- [ ] Schedule quarterly disaster recovery drill

---

## 🆘 Troubleshooting

### Workflow Failed?

1. Check workflow logs:
   ```
   https://github.com/nioasoft/TicoVision/actions/workflows/daily-backup.yml
   ```

2. Common issues:
   - **Database connection failed:** Verify `SUPABASE_DB_URL` is correct
   - **GPG encryption failed:** Verify `BACKUP_ENCRYPTION_KEY` is set
   - **Release creation failed:** Check GitHub token permissions

3. Manual retry:
   ```bash
   gh workflow run daily-backup.yml --repo nioasoft/TicoVision
   ```

### Need Help?

- **Documentation:** See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- **Monitoring:** See [BACKUP_MONITORING.md](./BACKUP_MONITORING.md)
- **Issues:** Create issue at https://github.com/nioasoft/TicoVision/issues

---

## 📞 Emergency Contacts

If you cannot access backups or need urgent help:

- **Asaf Ben Atia:** [PHONE] / [EMAIL]
- **GitHub Support:** support@github.com
- **Supabase Support:** https://supabase.com/dashboard/support

---

**Congratulations! Your backup system is production-ready!** 🎊
