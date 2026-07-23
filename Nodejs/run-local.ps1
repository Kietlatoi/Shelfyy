$ErrorActionPreference = 'Stop'

function Import-EnvFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }

        $parts = $line.Split('=', 2)
        if ($parts.Count -ne 2) {
            return
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

Import-EnvFile (Join-Path $PSScriptRoot '..\BE\Shelfy\.env')
Import-EnvFile (Join-Path $PSScriptRoot '.env')

if (-not $env:PORT) {
    $env:PORT = '3000'
}
if (-not $env:APP_CORS_ALLOWED_ORIGINS) {
    $env:APP_CORS_ALLOWED_ORIGINS = 'http://localhost:5173'
}

npm start
