# Prepara una release: compila el instalador firmado y genera latest.json (lo que lee la app para actualizarse).
# Uso:  .\release.ps1 "Qué cambia en esta versión"
# Después sube a GitHub (Releases -> Draft a new release, etiqueta v<versión>) los 3 archivos que imprime al final.
param([string]$Notes = "")
$ErrorActionPreference = "Stop"
$key = Join-Path $env:USERPROFILE ".tauri\stickedd.key"   # clave privada: NO está en el repo, haz copia de seguridad
if (-not (Test-Path $key)) { throw "Falta la clave de firma: $key" }
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

$ErrorActionPreference = "Continue"   # bun escribe su eco en stderr; no es un error
bun --bun run tauri build
$code = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($code -ne 0) { throw "Falló la compilación" }

$v = (Get-Content package.json -Raw | ConvertFrom-Json).version
$dir = "src-tauri\target\release\bundle\nsis"
$exe = "Stickedd_${v}_x64-setup.exe"
$sig = (Get-Content "$dir\$exe.sig" -Raw).Trim()
$json = [ordered]@{
  version  = $v
  notes    = $Notes
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = @{ "windows-x86_64" = @{ signature = $sig; url = "https://github.com/edgarlopezcalomarde/stickedd/releases/download/v$v/$exe" } }
} | ConvertTo-Json -Depth 5
[IO.File]::WriteAllText((Join-Path (Resolve-Path $dir) "latest.json"), $json, (New-Object Text.UTF8Encoding $false))

Write-Host "`nSube estos 3 archivos a la release v${v}:"
Write-Host "  $dir\$exe"
Write-Host "  $dir\$exe.sig"
Write-Host "  $dir\latest.json"
explorer.exe /select,(Join-Path (Resolve-Path $dir) $exe)
