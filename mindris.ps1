$ErrorActionPreference = "Stop"
$Cli = Join-Path $PSScriptRoot "scripts\mindris.py"

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $Cli @args
    exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
    & python $Cli @args
    exit $LASTEXITCODE
}

Write-Error "Python 3.12 ou supérieur est requis."
exit 2
