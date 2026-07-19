# 🚀 DigiXCrm Production Deployment Guide (Ubuntu/Hostinger VPS)

This guide provides step-by-step instructions for deploying the **DigiXCrm Enterprise CRM** to a clean Ubuntu VPS. We will use **Supervisor** for process management, **PostgreSQL** for the database, and **Nginx** as a reverse proxy.

---

## 📋 1. Prerequisites & System Updates

Update your package manager and install core dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx supervisor postgresql postgresql-contrib

# Install Node.js (v20 LTS recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 🗄️ 2. Database User & Schema Setup

The CRM requires a dedicated PostgreSQL database and user.

```bash
# Enter PostgreSQL shell
sudo -i -u postgres psql

# Create User and Database (Replace 'password' with a strong one)
CREATE USER digixcrm_admin WITH PASSWORD 'digixcrm_secure_pass';
CREATE DATABASE digixcrm_db OWNER digixcrm_admin;
\q
```

---

## 🛠️ 3. Application Setup

Clone your repository and configure the environment.

```bash
# Navigate to web root
cd /var/www
sudo mkdir -p digixcrm
sudo chown $USER:$USER digixcrm
cd digixcrm

# Clone Repository
git clone <YOUR_REPO_URL> .

# Install Dependencies
npm install

# Configure Environment
cp .env.example .env 
# Edit .env with your production values (DB URL, NextAuth Secret, etc.)
nano .env
```

**Production DATABASE_URL example:**
`postgresql://digixcrm_admin:digixcrm_secure_pass@localhost:5432/digixcrm_db?schema=public`

### Initialize Database & Build
```bash
npx prisma generate
npx prisma db push
npm run build
```

---

## ⚙️ 4. Supervisor Configuration (Process Management)

Unlike PM2, **Supervisor** is a robust system-level process manager. Create a configuration for DigiSales.

```bash
sudo nano /etc/supervisor/conf.d/digisales.conf
```

**Paste the following:**
```ini
[program:digisales]
command=npm start
directory=/var/www/digisales
autostart=true
autorestart=true
stderr_logfile=/log/digisales/digisales.err.log
stdout_logfile=/log/digisales/digisales.out.log
user=root
environment=NODE_ENV="production",PORT="3000"
```

**Create log directory and start:**
```bash
sudo mkdir -p /log/digisales
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start digisales
```

---

## 🌐 5. Nginx Reverse Proxy Setup

Configure Nginx to serve the app on your domain.

```bash
sudo nano /etc/nginx/sites-available/digisales
```

**Paste the following:**
```nginx
server {
    listen 80;
    server_name yourdomain.com; # Replace with your actual domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable and Restart:**
```bash
sudo ln -s /etc/nginx/sites-available/digisales /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 6. SSL Security (Certbot)

Deploy SSL certificates to enable HTTPS.

```bash
sudo apt install -y python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🛑 Important Operations Commands

- **Check Logs**: `sudo tail -f /log/digisales/digisales.out.log`
- **Restart App**: `sudo supervisorctl restart digisales`
- **Stop App**: `sudo supervisorctl stop digisales`
- **Check Status**: `sudo supervisorctl status`

---

### **Final Deployment Checklist**
1. [ ] Port **3000** is open in VPS Firewall (if required).
2. [ ] `.env` has the correct `NEXT_PUBLIC_APP_URL`.
3. [ ] Prisma migrations are synced with the production DB.
4. [ ] Supervisor is reporting `RUNNING` status.
