#!/bin/bash
# Runs the API and web processes side by side in one container. If either
# exits, the whole container exits (via `wait -n`, a bash-ism — hence the
# bash shebang instead of sh/dash) so Docker's restart policy takes over — a
# half-alive container serving stale/broken responses is worse than a clean restart.
set -e

cd /repo/apps/api && PORT=4000 /repo/node_modules/.bin/tsx src/server.ts &
API_PID=$!

cd /repo && HOSTNAME=0.0.0.0 PORT=3000 INTERNAL_API_URL=http://127.0.0.1:4000 node apps/web/server.js &
WEB_PID=$!

trap 'kill -TERM $API_PID $WEB_PID 2>/dev/null' TERM INT

wait -n $API_PID $WEB_PID
exit $?
