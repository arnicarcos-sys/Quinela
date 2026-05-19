@echo off
title Quinela Mundial 2026
echo.
echo  ================================================
echo       QUINELA MUNDIAL 2026
echo       FIFA World Cup - Mexico, USA, Canada
echo  ================================================
echo.
echo  Iniciando servidor...
echo.
cd /d "%~dp0"
start "" http://localhost:3000
node server.js
pause
