# Instala Stickedd descargando el instalador de la última release de GitHub.
# Uso:  irm https://raw.githubusercontent.com/edgarlopezcalomarde/stickedd/main/install.ps1 | iex
$Repo = "edgarlopezcalomarde/stickedd"   # shortcut: cambia esto si el repo se llama distinto

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "Buscando la ultima version de Stickedd..."
$rel = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "stickedd-install" }
$asset = $rel.assets | Where-Object { $_.name -like "*-setup.exe" } | Select-Object -First 1
if (-not $asset) { throw "La release $($rel.tag_name) no tiene instalador (.exe)." }

$tmp = Join-Path $env:TEMP $asset.name
Write-Host "Descargando $($asset.name)..."
Invoke-WebRequest $asset.browser_download_url -OutFile $tmp

Write-Host "Instalando $($rel.tag_name)..."
Start-Process $tmp -ArgumentList "/S" -Wait
Remove-Item $tmp -Force

$exe = Join-Path $env:LOCALAPPDATA "Stickedd\stickedd.exe"
if (Test-Path $exe) { Start-Process $exe }
Write-Host "Listo. Stickedd esta en la bandeja del sistema (junto al reloj)."
