@echo off
setlocal
cd /d "%~dp0"
echo Starting random Gaeme...
echo.
echo Open this URL in your browser:
echo http://localhost:4173/bloodroot-citadel.html
echo.
echo For phone testing, use your computer's local network IP with the same port.
echo Keep this window open while playing.
echo.
node dev-server.mjs
