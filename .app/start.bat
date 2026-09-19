@echo off
if exist "C:\Users\h1465\scoop\apps\nodejs-lts\current" (
  set "PATH=C:\Users\h1465\scoop\apps\nodejs-lts\current;C:\Users\h1465\scoop\apps\nodejs-lts\current\bin;C:\Users\h1465\scoop\shims;%PATH%"
)
cd /d "%~dp0"
echo Launching AstroSquad Research Station Electron App...
npm start
