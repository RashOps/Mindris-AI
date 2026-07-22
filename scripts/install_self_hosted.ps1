$ErrorActionPreference = "Stop"

function Get-Setting([string]$Name, [string]$Default) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Commande requise introuvable : $Name"
    }
}

function New-ApiKey {
    $bytes = New-Object byte[] 24
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
}

$MindrisHome = Get-Setting "MINDRIS_HOME" (Join-Path $HOME ".mindris-ai")
$ReleaseRef = Get-Setting "MINDRIS_RELEASE_REF" "main"
$RawBase = Get-Setting "MINDRIS_RAW_BASE" "https://raw.githubusercontent.com/RashOps/Mindris-AI/$ReleaseRef"
$DryRun = (Get-Setting "MINDRIS_INSTALL_DRY_RUN" "false") -eq "true"
$PullAttempts = [int](Get-Setting "MINDRIS_PULL_ATTEMPTS" "3")
$ParallelLimit = Get-Setting "MINDRIS_PULL_PARALLEL_LIMIT" "1"

Require-Command "docker"
& docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker Compose v2 est requis." }

New-Item -ItemType Directory -Force -Path $MindrisHome | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $MindrisHome "storage") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $MindrisHome "logs") | Out-Null

$ComposePath = Join-Path $MindrisHome "docker-compose.yml"
$EnvPath = Join-Path $MindrisHome ".env"
Invoke-WebRequest -UseBasicParsing "$RawBase/docker-compose.release.yml" -OutFile $ComposePath

if (-not (Test-Path $EnvPath)) {
    Invoke-WebRequest -UseBasicParsing "$RawBase/.env.self-hosted.example" -OutFile $EnvPath
    $content = Get-Content $EnvPath -Raw
    $content = $content -replace '(?m)^API_KEY=.*$', "API_KEY=$(New-ApiKey)"
    [IO.File]::WriteAllText($EnvPath, $content, [Text.UTF8Encoding]::new($false))
}

Push-Location $MindrisHome
try {
    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw "Configuration Docker Compose invalide." }

    if ($DryRun) {
        Write-Host "mindris-install-dry-run-ok"
        Write-Host "Install dir: $MindrisHome"
        exit 0
    }

    $env:COMPOSE_PARALLEL_LIMIT = $ParallelLimit
    $pulled = $false
    for ($attempt = 1; $attempt -le $PullAttempts; $attempt++) {
        Write-Host "Téléchargement des images Mindris ($attempt/$PullAttempts)..."
        & docker compose pull
        if ($LASTEXITCODE -eq 0) { $pulled = $true; break }
        if ($attempt -lt $PullAttempts) { Start-Sleep -Seconds ($attempt * 3) }
    }
    if (-not $pulled) {
        throw "Impossible de télécharger les images après $PullAttempts tentatives."
    }

    & docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "Le démarrage Docker Compose a échoué." }
}
finally {
    Pop-Location
}

$WebPort = Get-Setting "MINDRIS_WEB_PORT" "3000"
$ApiPort = Get-Setting "MINDRIS_API_PORT" "8000"
$RendererPort = Get-Setting "MINDRIS_RENDERER_PORT" "4000"
Write-Host "Mindris AI démarre."
Write-Host "Frontend : http://localhost:$WebPort"
Write-Host "API      : http://localhost:$ApiPort"
Write-Host "Renderer : http://localhost:$RendererPort"
Write-Host "Dossier  : $MindrisHome"
