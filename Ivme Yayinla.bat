@echo off
setlocal
cd /d "%~dp0"
python -X utf8 deploy\release.py %*
set "release_exit=%errorlevel%"
pause
exit /b %release_exit%
