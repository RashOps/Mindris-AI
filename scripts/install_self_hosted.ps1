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
$PrivacyMode = Get-Setting "MINDRIS_PRIVACY_MODE" "local_strict"
$DownloadLocalModel = (Get-Setting "MINDRIS_DOWNLOAD_LOCAL_MODEL" "false") -eq "true"
$LocalModel = Get-Setting "MINDRIS_LOCAL_MODEL" "llama3.2:3b"

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
    $content = Get-Content $Path -Raw
    $pattern = "(?m)^$([Regex]::Escape($Name))=.*$"
    if ($content -match $pattern) {
        $content = $content -replace $pattern, "$Name=$Value"
    }
    else {
        $content = $content.TrimEnd() + [Environment]::NewLine + "$Name=$Value" + [Environment]::NewLine
    }
    [IO.File]::WriteAllText($Path, $content, [Text.UTF8Encoding]::new($false))
}

Require-Command "docker"
& docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker Compose v2 est requis." }

New-Item -ItemType Directory -Force -Path $MindrisHome | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $MindrisHome "storage") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $MindrisHome "logs") | Out-Null

$ComposePath = Join-Path $MindrisHome "docker-compose.yml"
$StrictComposePath = Join-Path $MindrisHome "docker-compose.privacy-strict.yml"
$EnvPath = Join-Path $MindrisHome ".env"
Invoke-WebRequest -UseBasicParsing "$RawBase/docker-compose.release.yml" -OutFile $ComposePath
Invoke-WebRequest -UseBasicParsing "$RawBase/docker-compose.privacy-strict.yml" -OutFile $StrictComposePath

if (-not (Test-Path $EnvPath)) {
    Invoke-WebRequest -UseBasicParsing "$RawBase/.env.self-hosted.example" -OutFile $EnvPath
    $content = Get-Content $EnvPath -Raw
    $content = $content -replace '(?m)^API_KEY=.*$', "API_KEY=$(New-ApiKey)"
    [IO.File]::WriteAllText($EnvPath, $content, [Text.UTF8Encoding]::new($false))
}

if ($PrivacyMode -notin @("local_strict", "private_cloud", "full_context_cloud")) {
    throw "MINDRIS_PRIVACY_MODE invalide : $PrivacyMode"
}
Set-EnvValue $EnvPath "MINDRIS_PRIVACY_MODE" $PrivacyMode
Set-EnvValue $EnvPath "MINDRIS_TELEMETRY_ENABLED" "false"
Set-EnvValue $EnvPath "MINDRIS_LOCAL_MODEL" $LocalModel
Set-EnvValue $EnvPath "MINDRIS_DOWNLOAD_LOCAL_MODEL" $DownloadLocalModel.ToString().ToLowerInvariant()
if ($PrivacyMode -eq "local_strict") {
    Set-EnvValue $EnvPath "COMPOSE_PROFILES" "local-ai"
    Set-EnvValue $EnvPath "OLLAMA_API_BASE" "http://ollama:11434"
    try {
        $memoryGiB = [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
        Write-Host "Mémoire détectée : environ $memoryGiB Gio."
        Write-Host "Modèle local sélectionné : $LocalModel."
    }
    catch {
        Write-Host "Diagnostic matériel indisponible ; modèle local : $LocalModel."
    }
}
else {
    Set-EnvValue $EnvPath "COMPOSE_PROFILES" ""
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
    if ($PrivacyMode -eq "local_strict" -and $DownloadLocalModel) {
        Write-Host "Téléchargement explicite du modèle local $LocalModel..."
        & docker compose exec -T ollama ollama pull $LocalModel
        if ($LASTEXITCODE -ne 0) { throw "Le téléchargement du modèle local a échoué." }
    }
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
Write-Host "Privacy  : $PrivacyMode"
