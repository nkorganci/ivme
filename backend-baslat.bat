@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gelistirme-calistir.ps1" -Part backend
if errorlevel 1 pause
