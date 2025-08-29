# ESG Portal - Docker Setup

This guide explains how to run the ESG Portal application using Docker containers.

## 🚀 Quick Start

### Production Deployment
```bash
# Build and start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# Database: localhost:5432
```

### Development Environment
```bash
# Start development environment with live reload
docker-compose -f docker-compose.dev.yml up -d

# Access the development environment
# Frontend: http://localhost:3001 (with live reload)
# Backend API: http://localhost:8001 (with live reload)
# Database: localhost:5433
```

## 📦 Container Architecture

### Services Overview
- **frontend**: React application served by Nginx
- **backend**: Django API server
- **db**: PostgreSQL database
- **redis**: Redis for caching (optional)

### Container Details

#### Frontend Container
- **Base**: `nginx:alpine`
- **Build**: Multi-stage (Node.js build → Nginx serve)
- **Features**:
  - Production optimized React build
  - Nginx with reverse proxy to backend
  - Gzip compression
  - Security headers
  - Health checks

#### Backend Container  
- **Base**: `python:3.11-slim`
- **Features**:
  - Django application server
  - PostgreSQL client
  - Static file serving
  - Automatic migrations
  - Health checks

#### Database Container
- **Base**: `postgres:15-alpine`
- **Features**:
  - Persistent data storage
  - Initialization scripts
  - Health checks
  - Timezone configuration

## 🛠️ Commands Reference

### Basic Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose build

# Start specific service
docker-compose up -d backend
```

### Development Commands
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View development logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild development containers
docker-compose -f docker-compose.dev.yml build
```

### Database Operations
```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Access database shell
docker-compose exec db psql -U esg_user -d esg_portal

# Backup database
docker-compose exec db pg_dump -U esg_user esg_portal > backup.sql

# Restore database
docker-compose exec -T db psql -U esg_user esg_portal < backup.sql
```

### Container Management
```bash
# View running containers
docker-compose ps

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh

# View container logs
docker-compose logs backend
docker-compose logs frontend

# Restart specific service
docker-compose restart backend
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://esg_user:esg_password@db:5432/esg_portal
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
```

#### Frontend (.env)
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
```

### Volume Mapping

#### Production Volumes
- `postgres_data`: Database files
- `backend_media`: User uploaded files
- `backend_static`: Static assets
- `frontend_static`: Built frontend assets

#### Development Volumes
- `./backend:/app`: Live reload for backend
- `./frontend:/app`: Live reload for frontend
- `/app/node_modules`: Exclude from live reload

## 🌐 Networking

### Production Network
- **Network**: `esg_network` (bridge)
- **Frontend**: Port 80, 443
- **Backend**: Port 8000 (internal)
- **Database**: Port 5432 (internal)
- **Redis**: Port 6379 (internal)

### Development Network
- **Network**: `esg_network_dev` (bridge) 
- **Frontend**: Port 3001
- **Backend**: Port 8001
- **Database**: Port 5433

## 🔒 Security Features

### Production Security
- Non-root containers
- Security headers (X-Frame-Options, X-Content-Type-Options)
- Nginx reverse proxy
- HTTPS ready
- Health checks
- Resource limits

### Development Security
- Separate development network
- Development-only secrets
- Debug mode enabled
- CORS configured for development

## 📊 Monitoring & Health

### Health Checks
All services include health checks:
- **Frontend**: HTTP request to /
- **Backend**: HTTP request to /api/auth/csrf/
- **Database**: PostgreSQL connection test
- **Redis**: Redis ping command

### Monitoring Commands
```bash
# Check service health
docker-compose ps

# View detailed container info
docker inspect esg_backend

# Monitor resource usage
docker stats

# View health check logs
docker inspect --format='{{.State.Health}}' esg_backend
```

## 🚀 Deployment Options

### Local Docker
```bash
docker-compose up -d
```

### Docker Swarm
```bash
docker stack deploy -c docker-compose.yml esg-portal
```

### Kubernetes (K8s)
Convert using Kompose:
```bash
kompose convert -f docker-compose.yml
kubectl apply -f .
```

### Cloud Platforms
- **AWS ECS**: Use task definitions
- **Google Cloud Run**: Deploy containers directly
- **Azure Container Instances**: Use container groups
- **DigitalOcean**: Use App Platform with Dockerfiles

## 🔧 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :80
lsof -i :8000
lsof -i :5432

# Use different ports in docker-compose.yml
ports:
  - "8080:80"  # Map to different host port
```

#### Permission Issues
```bash
# Fix volume permissions
docker-compose exec backend chown -R app:app /app/media
```

#### Database Connection Issues
```bash
# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec backend python manage.py dbshell
```

#### Build Issues
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

### Performance Optimization

#### Production Optimizations
- Use multi-stage builds
- Minimize layer count
- Use specific base image tags
- Enable gzip compression
- Set appropriate resource limits

#### Development Optimizations
- Use volume caching
- Exclude unnecessary files
- Use development-specific configurations
- Enable file watching optimizations

## 📁 File Structure
```
/mnt/c/Users/20100/vsim2.0/
├── docker-compose.yml          # Production configuration
├── docker-compose.dev.yml      # Development configuration
├── .dockerignore              # Files to exclude from build
├── init-db.sql               # Database initialization
├── backend/
│   ├── Dockerfile            # Backend container definition
│   ├── requirements.txt      # Python dependencies
│   └── manage.py
├── frontend/
│   ├── Dockerfile            # Production frontend container
│   ├── Dockerfile.dev        # Development frontend container
│   ├── nginx.conf            # Nginx configuration
│   ├── package.json          # Node.js dependencies
│   └── src/
└── README-Docker.md          # This documentation
```

## 🎯 Next Steps

1. **Customize Configuration**: Update environment variables
2. **Set Up Monitoring**: Add logging and monitoring solutions  
3. **Configure HTTPS**: Set up SSL certificates
4. **Set Up CI/CD**: Automate builds and deployments
5. **Scale Services**: Configure horizontal scaling
6. **Add Backup Strategy**: Implement database backups
7. **Security Hardening**: Review and enhance security settings

## 📞 Support

For Docker-related issues:
1. Check container logs: `docker-compose logs -f`
2. Verify container health: `docker-compose ps`
3. Review this documentation
4. Check Docker and docker-compose versions