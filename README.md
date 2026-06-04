# O Level Stars

O Level Stars is a full-stack learning platform built with a React/Vite frontend, a Node.js/Express backend, and MongoDB Atlas. Production deployment is automated through GitHub Actions, Docker Hub, and Docker Compose on an AWS EC2 Ubuntu 24.04 server.

## Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Mongoose
- Database: MongoDB Atlas
- Runtime: Docker and Docker Compose
- Registry: Docker Hub
- CI/CD: GitHub Actions
- Security checks: npm audit, SonarQube, Trivy filesystem scan, Trivy image scan

## Architecture

Production runs two containers:

- `frontend`: Nginx serves the Vite static build and proxies `/api` to the backend.
- `backend`: Express API runs inside the private Docker Compose network.

MongoDB is not deployed as a container. The backend connects only to MongoDB Atlas through `MONGODB_URI`.

```text
Browser
  |
  | HTTP :80
  v
Frontend Nginx container
  |
  | /api over Docker network
  v
Backend Express container
  |
  | TLS connection
  v
MongoDB Atlas
```

## Repository Layout

```text
.
|-- backend/
|   |-- src/
|   |-- scripts/
|   |-- Dockerfile
|   |-- package.json
|   `-- .env.example
|-- frontend/
|   |-- src/
|   |-- public/
|   |-- Dockerfile
|   |-- nginx.conf.template
|   |-- package.json
|   `-- .env.example
|-- .github/workflows/deploy.yml
|-- docker-compose.prod.yml
|-- DEPLOYMENT.md
|-- sonar-project.properties
`-- README.md
```

## Local Development

Prerequisites:

- Node.js 22 recommended, Node.js `>=18.18.0` supported by the backend
- npm
- MongoDB Atlas database URI

Install dependencies:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

Create local environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Backend local environment:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=replace_me
JWT_SECRET=replace_me
JWT_EXPIRY=7d
ADMIN_USERNAME=replace_me
ADMIN_PASSWORD=replace_me
ADMIN_NAME=Scholastica Admin
CORS_ORIGIN=http://localhost:5173
FRONTEND_PUBLIC_SITE_URL=http://localhost:5173
```

Frontend local environment:

```env
VITE_API_URL=http://localhost:5000
VITE_BASE_PATH=/
VITE_DEV_PORT=5173
VITE_DEV_PROXY_TARGET=http://localhost:5000
```

Run the application locally:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Production Configuration

Production is configured through GitHub Actions secrets and repository variables. Do not commit real `.env` files, private keys, tokens, passwords, or MongoDB connection strings.

The workflow derives the EC2 deploy path automatically:

```text
/opt/<repo-name>
```

Do not create an `EC2_DEPLOY_PATH` secret.

## GitHub Secrets To Add Manually

Add these manually in:

```text
GitHub repository > Settings > Secrets and variables > Actions > Secrets
```

| Secret | Required | Description |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Yes | Docker Hub username used to push and pull production images. |
| `DOCKERHUB_TOKEN` | Yes | Docker Hub access token, not the account password. |
| `EC2_HOST` | Yes | EC2 public IP address or DNS name. |
| `EC2_USER` | Yes | Ubuntu SSH user used for deployment, for example `ubuntu`. |
| `EC2_SSH_PRIVATE_KEY` | Yes | Private SSH key that can connect to the EC2 instance. |
| `SONAR_HOST_URL` | Yes | SonarQube server URL. |
| `SONAR_TOKEN` | Yes | SonarQube token used by the scanner. |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string. |
| `JWT_SECRET` | Yes | Strong random secret used to sign JWTs. |
| `ADMIN_USERNAME` | Yes | Admin login email for the current application model. |
| `ADMIN_PASSWORD` | Yes | Strong initial/admin sync password. |

Keep these values secret. Never paste them into source code, issues, logs, screenshots, artifacts, or documentation.

## Optional GitHub Repository Variables

Add these in:

```text
GitHub repository > Settings > Secrets and variables > Actions > Variables
```

| Variable | Default | Description |
| --- | --- | --- |
| `REPO_NAME` | GitHub repository name | Used for Docker image names and `/opt/<repo-name>`. |
| `NODE_ENV` | `production` | Runtime environment for the backend. |
| `FRONTEND_PUBLIC_SITE_URL` | empty | Public frontend origin used for CORS when a domain is configured. |
| `FRONTEND_PORT` | `80` | Host port exposed by the frontend container. |
| `BACKEND_PORT` | `5000` | Internal backend container port. |

