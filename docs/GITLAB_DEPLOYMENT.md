# GitLab CI/CD deployment

This project deploys only from the `enhancements` branch to the development
server at `192.168.1.183`.

## Pipeline

1. Install the locked Node.js dependencies.
2. Run ESLint and Vitest.
3. Build and push an immutable Docker image to the GitLab Container Registry.
4. Connect to the server with Ansible over SSH.
5. Write the runtime `.env`, pull the image, restart the Compose service, and
   verify port 1234.

The application listens on port 3000 inside the container. The deployment
publishes it on port 1234, so the expected URL is:

`http://192.168.1.183:1234/`

## GitLab project setup

Create a GitLab project and push this existing `enhancements` branch. Enable
the Container Registry. The GitLab runner must provide three tags:

- `build`: Node.js validation jobs
- `docker`: a runner able to pull `gcr.io/kaniko-project/executor:v1.21.0-debug`
- `deploy`: a runner allowed to install/use Ansible and reach `192.168.1.183`

Add these CI/CD variables. Secrets should be masked and protected according to
the team’s branch policy:

| Variable | Type | Purpose |
| --- | --- | --- |
| `DEPLOY_SSH_PRIVATE_KEY` | Variable | Private SSH key for the `deploy` user |
| `DEPLOY_SSH_KNOWN_HOSTS` | Variable | Pre-approved `known_hosts` entry for `192.168.1.183` |
| `APP_RUNTIME_ENV_FILE` | File | Production runtime values (`DATABASE_URL`, `JWT_SECRET`, and app settings) |
| `REGISTRY_CA_CERT` | File | Root/intermediate CA that signs `gitlab.pps.local:5050`; required if the runner CA is not automatically available |

The runtime environment file must contain a database reachable from the
development server. Do not commit it or pass it as a normal repository file.

## Database migration decision

The repository contains Prisma migrations, but the deployment job does not
run them automatically. Before the first deployment, confirm whether the
database is new or already contains MASA data, then choose a controlled
migration procedure (`prisma migrate deploy` for tracked migrations, or the
existing `db:push` flow only when explicitly approved). This prevents a CI
deployment from changing the schema unexpectedly.

## Server prerequisites

The server owner must confirm all of the following before the first deploy:

- SSH access for `deploy` using the configured key.
- Docker Engine and the Docker Compose v2 plugin are installed.
- `deploy` can run Docker commands and write `/opt/apps/masa`.
- `192.168.1.183:1234` is available, or the port mapping is changed in GitLab.
- The server can reach the GitLab Container Registry over HTTPS.
- The build job can trust the GitLab registry certificate through `CI_SERVER_TLS_CA_FILE` or `REGISTRY_CA_CERT`.
- The database host in `APP_RUNTIME_ENV_FILE` is reachable from the container.

The first deployment should be run manually with the server owner present so
that registry access, database connectivity, and port ownership can be
verified together.

## Local Docker smoke test

Copy `.env.example` to `.env`, set safe development values, then run:

```bash
docker compose up --build
```

The local default URL is `http://localhost:3000`. Do not use production
secrets for this test.
