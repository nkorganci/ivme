@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iki-ortami-baslat.ps1"
if errorlevel 1 pause
