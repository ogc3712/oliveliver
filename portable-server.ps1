param(
  [int]$Port = 4173,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $root "bloodroot-citadel.html"

if (-not (Test-Path -LiteralPath $indexPath)) {
  Write-Host "Could not find bloodroot-citadel.html next to this launcher."
  Write-Host "Keep PLAY_GAME.bat, portable-server.ps1, and the game files in the same folder."
  Read-Host "Press Enter to close"
  exit 1
}

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8"; break }
    ".mjs" { "text/javascript; charset=utf-8"; break }
    ".js" { "text/javascript; charset=utf-8"; break }
    ".css" { "text/css; charset=utf-8"; break }
    ".json" { "application/json; charset=utf-8"; break }
    ".webmanifest" { "application/manifest+json; charset=utf-8"; break }
    ".svg" { "image/svg+xml; charset=utf-8"; break }
    ".png" { "image/png"; break }
    ".jpg" { "image/jpeg"; break }
    ".jpeg" { "image/jpeg"; break }
    ".gif" { "image/gif"; break }
    ".webp" { "image/webp"; break }
    ".ico" { "image/x-icon"; break }
    ".wav" { "audio/wav"; break }
    ".mp3" { "audio/mpeg"; break }
    ".ogg" { "audio/ogg"; break }
    default { "application/octet-stream" }
  }
}

function Resolve-GamePath {
  param([string]$Target)

  $pathPart = ($Target -split "\?")[0]
  if ([string]::IsNullOrWhiteSpace($pathPart) -or $pathPart -eq "/") {
    $pathPart = "/bloodroot-citadel.html"
  }

  $pathPart = [System.Uri]::UnescapeDataString($pathPart)
  $pathPart = $pathPart.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $pathPart = $pathPart.TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)

  $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $pathPart))
  $rootFull = [System.IO.Path]::GetFullPath($root)
  $rootWithSep = $rootFull.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

  if ($candidate -ne $rootFull -and -not $candidate.StartsWith($rootWithSep, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  return $candidate
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [bool]$HeadersOnly = $false
  )

  $headerText = "HTTP/1.1 $StatusCode $StatusText`r`n" +
    "Content-Type: $ContentType`r`n" +
    "Content-Length: $($Body.Length)`r`n" +
    "Cache-Control: no-store`r`n" +
    "Connection: close`r`n`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $HeadersOnly -and $Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
}

$listener = $null
$actualPort = $Port

for ($candidatePort = $Port; $candidatePort -le ($Port + 25); $candidatePort++) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $candidatePort)
    $listener.Start()
    $actualPort = $candidatePort
    break
  } catch {
    if ($listener) {
      $listener.Stop()
      $listener = $null
    }
  }
}

if (-not $listener) {
  Write-Host "Could not open a local game port near $Port."
  Read-Host "Press Enter to close"
  exit 1
}

$url = "http://localhost:$actualPort/bloodroot-citadel.html"
Write-Host "Random Guy is running locally:"
Write-Host $url
Write-Host ""
Write-Host "Keep this window open while playing. Close it to stop the game server."
Write-Host ""
if (-not $NoBrowser) {
  Start-Process $url
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()

      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line.Length -eq 0) {
          break
        }
      }

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }

      $parts = $requestLine.Split(" ")
      $method = $parts[0]
      $target = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
      $headersOnly = $method -eq "HEAD"

      if ($method -ne "GET" -and $method -ne "HEAD") {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
        Write-HttpResponse $stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $body $headersOnly
        continue
      }

      $filePath = Resolve-GamePath $target
      if (-not $filePath) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
        Write-HttpResponse $stream 403 "Forbidden" "text/plain; charset=utf-8" $body $headersOnly
        continue
      }

      if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Write-HttpResponse $stream 404 "Not Found" "text/plain; charset=utf-8" $body $headersOnly
        continue
      }

      $body = [System.IO.File]::ReadAllBytes($filePath)
      Write-HttpResponse $stream 200 "OK" (Get-ContentType $filePath) $body $headersOnly
    } catch {
      try {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
        Write-HttpResponse $stream 500 "Internal Server Error" "text/plain; charset=utf-8" $body $false
      } catch {}
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
