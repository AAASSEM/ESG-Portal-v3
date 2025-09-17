# Development Monitoring Guidelines - ESG Portal v2.0

## Overview
This document outlines best practices for maintaining code quality and preventing artifact accumulation during development.

---

## 🚀 Production Build Process

### Using Production Build Script
```bash
# Development build (with console.log and source maps)
npm run build

# Production build (optimized, no console.log, no source maps)
npm run build:prod
```

### Console.log Management
- **Keep in development**: Test files (`TestApp.js`, `test-location-sync.js`)
- **Remove for production**: Use `build:prod` script which strips console statements
- **Best practice**: Use environment-based logging:
```javascript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

---

## 📁 File Monitoring Checklist

### Daily Development
- [ ] Check for new `.DS_Store` files (macOS)
- [ ] Remove temporary `.tmp`, `.temp` files
- [ ] Clean up any `.backup` or `.old` files created during development

### Weekly Maintenance
- [ ] Clear Python `__pycache__` directories
- [ ] Remove any `npm-debug.log` files
- [ ] Check for accumulated build artifacts in `dist/` or `build/`
- [ ] Clean `staticfiles/` directory if Django collected static files

### Monthly Reviews
- [ ] Audit `node_modules/` size and remove unused packages
- [ ] Review git history for accidentally committed large files
- [ ] Check dependency vulnerabilities with `npm audit`
- [ ] Remove old feature branches

---

## 🔍 Automated Monitoring Commands

### Quick Health Check
```bash
# Check for common artifacts
find . -name "*.DS_Store" -o -name "__pycache__" -o -name "*.log" -o -name "*.tmp" | head -10

# Check git repository size
du -sh .git/

# Check for large files
find . -size +10M -not -path "./node_modules/*" -not -path "./.git/*"
```

### Dependency Health
```bash
# Check outdated packages
npm outdated

# Security audit
npm audit --audit-level=moderate

# Check unused dependencies (requires npx dep-check)
npx depcheck
```

---

## 📊 Size Monitoring

### Target Thresholds
| Directory | Recommended Max | Action Required |
|-----------|----------------|-----------------|
| `node_modules/` | 500MB | Review dependencies |
| `.git/` | 100MB | Consider git cleanup |
| `build/` | 50MB | Normal for React builds |
| `staticfiles/` | 10MB | Clean after collectstatic |

### Monitoring Script
```bash
#!/bin/bash
echo "=== ESG Portal Size Report ==="
echo "node_modules: $(du -sh node_modules/ 2>/dev/null || echo 'N/A')"
echo ".git: $(du -sh .git/ 2>/dev/null || echo 'N/A')"
echo "build: $(du -sh frontend/build/ 2>/dev/null || echo 'N/A')"
echo "staticfiles: $(du -sh backend/staticfiles/ 2>/dev/null || echo 'N/A')"
```

---

## 🛡️ Git Best Practices

### Pre-commit Checks
```bash
# Before committing, run:
git status --porcelain | grep "^??"  # Check untracked files
git diff --cached --stat             # Review staged changes
```

### Branch Cleanup
```bash
# List merged branches
git branch --merged main | grep -v main

# Delete merged branches (carefully)
git branch --merged main | grep -v main | xargs -n 1 git branch -d
```

---

## 📋 Development Workflow Integration

### VS Code Settings (Recommended)
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/build/**": true,
    "**/__pycache__/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/build": true,
    "**/__pycache__": true
  }
}
```

### Pre-push Hook (Optional)
Create `.git/hooks/pre-push`:
```bash
#!/bin/bash
echo "Running pre-push checks..."
npm audit --audit-level=high
if [ $? -ne 0 ]; then
  echo "Security vulnerabilities found. Consider fixing before push."
fi
```

---

## 🚨 Alert Conditions

### Immediate Action Required
- **High security vulnerabilities** in dependencies
- **Large files** (>50MB) accidentally staged for commit
- **Missing .env files** in production

### Weekly Review Triggers
- **Build time** increases significantly (>2 minutes)
- **Repository size** grows >20% in a week
- **More than 10 console.log statements** added

### Monthly Audit Triggers
- **Dependencies** more than 6 months outdated
- **Node.js or Python version** behind current LTS
- **Accumulated build artifacts** >100MB

---

## 📞 Troubleshooting Common Issues

### "Build Failed" After Cleanup
```bash
# Clear all caches and reinstall
rm -rf node_modules/ package-lock.json
npm install
npm run build
```

### "Git Repository Too Large"
```bash
# Find large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | grep '^blob' | sort -nk 3 | tail -10

# Clean up git objects
git gc --prune=now --aggressive
```

### "Static Files Not Found"
```bash
# Django development server
python manage.py collectstatic --noinput
cp -r frontend/build/static/* backend/static/
```

---

## 📈 Success Metrics

### Development Efficiency
- Build time: <2 minutes
- Hot reload time: <5 seconds
- Git operations: <10 seconds

### Code Quality
- Zero high-security vulnerabilities
- <50 console.log statements in non-test files
- All builds pass without warnings

### Repository Health
- Repository size: <100MB
- Clean git status after development sessions
- All dependencies within 1 major version of latest

---

*Last Updated: September 16, 2025*
*Review Schedule: Monthly*