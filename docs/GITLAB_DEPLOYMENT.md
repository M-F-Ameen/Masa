# GitLab CI/CD deployment

This project deploys only from the `develop` branch to the development
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

Create a GitLab project and push this existing `develop` branch. Enable
the Container Registry. The GitLab runner must provide three tags:

- `build`: Node.js validation jobs
- `docker`: the standard runner used by the company template (uses its pre-configured Docker daemon, which already trusts the internal registry)
- `deploy`: a runner allowed to install/use Ansible and reach `192.168.1.183`

Add these CI/CD variables. Secrets should be masked and protected according to
the team’s branch policy:

| Variable | Type | Purpose |
| --- | --- | --- |
| `DEPLOY_SSH_PRIVATE_KEY` | Variable | Private SSH key for the `deploy` user |
| `DEPLOY_SSH_KNOWN_HOSTS` | Variable | Pre-approved `known_hosts` entry for `192.168.1.183` |
| `APP_RUNTIME_ENV_FILE` | File | Production runtime values (`DATABASE_URL`, `JWT_SECRET`, and app settings) |

The runtime environment file must contain a database reachable from the
development server. Do not commit it or pass it as a normal repository file.

Each variable must be exposed to the deploying branch. If a variable is marked
**Protected**, it is only injected on protected branches, so either uncheck
**Protected** or protect `develop` (Settings → Repository → Protected branches).
An unavailable or empty `APP_RUNTIME_ENV_FILE` fails the deploy job with a clear
message.

## Database connectivity from Docker

The application runs inside a Docker container. If MySQL is installed on the
host OS of the deployment server (`192.168.1.183`), you **must not** use
`localhost` or `127.0.0.1` in `DATABASE_URL` — those resolve to the container
itself, not the host.

Use the special `host-gateway` hostname instead (added automatically by
`extra_hosts` in the Compose template):

```
DATABASE_URL="mysql://masa_app:YOUR_PASSWORD@host-gateway:3306/resto_db"
```

`host-gateway` is resolved by Docker to the host's bridge IP (usually
`172.17.0.1`) so the container can reach a MySQL instance running on the host.

Before deploying, confirm on the server that:
1. MySQL is listening on `0.0.0.0` (not just `127.0.0.1`):
   - Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` → set `bind-address = 0.0.0.0`
   - Restart: `sudo systemctl restart mysql`
2. The MySQL user allows connections from `%` (any host):
   ```sql
   CREATE USER IF NOT EXISTS 'masa_app'@'%' IDENTIFIED BY 'YOUR_PASSWORD';
   GRANT ALL PRIVILEGES ON resto_db.* TO 'masa_app'@'%';
   FLUSH PRIVILEGES;
   ```
3. Update `APP_RUNTIME_ENV_FILE` in GitLab CI/CD Variables with the correct
   `host-gateway` URL above.

## Health check endpoint

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
- The `docker` runner can reach the GitLab Container Registry (its daemon trusts the internal certificate, as in the company template).
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
