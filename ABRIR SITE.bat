@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -WindowStyle Hidden -Command "if (-not (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -WindowStyle Hidden -FilePath python -ArgumentList '-m','http.server','8080','--bind','127.0.0.1' -WorkingDirectory '%~dp0' }"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8080/index.html"
endlocal
