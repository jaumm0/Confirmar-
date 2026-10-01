@echo off
title Cha de Fralda - ONLINE
cd /d "%~dp0"

echo ============================================
echo   Cha de Fralda - colocando no ar (HTTPS)
echo ============================================
echo.

echo [1/2] Iniciando servidor local na porta 3000...
start "servidor-cha" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo [2/2] Criando tunel Cloudflare (URL descartavel)...
echo.
echo >>> A URL publica aparece abaixo, na linha trycloudflare.com <<<
echo >>> Envie ela no grupo. Fechando esta janela, o link para de funcionar. <<<
echo.
cloudflared tunnel --url http://localhost:3000