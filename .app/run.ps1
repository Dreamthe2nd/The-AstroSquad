if (Test-Path "C:\Users\h1465\scoop\apps\nodejs-lts\current") {
  $env:PATH = "C:\Users\h1465\scoop\apps\nodejs-lts\current;C:\Users\h1465\scoop\apps\nodejs-lts\current\bin;C:\Users\h1465\scoop\shims;" + $env:PATH
}
Set-Location -Path $PSScriptRoot
Write-Host "Launching AstroSquad Research Station Electron App..." -ForegroundColor Cyan
npm start
