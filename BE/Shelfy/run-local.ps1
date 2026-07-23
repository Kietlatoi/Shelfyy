$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Error "Khong tim thay file .env tai: $envPath. Hay tao tu .env.example truoc."
}

Get-Content -LiteralPath $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) {
    return
  }

  if ($line -match "^\s*([^#=]+)=(.*)$") {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

$required = @("DB_URL", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET")
$missing = $required | Where-Object { -not [Environment]::GetEnvironmentVariable($_, "Process") }

if ($missing.Count -gt 0) {
  Write-Error ("Thieu bien moi truong bat buoc: " + ($missing -join ", "))
}

Write-Host "Loaded BE local env from .env"
Write-Host ("DB_URL=" + $env:DB_URL)
Write-Host "Starting Shelfy Core API on http://localhost:8080"

& "$PSScriptRoot\mvnw.cmd" spring-boot:run
