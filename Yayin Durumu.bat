@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
python -X utf8 "deploy\status.py"
pause
