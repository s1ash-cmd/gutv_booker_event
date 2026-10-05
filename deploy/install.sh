#!/usr/bin/env bash
# Provision once as /usr/local/sbin/gutv-event-deploy (root-owned). Never execute checkout shell as root.
set -euo pipefail
umask 0077
[[ ${EUID} -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
event_source=${1:?Supply the runner checkout path}
event_expected=/opt/gutv/actions-runners/event/_work/gutv_booker_event/gutv_booker_event
[[ $(realpath "$event_source") == "$event_expected" ]] || { echo 'Unexpected source path.' >&2; exit 1; }
cd "$event_expected"
test -f .next/standalone/server.js
test ! -L .next/standalone/server.js
test -d .next/static
test -f /etc/gutv-event.env
install -d -m 0755 /opt/gutv/event/releases
exec 9>/opt/gutv/event/.install.lock
flock -n 9 || { echo 'Another event deploy is running.' >&2; exit 1; }
install -d -o gutv-event -g gutv-event -m 0700 /var/lib/gutv-event
# The database location is fixed; the production JWT never enters the build or migrations.
event_database=file:/var/lib/gutv-event/event.sqlite3
event_previous=$(readlink /opt/gutv/event/current || true)
event_release="/opt/gutv/event/releases/$(date +%Y%m%d%H%M%S)"
install -d -m 0755 "$event_release"
cp -a .next/standalone/. "$event_release/"
install -d -m 0755 "$event_release/.next/static"
cp -a .next/static/. "$event_release/.next/static/"
if [[ -d public ]]; then cp -a public "$event_release/public"; fi
find "$event_release" -type f \( -name dev.db -o -name '.env*' \) -delete
chown -R root:root "$event_release"
find "$event_release" -type d -exec chmod 0755 {} +
find "$event_release" -type f -exec chmod 0644 {} +
# Online SQLite backup includes WAL data; no copying an open database file.
runuser -u gutv-event -- env -i PATH=/usr/bin:/bin HOME=/var/lib/gutv-event DATABASE_URL="$event_database" /usr/bin/node "$event_expected/deploy/backup-database.cjs"
# Migration code runs without root privileges. Failure aborts before switching the release.
runuser -u gutv-event -- env -i PATH=/usr/bin:/bin HOME=/var/lib/gutv-event DATABASE_URL="$event_database" /usr/bin/node "$event_expected/node_modules/prisma/build/index.js" migrate deploy
if [[ -n "$event_previous" ]]; then printf '%s\n' "$event_previous" > /opt/gutv/event/previous-release; fi
ln -s "$event_release" /opt/gutv/event/current.new
mv -Tf /opt/gutv/event/current.new /opt/gutv/event/current
systemctl enable gutv-event.service
systemctl restart gutv-event.service
event_ready=false
for event_attempt in {1..30}; do
  if curl --fail --silent --max-time 2 http://127.0.0.1:3010/api/health >/dev/null && curl --fail --silent --max-time 4 http://127.0.0.1:3010/ >/dev/null; then event_ready=true; break; fi
  sleep 1
done
if [[ "$event_ready" != true ]]; then
  journalctl -u gutv-event.service -n 30 --no-pager
  if [[ -n "$event_previous" ]]; then
    ln -s "$event_previous" /opt/gutv/event/current.rollback
    mv -Tf /opt/gutv/event/current.rollback /opt/gutv/event/current
    systemctl restart gutv-event.service
  else systemctl stop gutv-event.service; fi
  echo 'Event failed readiness; previous code restored. Database migrations are not automatically reversed.' >&2
  exit 1
fi
echo 'Event deployed: page and database available.'
