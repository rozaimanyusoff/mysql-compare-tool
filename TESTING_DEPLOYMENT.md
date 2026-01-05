# Testing & Deployment Guide

## Pre-Deployment Checklist

### Backend Testing

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Start Server**
   ```bash
   npm run dev
   ```
   
   Should see:
   ```
   Database initialized
   Server running on http://localhost:5000
   ```

3. **Test Health Endpoint**
   ```bash
   curl http://localhost:5000/api/health
   ```
   
   Expected response:
   ```json
   {"status": "ok"}
   ```

4. **Test Credential Creation**
   ```bash
   curl -X POST http://localhost:5000/api/credentials \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test DB",
       "host": "localhost",
       "port": 3306,
       "user": "root",
       "password": "password",
       "type": "local"
     }'
   ```

### Frontend Testing

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```
   
   Should see:
   ```
   VITE v5.0.8  ready in XXX ms
   ➜  Local:   http://localhost:3000/
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:3000`
   - Should see MySQL Compare Tool home page
   - Navigation tabs visible: Compare, Settings

## Manual Testing Workflow

### 1. Settings Page Testing

- [ ] Navigate to Settings tab
- [ ] Click "+ Add New Credential"
- [ ] Form appears with fields:
  - [ ] Name field
  - [ ] Host field
  - [ ] Port field
  - [ ] User field
  - [ ] Password field
  - [ ] Type dropdown (Local/Production)
- [ ] Fill in with valid MySQL credentials
- [ ] Click "Add Credential"
- [ ] Credential appears in list
- [ ] Click "Test" button - should show success/failure
- [ ] Edit credential - update a field
- [ ] Verify changes saved
- [ ] Delete credential - confirm deletion works

### 2. Comparison Page Testing

- [ ] Navigate to Compare tab
- [ ] Dropdown shows saved credentials
- [ ] Select Local Database credential
- [ ] Select Production Database credential
- [ ] Click "Load Databases" - list appears
- [ ] Select a database from dropdown
- [ ] Click "Compare Tables"
- [ ] View comparison results
- [ ] For each table, verify shows:
  - [ ] Table name
  - [ ] Local row count
  - [ ] Production row count
  - [ ] Status (identical records, modified, to add)
- [ ] Click "Sync Table" for a table with differences
- [ ] Confirm sync dialog appears
- [ ] Verify sync completes

### 3. Error Handling

- [ ] Try to compare with no credentials selected
- [ ] Try with invalid database credentials
- [ ] Try to add credential with duplicate name
- [ ] Network error simulation (stop backend)
- [ ] All should show appropriate error messages

## Automated Testing (Future)

### Backend Unit Tests
```bash
cd backend
npm test
```

### Frontend Component Tests
```bash
cd frontend
npm test
```

## Production Build

### Backend Production Build
```bash
cd backend
npm install --production
npm run build
NODE_ENV=production npm start
```

### Frontend Production Build
```bash
cd frontend
npm install --production
npm run build
# Output in frontend/dist/
```

## Deployment Options

### Option 1: Docker (Recommended)

**Dockerfile.backend**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.ts"]
```

**Dockerfile.frontend**:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Option 2: Traditional Server

**Backend**:
```bash
# SSH into server
ssh user@server.com

# Install Node.js if not present
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone <repo-url>
cd mysql-compare-tool/backend

# Install and build
npm install --production
npm run build

# Run with PM2 for persistence
sudo npm install -g pm2
pm2 start dist/index.js --name "mysql-compare-backend"
pm2 startup
pm2 save
```

**Frontend** (Nginx):
```bash
# Build locally
cd frontend
npm run build

# Upload dist/ folder to server
rsync -av dist/ user@server.com:/var/www/mysql-compare-tool/

# Configure Nginx
sudo nano /etc/nginx/sites-available/mysql-compare

# Add:
server {
    listen 80;
    server_name yourdomain.com;
    
    root /var/www/mysql-compare-tool;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 3: Cloud Platforms

**Heroku** (Backend):
```bash
cd backend
heroku create mysql-compare-backend
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

**Vercel** (Frontend):
```bash
cd frontend
npm install -g vercel
vercel --prod
```

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
```

### Frontend (.env)
```env
VITE_API_URL=https://api.yourdomain.com
```

## Performance Optimization

### Backend
- [ ] Enable gzip compression
- [ ] Set up connection pooling
- [ ] Add rate limiting
- [ ] Implement caching

### Frontend
- [ ] Enable code splitting
- [ ] Optimize images
- [ ] Set up CDN
- [ ] Configure caching headers

## Monitoring & Logging

### Backend Logs
```bash
# With PM2
pm2 logs mysql-compare-backend

# With systemd
journalctl -u mysql-compare-backend -f
```

### Frontend Errors
- Check browser console (F12)
- Check network tab for failed requests
- Set up error tracking (e.g., Sentry)

## Backup & Recovery

### Database Backup
```bash
# Backup credentials
cp backend/credentials.db backend/credentials.db.backup

# Or sync to cloud
aws s3 cp backend/credentials.db s3://backup-bucket/
```

### Quick Recovery
```bash
# Restore credentials
cp backend/credentials.db.backup backend/credentials.db
npm run dev:backend
```

## Performance Testing

### Load Testing Backend
```bash
npm install -g artillery

# Create artillery.yml
artillery quick --count 100 --num 10 http://localhost:5000/api/health

# Full test
artillery run load-test.yml
```

### Frontend Performance
- Use Chrome DevTools Lighthouse
- Check PageSpeed Insights
- Monitor Core Web Vitals

## Rollback Procedure

If issues occur:

1. **Stop Services**
   ```bash
   pm2 stop mysql-compare-backend
   ```

2. **Restore Previous Version**
   ```bash
   git checkout <previous-commit>
   npm install
   npm run build
   ```

3. **Restore Database**
   ```bash
   cp credentials.db.backup credentials.db
   ```

4. **Restart Services**
   ```bash
   pm2 start mysql-compare-backend
   ```

## Monitoring Checklist

- [ ] Backend health check endpoint working
- [ ] Frontend loads without errors
- [ ] API responses under 1 second
- [ ] Database connections stable
- [ ] Error logs reviewed
- [ ] Backup system working
- [ ] SSL/HTTPS configured (for production)

## Support & Troubleshooting

### Common Issues

**Issue**: Backend not connecting to databases
- Check credentials are correct
- Verify MySQL servers are accessible
- Check firewall rules

**Issue**: Frontend won't load
- Check backend is running
- Verify Vite proxy settings
- Check browser console for errors

**Issue**: Sync fails on large tables
- Check available memory
- Increase timeout values
- Process tables in smaller batches

## Success Criteria

✅ Application is ready for production when:
- All manual tests pass
- No errors in console or logs
- Response times are acceptable
- Credentials persist correctly
- Sync operations complete successfully
- Backup strategy tested

---

**Ready to deploy? Follow the checklist above!** 🚀
