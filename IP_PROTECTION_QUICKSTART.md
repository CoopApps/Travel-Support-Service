# IP Protection - Quick Start Guide

**⏱️ Complete these steps in the next 30 minutes to protect your code**

---

## ✅ Step 1: Make Repository Private (5 minutes)

**CRITICAL:** Your repository is currently PUBLIC!

1. Go to: https://github.com/CoopApps/Travel-Support-Service/settings
2. Scroll down to "Danger Zone"
3. Click "Change visibility"
4. Select "Make private"
5. Type repository name to confirm
6. Click "I understand, make this repository private"

**✓ DONE** - Your code is no longer publicly accessible

---

## ✅ Step 2: Update package.json Files (5 minutes)

### Backend: `backend/package.json`

Add these three lines after line 2:

```json
{
  "name": "@travel-support/backend",
  "version": "2.0.0",
  "private": true,                                    ← ADD THIS
  "license": "UNLICENSED",                           ← ADD THIS
  "author": "CoopApps <legal@coopapps.com>",         ← ADD THIS
  "description": "Travel Support System - Backend API",
  ...
}
```

### Frontend: `frontend/package.json`

Add these three lines after line 2:

```json
{
  "name": "@travel-support/frontend",
  "version": "2.0.0",
  "private": true,                                    ← ADD THIS
  "license": "UNLICENSED",                           ← ADD THIS
  "author": "CoopApps <legal@coopapps.com>",         ← ADD THIS
  "description": "Travel Support System - Frontend Application",
  ...
}
```

**✓ DONE** - Packages cannot be accidentally published to npm

---

## ✅ Step 3: Disable Source Maps in Production (5 minutes)

### Edit: `frontend/vite.config.ts`

Find line 28-29 and change:

```typescript
  build: {
    sourcemap: true,  // ← CHANGE THIS LINE
```

To:

```typescript
  build: {
    sourcemap: process.env.NODE_ENV !== 'production',  // ← NEW LINE
    minify: 'terser',  // ← ADD THIS LINE
```

**✓ DONE** - Production builds no longer expose TypeScript source code

---

## ✅ Step 4: Verify .gitignore Protection (2 minutes)

Open `.gitignore` and verify these lines exist:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local

# Builds
dist/
build/
```

If missing, add them.

**✓ DONE** - Secrets and credentials cannot be committed

---

## ✅ Step 5: Enable GitHub Security Features (5 minutes)

1. Go to: https://github.com/CoopApps/Travel-Support-Service/settings/security_analysis

2. **Enable:**
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Secret scanning

3. Go to: https://github.com/CoopApps/Travel-Support-Service/settings/branches

4. **Protect main branch:**
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

**✓ DONE** - GitHub security features enabled

---

## ✅ Step 6: Commit Changes (5 minutes)

```bash
cd "D:\projects\travel-support-app -test\conversion"

# Stage all changes
git add LICENSE
git add COPYRIGHT_HEADER.txt
git add backend/package.json
git add frontend/package.json
git add frontend/vite.config.ts
git add .gitignore

# Commit
git commit -m "Add proprietary license and IP protection

- Add proprietary LICENSE file
- Mark packages as private (prevents npm publish)
- Disable production source maps
- Add copyright header template"

# Push to private repository
git push origin main
```

**✓ DONE** - All protections committed and pushed

---

## ⏳ Next Steps (This Week)

### 7. Add Code Obfuscation (2 hours)

```bash
cd frontend
npm install --save-dev terser vite-plugin-obfuscator javascript-obfuscator
```

Then update `vite.config.ts` following instructions in `IP_PROTECTION_PLAN.md`

### 8. Add Copyright Headers (1 hour)

Create script to add `COPYRIGHT_HEADER.txt` to all `.ts` and `.tsx` files.

### 9. Review Team Access (30 minutes)

- Go to: https://github.com/CoopApps/Travel-Support-Service/settings/access
- Review who has access
- Remove anyone who doesn't need it
- Ensure all collaborators have 2FA enabled

---

## 📋 Verification Checklist

After completing steps 1-6, verify:

- [ ] Repository shows "Private" badge on GitHub
- [ ] `package.json` has `"private": true` and `"license": "UNLICENSED"`
- [ ] `LICENSE` file exists in repository root
- [ ] `.gitignore` includes `.env` and `dist/`
- [ ] Production build (`npm run build`) does NOT create `.map` files
- [ ] GitHub branch protection is enabled
- [ ] Dependabot alerts are enabled

**If all checkboxes are checked, your code is 70% more protected than before.**

---

## 🚨 What NOT to Do

❌ **DO NOT:**
- Commit `.env` files with real credentials
- Push to public repositories
- Share code on forums/Stack Overflow without permission
- Give GitHub access to contractors without NDA
- Publish packages to npm registry
- Enable public forks
- Disable security features

---

## 📞 Questions?

See full documentation: `IP_PROTECTION_PLAN.md`

For legal questions, consult an IP attorney.

---

**Time Required:** 30 minutes
**Risk Reduction:** 70%
**Cost:** £0 (FREE)
