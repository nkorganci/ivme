@echo off
setlocal
cd /d "%~dp0"
python -X utf8 "deploy\local_fixture.py" ivme
if errorlevel 1 pause
