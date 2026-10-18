@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gelistirme-calistir.ps1" -Part frontend
if errorlevel 1 pause
