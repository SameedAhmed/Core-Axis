# DigiXCrm VPS Deployment Guide 🚀

This guide walks you through perfectly migrating your entire `DigiXCrm` instance (the codebase and your active loaded PostgreSQL database) from your local Windows machine to a Live Linux VPS (Ubuntu 22.04 or newer).

---

## Phase 1: Local Preparation (On your Windows Machine)

First, we need to carefully pack your application and capture a snapshot dump of your database containing all your leads and deals.

### 1. Dump Your Local Database
Open your **Command Prompt** (or Git Bash / PowerShell) and run the `pg_dump` tool using its full installation path.
```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d crm -h localhost -F c -f crm_backup.dump
```
> **Tip:** If it asks for a password, enter your local database password (`#@#@aDm1n#@#@`). This creates a file named `crm_backup.dump` in your current folder.

### 2. Zip Your Project Code
You need to move your `CRMv2` folder to your server, but **exclude** the heavy `node_modules` and `.next` folder because we will generate fresh, optimized versions of those on the Linux server.
1. Open your `CRMv2` folder.
2. DELETE the `node_modules` and `.next` folders. (Don't worry, they rebuild easily).
3. Select all remaining files (including `crm_backup.dump`, `.env`, `package.json`, etc) -> Right Click -> "Compress to ZIP file". Name it `crm-app.zip`.

---

## Phase 2: VPS Server Setup (On your Linux Server)

Connect to your Linux VPS terminal via SSH:
```bash
ssh root@your-server-ip
```

### 1. Install Required Software (Node.js, Postgres & Nginx)
Run this block to install everything the CRM needs to run:
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Nginx (For web routing) and PostgreSQL (For database)
sudo apt install nginx postgresql postgresql-contrib unzip -y

# Install Node.js (Latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Keeps your Next.js app running forever in the background)
sudo npm install -g pm2
```

### 2. Configure the Live Database
We need to create the database on the Linux server so we can import your data into it.
```bash
# Switch to Postgres user and open terminal
sudo -i -u postgres
psql

# Inside the PSQL terminal, paste:
CREATE DATABASE crm;
ALTER USER postgres WITH PASSWORD '#@#@aDm1n#@#@';
\q

# Exit postgres user back to root
exit
```

---

## Phase 3: Upload and Restore

### 1. Upload Your Files
You can upload `crm-app.zip` via an FTP client like **FileZilla** or **WinSCP**. Upload it to your root directory or `/var/www/`. 

### 2. Unzip and Restore Your Database
Assuming you uploaded the file to `/var/www/digisales`:
```bash
mkdir -p /var/www/digisales
cd /var/www/digisales
unzip /path/to/your/crm-app.zip # (Adjust path to where you uploaded it)

# Now, restore your dumped database file into the live Postgres server!
pg_restore -U postgres -d crm -1 crm_backup.dump
```

---

## Phase 4: Build and Launch 🚀

Now that the code and database are there, let's spin it up!

### 1. Install & Build
```bash
cd /var/www/digisales

# Re-install dependencies specific to Linux
npm install

# Connect Prisma ORM
npx prisma generate

# Build the optimized production application (Takes a minute)
npm run build
```

### 2. Start the App Permanently
```bash
pm2 start npm --name "digisales" -- start
pm2 save
pm2 startup
```
*Your app is now running on `localhost:3000` internally on your server permanently.*

---

## Phase 5: Routing Web Traffic (Nginx & SSL)

We need Nginx to forward traffic from port `80` (HTTP) and `443` (HTTPS) to your running app.

### 1. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/digisales
```
Paste the following, replacing `yourdomain.com` with your actual domain name:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
Save and enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/digisales /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Secure with HTTPS (Free SSL Certificate)
Run Certbot to instantly secure your domain with SSL:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**🎉 YOU'RE DONE!**
Navigate to `https://yourdomain.com` and you will see your live DigiXCrm packed with all your local leads and configurations smoothly running on the web!
