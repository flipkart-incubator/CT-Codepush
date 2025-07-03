# 🚀 CodePush API Documentation Deployment Guide

This guide provides detailed instructions for deploying the CodePush API documentation (Swagger UI) to various environments.

## 📋 Prerequisites

- Node.js 16+ (for development)
- Web server (Nginx, Apache, or similar)
- Docker (optional, for containerized deployment)
- SSL certificate (recommended for production)

## 🎯 Deployment Options

### Option 1: Static File Hosting (Recommended)

The API documentation is built as static HTML files and can be hosted on any web server or CDN.

#### Deploy to Nginx

```bash
# Build the documentation (if needed)
cd docs

# Copy files to web server
sudo mkdir -p /var/www/codepush-docs
sudo cp -r * /var/www/codepush-docs/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/codepush-docs
sudo chmod -R 755 /var/www/codepush-docs
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name docs.your-domain.com;
    root /var/www/codepush-docs;
    index index.html;

    # Enable CORS for API testing
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
    add_header Access-Control-Allow-Headers "Authorization, Content-Type";

    # Handle static files
    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

#### Deploy to Apache

```bash
# Copy files to Apache document root
sudo cp -r docs/* /var/www/html/api-docs/

# Create .htaccess for configuration
sudo tee /var/www/html/api-docs/.htaccess << EOF
# Enable CORS
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Authorization, Content-Type"

# Cache static assets
<filesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</filesMatch>

# Enable compression
<ifModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</ifModule>
EOF
```

### Option 2: Docker Deployment

#### Using Official Nginx Image

**Create Dockerfile:**
```dockerfile
FROM nginx:alpine

# Copy documentation files
COPY docs/ /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Custom nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # API documentation
    location / {
        try_files $uri $uri/ =404;
        
        # CORS headers for API testing
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

**Build and Deploy:**
```bash
# Build the Docker image
docker build -t codepush-docs .

# Run the container
docker run -d \
  --name codepush-docs \
  -p 80:80 \
  --restart unless-stopped \
  codepush-docs

# Check if it's running
docker ps
curl http://localhost
```

#### Docker Compose Setup

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  codepush-docs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: codepush-docs
    ports:
      - "80:80"
    restart: unless-stopped
    networks:
      - codepush-network

  # Optional: SSL termination with Let's Encrypt
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost.d:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
    restart: unless-stopped
    networks:
      - codepush-network

  letsencrypt:
    image: nginxproxy/acme-companion
    container_name: letsencrypt
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./certs:/etc/nginx/certs
      - ./vhost.d:/etc/nginx/vhost.d
      - ./html:/usr/share/nginx/html
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    networks:
      - codepush-network

networks:
  codepush-network:
    driver: bridge
```

**Deploy with SSL:**
```bash
# Set environment variables for SSL
export VIRTUAL_HOST=docs.your-domain.com
export LETSENCRYPT_HOST=docs.your-domain.com
export LETSENCRYPT_EMAIL=your-email@domain.com

# Deploy with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option 3: Cloud Platform Deployment

#### Vercel Deployment

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "docs/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/docs/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Authorization, Content-Type"
        }
      ]
    }
  ]
}
```

**Deploy:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Custom domain (optional)
vercel domains add docs.your-domain.com
```

#### Netlify Deployment

**netlify.toml:**
```toml
[build]
  publish = "docs"

[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers = "Authorization, Content-Type"
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Deploy:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=docs

# Or connect to Git repository for automatic deployments
```

#### AWS S3 + CloudFront

**Deploy to S3:**
```bash
# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://codepush-docs-bucket

# Enable static website hosting
aws s3 website s3://codepush-docs-bucket \
  --index-document index.html \
  --error-document error.html

# Upload files
aws s3 sync docs/ s3://codepush-docs-bucket \
  --acl public-read \
  --delete

# Set CORS policy
aws s3api put-bucket-cors \
  --bucket codepush-docs-bucket \
  --cors-configuration file://cors.json
```

**cors.json:**
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**CloudFront Distribution:**
```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

#### Azure Static Web Apps

**Deploy to Azure:**
```bash
# Install Azure CLI
az login

# Create resource group
az group create --name codepush-docs-rg --location eastus

# Create static web app
az staticwebapp create \
  --name codepush-docs \
  --resource-group codepush-docs-rg \
  --source https://github.com/your-repo/ct-code-push \
  --location eastus \
  --branch main \
  --app-location "docs" \
  --api-location "" \
  --output-location ""
```

### Option 4: GitHub Pages

**GitHub Actions Workflow (.github/workflows/deploy-docs.yml):**
```yaml
name: Deploy Documentation

on:
  push:
    branches: [ main ]
    paths: [ 'docs/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
        cname: docs.your-domain.com
```

## 🔧 Configuration

### Environment-Specific Configuration

**Development:**
```bash
# Serve locally for development
cd docs
python3 -m http.server 3001
# or
npx serve . -p 3001
```

**Staging:**
```bash
# Use staging API URL
sed -i 's/${domain}/staging-codepush.cleartrip.com/g' docs/swagger.yaml
```

**Production:**
```bash
# Use production API URL
sed -i 's/${domain}/api.your-domain.com/g' docs/swagger.yaml
```

### SSL/HTTPS Configuration

**Let's Encrypt with Certbot:**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d docs.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Custom SSL Certificate:**
```nginx
server {
    listen 443 ssl http2;
    server_name docs.your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Your existing configuration...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name docs.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## 📊 Monitoring & Analytics

### Health Checks

**Basic Health Check:**
```bash
#!/bin/bash
# health-check.sh

URL="https://docs.your-domain.com"
EXPECTED_CODE=200

response=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $response -eq $EXPECTED_CODE ]; then
    echo "✅ Documentation site is healthy"
    exit 0
else
    echo "❌ Documentation site is down (HTTP $response)"
    exit 1
fi
```

**Advanced Health Check:**
```bash
#!/bin/bash
# advanced-health-check.sh

URL="https://docs.your-domain.com"
SWAGGER_URL="$URL/swagger.yaml"

# Check main page
main_response=$(curl -s -o /dev/null -w "%{http_code}" $URL)
# Check Swagger spec
swagger_response=$(curl -s -o /dev/null -w "%{http_code}" $SWAGGER_URL)

if [ $main_response -eq 200 ] && [ $swagger_response -eq 200 ]; then
    echo "✅ All documentation resources are healthy"
    exit 0
else
    echo "❌ Some documentation resources are down"
    echo "Main page: HTTP $main_response"
    echo "Swagger spec: HTTP $swagger_response"
    exit 1
fi
```

### Monitoring with Uptime Kuma

**docker-compose.monitoring.yml:**
```yaml
version: '3.8'

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - ./uptime-kuma-data:/app/data
    ports:
      - "3001:3001"
    restart: unless-stopped
```

## 🔒 Security Considerations

### Content Security Policy

```nginx
# Add to nginx configuration
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;
    img-src 'self' data: https:;
    font-src 'self' https://unpkg.com;
    connect-src 'self' https://${domain} https://api.your-domain.com;
" always;
```

### Rate Limiting

```nginx
# Add to nginx configuration
http {
    limit_req_zone $binary_remote_addr zone=docs:10m rate=10r/s;
    
    server {
        location / {
            limit_req zone=docs burst=20 nodelay;
            # Your existing configuration...
        }
    }
}
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] API server URLs updated in swagger.yaml
- [ ] SSL certificates obtained (for HTTPS)
- [ ] DNS records configured
- [ ] Firewall rules configured
- [ ] Backup strategy planned

### Deployment
- [ ] Files copied to web server
- [ ] Web server configuration updated
- [ ] SSL configuration applied
- [ ] Health checks configured
- [ ] Monitoring setup
- [ ] CDN configured (if applicable)

### Post-Deployment
- [ ] Verify all pages load correctly
- [ ] Test API endpoints from Swagger UI
- [ ] Check SSL certificate validity
- [ ] Verify CORS configuration
- [ ] Test from different browsers/devices
- [ ] Monitor error logs
- [ ] Set up automated health checks

## 🚨 Troubleshooting

### Common Issues

**CORS Errors:**
```bash
# Check CORS headers
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://docs.your-domain.com
```

**SSL Certificate Issues:**
```bash
# Check SSL certificate
openssl s_client -connect docs.your-domain.com:443 -servername docs.your-domain.com

# Verify certificate chain
curl -I https://docs.your-domain.com
```

**Performance Issues:**
```bash
# Check response times
curl -o /dev/null -s -w "Total time: %{time_total}s\n" https://docs.your-domain.com

# Check compression
curl -H "Accept-Encoding: gzip" -v https://docs.your-domain.com
```

### Log Analysis

**Nginx Access Logs:**
```bash
# Real-time log monitoring
tail -f /var/log/nginx/access.log

# Top requested pages
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# Error analysis
grep "ERROR" /var/log/nginx/error.log
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review web server error logs
3. Verify DNS and SSL configuration
4. Test locally before deploying to production

---

**Happy Deploying! 🚀** 