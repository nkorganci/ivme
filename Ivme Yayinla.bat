@echo off
setlocal
cd /d "%~dp0"
git branch --show-current | findstr /x test >nul || exit /b 2
git diff --cached --quiet || (git commit -m "Publish selected ivme changes" || exit /b 1)
git push ivme refs/heads/test:refs/heads/production
if errorlevel 1 pause
exit /b %errorlevel%
