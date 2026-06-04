# Production Deployment

This project deploys a MERN application to AWS EC2 Ubuntu 24.04 using Docker, Docker Compose, GitHub Actions, Docker Hub, and MongoDB Atlas.

## Architecture

- Frontend: React/Vite built into static assets and served by Nginx.
- Backend: Node.js/Express API running in a private Docker Compose network.
- Routing: Nginx serves the frontend and proxies `/api` to the backend service.
- Database: MongoDB Atlas only. No MongoDB container is created.
- Registry: Docker Hub images are tagged with the Git SHA and `latest`.

## Required GitHub Secrets

Configure these in GitHub repository settings:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
EC2_HOST
EC2_USER
EC2_SSH_PRIVATE_KEY
SONAR_HOST_URL
SONAR_TOKEN
MONGODB_URI
JWT_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
```

`ADMIN_USERNAME` is used as the configured admin login email for the current application model.

## Optional GitHub Repository Variables

These are non-secret values only:

```text
REPO_NAME
NODE_ENV
FRONTEND_PUBLIC_SITE_URL
FRONTEND_PORT
BACKEND_PORT
```

Defaults:

- `REPO_NAME`: safely derived from the GitHub repository name
- `NODE_ENV`: `production`
- `FRONTEND_PORT`: `80`
- `BACKEND_PORT`: `5000`

Avoid `FRONTEND_PUBLIC_API_URL` for production. The frontend should call same-origin `/api` paths through Nginx.

## Docker Hub Images

The workflow builds and pushes:

```text
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-frontend:<git-sha>
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-frontend:latest
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-backend:<git-sha>
docker.io/<DOCKERHUB_USERNAME>/<REPO_NAME>-backend:latest
```

Production Compose uses the immutable Git SHA tag through `IMAGE_TAG`.

## EC2 Preparation

Install Docker and the Docker Compose plugin manually on Ubuntu 24.04 before the first deployment.

Verify installation:

```bash
docker --version
docker compose version
```

If the deploy user cannot run Docker:

```bash
sudo usermod -aG docker $USER
```

Sign out and back in after changing group membership.

Security group recommendations:

- Allow SSH `22` only from trusted IP addresses.
- Allow HTTP `80`.
- Allow HTTPS `443` only after TLS is configured.
- Do not expose MongoDB.
- Do not expose the backend port publicly unless there is a specific operational reason.

The workflow creates the deploy directory automatically:

```bash
sudo mkdir -p /opt/<repo-name>
sudo chown -R <ec2-user>:<ec2-user> /opt/<repo-name>
```

Do not create an `EC2_DEPLOY_PATH` secret. The path is derived as `/opt/${REPO_NAME}`.

## MongoDB Atlas

- Use MongoDB Atlas as the only database.
- Set `MONGODB_URI` as a GitHub secret.
- Whitelist the EC2 public IP in MongoDB Atlas Network Access.
- Avoid `0.0.0.0/0` in production except for temporary testing.
- Never commit MongoDB credentials.
- Do not expose MongoDB ports on EC2.

## CI/CD Workflow

Workflow file:

```text
.github/workflows/deploy.yml
```

Triggers:

- Push to `main`
- Manual `workflow_dispatch`

Pipeline:

1. Checkout repository.
2. Install frontend and backend dependencies with `npm ci`.
3. Run frontend/backend lint, tests, and build scripts when present.
4. Run separate npm audits for frontend and backend.
5. Run SonarQube scan.
6. Run Trivy filesystem scan before Docker build.
7. Build frontend and backend Docker images.
8. Run Trivy image scans before Docker push.
9. Push immutable Git SHA and `latest` tags to Docker Hub.
10. SSH into EC2.
11. Generate `/opt/<repo-name>/.env` from GitHub secrets and variables.
12. Upload `docker-compose.prod.yml`.
13. Pull the new images.
14. Recreate containers with Docker Compose.
15. Verify health.
16. Save rollback tag files.
17. Run `docker image prune -f` only after successful deployment.

The workflow does not run volume pruning or broad system pruning.

## Runtime Files On EC2

The workflow manages:

```text
/opt/<repo-name>/docker-compose.prod.yml
/opt/<repo-name>/.env
/opt/<repo-name>/CURRENT_IMAGE_TAG
/opt/<repo-name>/PREVIOUS_IMAGE_TAG
```

The `.env` file is generated on EC2 and must not be committed.

## Verify Deployment

SSH into EC2:

```bash
cd /opt/<repo-name>
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml exec -T frontend wget -qO- http://0.0.0.0:8080/health
docker compose -f docker-compose.prod.yml exec -T backend node -e "fetch('http://0.0.0.0:' + (process.env.PORT || 5000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Browser check:

```text
http://<ec2-public-ip>/
http://<ec2-public-ip>/api/health
```

## Logs

```bash
cd /opt/<repo-name>
docker compose -f docker-compose.prod.yml logs --tail=100 frontend
docker compose -f docker-compose.prod.yml logs --tail=100 backend
docker compose -f docker-compose.prod.yml logs -f
```

Do not print `.env` values in logs or support tickets.

## Manual Rollback

The workflow stores the active and previous image tags after each successful deployment.

Rollback flow:

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

Rollback is manual by design. Automatic rollback should only be added after health checks are strong enough for the application behavior.

## Security Checklist

- No secrets are committed.
- `.env` and `.env.*` are ignored, while `.env.example` remains trackable.
- Docker images do not receive secret build arguments.
- Frontend environment variables are public only.
- Backend validates required production secrets at startup.
- Backend does not print secret values.
- Backend is not publicly exposed by Compose.
- MongoDB Atlas is used through `MONGODB_URI`.
- Trivy scans fail on `HIGH` and `CRITICAL` findings.
- npm audit fails on high or critical findings.
- Docker image pruning happens only after a successful deployment.
- Docker volumes are not deleted by deployment.

## HTTPS/TLS Options

HTTP port `80` is exposed by the current Compose file. Add HTTPS later using one of these approaches:

- Caddy reverse proxy
- Nginx reverse proxy with Let's Encrypt
- AWS Application Load Balancer
- Cloudflare proxy

Do not commit private certificates or keys.
