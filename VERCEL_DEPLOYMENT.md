# Vercel Deployment Guide

This guide will help you deploy the ESG Portal to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: Set up a database (Vercel Postgres, Railway, Neon, etc.)
3. **GitHub Repository**: Push your code to GitHub

## Deployment Steps

### 1. Prepare Your Repository

Make sure all files are committed and pushed to GitHub:
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the root directory (where `vercel.json` is located)

### 3. Configure Environment Variables

In your Vercel project settings, add these environment variables:

**Required Variables:**
- `SECRET_KEY`: Django secret key (generate a secure random string)
- `DATABASE_URL`: PostgreSQL connection string
- `DEBUG`: Set to `False`
- `VERCEL`: Set to `1`

**Example DATABASE_URL format:**
```
postgresql://username:password@hostname:port/database_name
```

### 4. Database Setup Options

#### Option A: Vercel Postgres
1. In Vercel dashboard, go to Storage tab
2. Create a Postgres database
3. Copy the connection string to `DATABASE_URL`

#### Option B: External Database (Railway, Neon, etc.)
1. Create a PostgreSQL database on your preferred provider
2. Get the connection string
3. Add it as `DATABASE_URL` environment variable

### 5. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

## Post-Deployment Setup

### 1. Run Database Migrations

You'll need to run Django migrations. You can do this via:

1. **Vercel CLI** (recommended):
```bash
npx vercel env pull .env.local
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput
```

2. **Or create a management script** in your Django app to run on first request

### 2. Create Superuser

Create an admin user to access Django admin:
```bash
python backend/manage.py createsuperuser
```

## Configuration Files Created

1. **`vercel.json`**: Main Vercel configuration
2. **`backend/vercel_app.py`**: WSGI application for Vercel
3. **Updated `settings.py`**: Added Vercel domain support

## Troubleshooting

### Common Issues:

1. **Static files not loading**: Make sure `whitenoise` is properly configured
2. **Database connection errors**: Verify `DATABASE_URL` format
3. **CORS issues**: Check `ALLOWED_HOSTS` includes your Vercel domain
4. **Build failures**: Check Python dependencies in `requirements.txt`

### Debug Mode:

For debugging, temporarily set `DEBUG=True` in environment variables (remember to set back to `False` for production).

## Domain Configuration

### Custom Domain:
1. Go to Project Settings > Domains
2. Add your custom domain
3. Update `ALLOWED_HOSTS` in Django settings if needed

## Security Notes

- Never commit secret keys or database credentials
- Use Vercel environment variables for sensitive data
- Keep `DEBUG=False` in production
- Regularly update dependencies

## Support

For deployment issues:
- Check Vercel deployment logs
- Review Django error logs
- Ensure all environment variables are set correctly

## File Structure
```
your-project/
├── vercel.json                 # Vercel configuration
├── backend/
│   ├── vercel_app.py          # WSGI app for Vercel
│   ├── requirements.txt       # Python dependencies
│   ├── manage.py
│   └── esg_backend/
│       └── settings.py        # Updated with Vercel support
└── frontend/
    ├── package.json           # React build configuration
    └── src/
        └── config.js          # API URL configuration
```