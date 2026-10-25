#!/bin/bash
# JobKG — запуск локального сервера на macOS (двойной щелчок в Finder или ./start-macos.command в Терминале).
# Нужен Python 3 (входит в Xcode Command Line Tools). Остановка: Ctrl+C.
cd "$(dirname "$0")" || exit 1
PORT=8000
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done
URL="http://localhost:$PORT/index.html"
echo "JobKG запущен: $URL"
echo "Остановить сервер: Ctrl+C"
(sleep 1; open "$URL") &
exec python3 -m http.server "$PORT"
