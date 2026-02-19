# Eric - Koperasi Submission System

## Setup on New Server

### 1. Install dependencies
```bash
npm install
```

### 2. Configure `.env`
Copy `ENVFORM.txt` to `.env` and update the values:
```
PORT=3001
SESSION_SECRET=change_this_to_a_strong_secret_key
DATABASE_URL="mysql://root:@localhost:3306/koperasi_db"
ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
APIMART_API_KEY=your_api_key_here
```

### 3. Start the app
```bash
npm run dev
```

The database and tables are **automatically created** on first run.  
The app will run at `http://localhost:3001`

### 4. Create Superadmin (one-time)

On first run, visit:
```
http://localhost:3001/setup
```

Enter your **name** and **email** to create the superadmin account.  
This page **only works once** — after a superadmin is created, it redirects to login and cannot be accessed again.

---

## Login

This app uses **email-only login** (no password).  
Go to `/auth/login` and enter the email.

---

## NPM Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Start with nodemon (auto-reload)     |
| `npm start`        | Start in production mode             |
| `npm run db:push`  | Push Prisma schema to database       |
| `npm run db:migrate` | Run Prisma migrations              |
| `npm run db:studio`  | Open Prisma Studio (DB viewer)     |
