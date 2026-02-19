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

### 3. Create database
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS koperasi_db;"
```

### 4. Push schema (create tables)
```bash
npx prisma db push
```

### 5. Seed the database
```bash
npx prisma db seed
```

### 6. Start the app
```bash
npm run dev
```

The app will run at `http://localhost:3001`

---

## Login

This app uses **email-only login** (no password).  
Go to `/auth/login` and enter the email.

### Default Accounts (after seeding)

| Role         | Email                    | Referral Code |
|--------------|--------------------------|---------------|
| Superadmin   | `superadmin@eric.com`    | SA0001        |
| Admin        | `admin@eric.com`         | -             |
| Master Agent | `master1@eric.com`       | REF-MA001     |
| Master Agent | `master2@eric.com`       | REF-MA002     |
| Sub Agent    | `sub1@eric.com`          | REF-SA001     |
| Sub Agent    | `sub2@eric.com`          | REF-SA002     |
| Sub Agent    | `sub3@eric.com`          | REF-SA003     |

### Superadmin Login
Email: **`superadmin@eric.com`**

---

## NPM Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Start with nodemon (auto-reload)     |
| `npm start`        | Start in production mode             |
| `npm run db:push`  | Push Prisma schema to database       |
| `npm run db:migrate` | Run Prisma migrations              |
| `npm run db:studio`  | Open Prisma Studio (DB viewer)     |
