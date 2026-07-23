@echo off
setlocal
set "ROOT_DIR=%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%ROOT_DIR%scripts\mindris.py" %*
  exit /b %errorlevel%
)

where python >nul 2>nul
if %errorlevel%==0 (
  python "%ROOT_DIR%scripts\mindris.py" %*
  exit /b %errorlevel%
)

echo Python 3.12 ou superieur est requis.
exit /b 2
