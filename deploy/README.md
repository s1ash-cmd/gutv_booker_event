# Production deployment

URL: https://event.gutvbooker.ru. Next.js standalone on loopback 127.0.0.1:3010, systemd `gutv-event.service`, user `gutv-event`, Nginx HTTPS. The existing GUtv backend and frontend are separate services.

## Persistent data

The first deployment creates a **new empty SQLite database** through `prisma migrate deploy`. The tracked development `dev.db` is never deployed. Production database: `/var/lib/gutv-event/event.sqlite3` (directory 0700, service UMask 0077). Profiles, sessions and avatars remain in this database across releases. No demo accounts or events are seeded.

Production `/etc/gutv-event.env` is root-owned 0600:

```dotenv
DATABASE_URL=file:/var/lib/gutv-event/event.sqlite3
JWT_SECRET=<random-secret-generated-on-server-at-least-32-bytes>
JWT_ISSUER=https://event.gutvbooker.ru
JWT_AUDIENCE=gutv-event
JWT_EXPIRE_MINUTES=15
```

Secrets do not enter GitHub or the build. CI uses unrelated placeholders.

## GitHub Actions

`Event CI and deploy`: hosted CI installs dependencies, generates Prisma, checks TypeScript, runs the existing tests and builds Next.js. Only a successful push to `master` or manual launch on `master` deploys. Pull requests and other branches execute hosted checks only. Runner `gutv-event-server` has label `gutv-event` and a separate Linux user. All external contributors require approval for fork workflows. Review any external workflow before approving it; see [GitHub runner security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#hardening-for-self-hosted-runners).

The runner has sudo permission only for root-owned `/usr/local/sbin/gutv-event-deploy`. Provision this once from reviewed `deploy/install.sh`; changes to this installer require separately updating the root-owned copy. The workflow does not execute checkout shell scripts as root. The checkout path is fixed in the installer. Unit and Nginx configuration are also provisioned once by the administrator.

The installer copies the Linux build into `/opt/gutv/event/releases`, creates an online SQLite backup (including WAL) before migrations, runs Prisma as the application user, switches `current` atomically, restarts the service and checks both `/api/health` and the main page. `/api/health` executes `SELECT 1` without exposing records. Dashboard monitors this probe plus page response and systemd state.

14 most recent pre-deployment backups: `/var/lib/gutv-event/backups`. They protect against deployment errors; they are on the same disk and do not replace off-server backups. First deploy has no prior database to back up.

If readiness fails, previous code is restored. Database migrations are **not automatically reversed**: restore a selected backup only after stopping the service and considering changes made after that backup.

## Operations

```bash
sudo systemctl status gutv-event.service
sudo journalctl -u gutv-event.service -n 50 --no-pager
curl --fail http://127.0.0.1:3010/api/health
```

Do not open port 3010 to the internet. TLS certificate `/etc/letsencrypt/live/gutv-services` is renewed by `certbot-renew.timer`, with an Nginx reload deploy hook. HTTP redirects to HTTPS except the ACME challenge location.