Repository variables must not contain secrets.

## Docker Images

The deployment workflow builds and pushes:

```text
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-frontend:<git-sha>
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-frontend:latest
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-backend:<git-sha>
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-backend:latest
```

Production uses immutable Git SHA tags through `IMAGE_TAG`.

## CI/CD Pipeline

Workflow file:

```text
.github/workflows/deploy.yml
```

Triggers:

- Push to `main`
- Manual `workflow_dispatch`

Pipeline summary:

1. Check out the repository.
2. Install frontend and backend dependencies with `npm ci`.
3. Run lint, tests, and builds when scripts exist.
4. Run npm audit separately for frontend and backend.
5. Run SonarQube scan.
6. Run Trivy filesystem scan before Docker build.
7. Build frontend and backend Docker images.
8. Run Trivy image scans before Docker push.
9. Push Git SHA and `latest` tags to Docker Hub.
10. SSH into EC2.
11. Generate `/opt/<repo-name>/.env` from GitHub secrets and variables.
12. Upload `docker-compose.prod.yml`.
13. Pull the new images.
14. Recreate containers with Docker Compose.
15. Verify container health.
16. Save `CURRENT_IMAGE_TAG` and `PREVIOUS_IMAGE_TAG`.
17. Run `docker image prune -f` after successful deployment only.

The workflow does not delete Docker volumes.

## EC2 Preparation

Use AWS EC2 Ubuntu 24.04.

Install Docker and the Docker Compose plugin manually before deployment, then verify:

```bash
docker --version
docker compose version
```

If the deployment user cannot run Docker:

```bash
sudo usermod -aG docker $USER
```

Sign out and back in after changing group membership.

Recommended EC2 security group:

- Allow SSH `22` only from trusted IP addresses.
- Allow HTTP `80`.
- Allow HTTPS `443` only after TLS is configured.
- Do not expose MongoDB.
- Do not expose the backend port publicly unless there is a specific reason.

## MongoDB Atlas Setup

- Create or use a MongoDB Atlas cluster.
- Store the Atlas URI only in the GitHub `MONGODB_URI` secret.
- Whitelist the EC2 public IP in MongoDB Atlas Network Access.
- Avoid `0.0.0.0/0` in production except for temporary testing.
- Do not expose MongoDB ports on EC2.

## Deployment

Deploy automatically by pushing to `main`:

```bash
git push origin main
```

Or trigger manually:

```text
GitHub repository > Actions > Deploy to EC2 > Run workflow
```

## Verify Production

On EC2:

```bash
cd /opt/<repo-name>
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

Health checks:

```bash
docker compose -f docker-compose.prod.yml exec -T frontend wget -qO- http://0.0.0.0:8080/health
docker compose -f docker-compose.prod.yml exec -T backend node -e "fetch('http://0.0.0.0:' + (process.env.PORT || 5000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Browser checks:

```text
http://<ec2-public-ip>/
http://<ec2-public-ip>/api/health
```

## Rollback

The deployment saves rollback tags on EC2:

```text
/opt/<repo-name>/CURRENT_IMAGE_TAG
/opt/<repo-name>/PREVIOUS_IMAGE_TAG
```

Manual rollback:

```bash
ssh <ec2-user>@<ec2-host>
cd /opt/<repo-name>
previous_tag="$(cat PREVIOUS_IMAGE_TAG)"
if grep -q '^IMAGE_TAG=' .env; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG='$previous_tag'/" .env
else
  printf "IMAGE_TAG='%s'\n" "$previous_tag" >> .env
fi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
```

## Security Notes

- Do not commit real `.env` files.
- Do not commit private keys, tokens, passwords, or certificates.
- Do not pass secrets as frontend build arguments.
- Frontend variables must be public-only `VITE_*` values.
- Backend production startup fails if required secrets are missing.
- Backend logs must not print secret values.
- Production routing should use same-origin `/api` through Nginx.
- Docker images are scanned before push.
- Unused Docker images are pruned only after successful deployment.
- Docker volumes are not pruned by the deployment workflow.

## HTTPS/TLS

The current production Compose file exposes HTTP on port `80`. Add HTTPS later using one of these options:

- Caddy reverse proxy
- Nginx reverse proxy with Let's Encrypt
- AWS Application Load Balancer
- Cloudflare proxy

Do not commit private certificates or keys.

## More Details

See `DEPLOYMENT.md` for the full production operations runbook.
