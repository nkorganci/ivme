@echo off
rem Hedef YKS on yuz (React + Vite, port 5173). /api istekleri 8081'deki arka yuze yonlendirilir.
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Bagimliliklar kuruluyor...
  call npm install
)
call npm run dev
pause
