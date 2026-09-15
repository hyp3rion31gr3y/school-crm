# School CRM - Local Development Guide

This guide provides step-by-step instructions to get the School CRM stack running locally for development and testing. The architecture uses a containerized PostgreSQL database and Node.js backend, with a locally hosted React (Vite) frontend.

## Prerequisites

* **Node.js (LTS):** Required to run and build the React frontend.
* **Git:** To clone the repository.
* **Linux Users:** Install `podman` and `podman-compose` (Docker and Docker Compose work identically).
* **Windows Users:** Install **Docker Desktop** and ensure the WSL2 backend is enabled during setup.

---

## 1. Clone and Configure

First, download the code and set up the required environment variables. Open your terminal or PowerShell and run:

```bash
git clone <your-repository-url>
cd school-crm
```

Create a `.env` file in the root directory for the backend containers. This sets up the database credentials and API secrets:

```ini
POSTGRES_USER=postgres
POSTGRES_PASSWORD=localpassword
POSTGRES_DB=school_crm
DATABASE_URL=postgresql://postgres:localpassword@postgres:5432/school_crm
JWT_SECRET=local-secret-key
CORS_ORIGIN=http://localhost:5173
PORT=4000
```

Create a `.env` file inside the `frontend/` directory to link the UI to the API:

```ini
VITE_API_URL=http://localhost:4000
```

## 2. Start the Backend Stack

Boot up the PostgreSQL database and the Node.js API containers in the background.

For Linux (using Podman):

```bash
podman-compose up -d --build
```

For Windows (using Docker Desktop):

```powershell
docker compose up -d --build
```

## 3. Initialize the Database

The database container is running but empty. You need to push the Prisma schema to create the tables and inject the initial admin account.

For Linux:

```bash
# Push the schema
podman-compose exec backend npx prisma db push

# Seed the admin account
podman-compose exec backend node -e "const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcryptjs'); const prisma = new PrismaClient(); async function seed() { const hash = await bcrypt.hash('password123', 10); await prisma.users.create({ data: { email: 'principal@school.local', password_hash: hash, role: 'PRINCIPAL' } }); console.log('Account seeded.'); } seed();"
```

For Windows:

```powershell
# Push the schema
docker compose exec backend npx prisma db push

# Seed the admin account
docker compose exec backend node -e "const { PrismaClient } = require('@prisma/client'); const bcrypt = require('bcryptjs'); const prisma = new PrismaClient(); async function seed() { const hash = await bcrypt.hash('password123', 10); await prisma.users.create({ data: { email: 'principal@school.local', password_hash: hash, role: 'PRINCIPAL' } }); console.log('Account seeded.'); } seed();"
```

## 4. Start the Frontend

Open a new terminal or PowerShell tab, navigate to the frontend folder, install the Vite dependencies, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

## 5. Log In

Open your web browser and navigate to http://localhost:5173. You can log in using the seeded test credentials:

* Email: principal@school.local
* Password: password123

## Troubleshooting

* **Cannot connect to API:** Ensure the backend container is running by typing `podman-compose ps` (or `docker compose ps`).
* **User not found during login:** The database seed script likely did not run. Repeat step 3.
* **Port in use error:** Ensure no other local services are running on ports 4000 (Backend), 5432 (Postgres), or 5173 (Vite).
