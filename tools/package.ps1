# The First Relics release packager.
#
# Usage (PowerShell 7, from anywhere):
#   pwsh tools/package.ps1
#
# Builds dist/the-first-relics-v<version>.zip containing only the files a buyer needs.
# The manifest sits at the zip root, as Foundry's installer expects. Development files
# (tools/, CLAUDE.md, .git*, dist/) are never included because only allow-listed paths are packed.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'module.json') -Raw | ConvertFrom-Json
$version = $manifest.version

# Release consistency checks (mirrors FirstRelics.runReleaseCheck's version checks).
$problems = @()
$script = Get-Content (Join-Path $root 'scripts/the-first-relics.js') -Raw
if ($script -notmatch "const TFR_VERSION = `"$([regex]::Escape($version))`";") { $problems += "scripts/the-first-relics.js TFR_VERSION != $version" }
$readme = Get-Content (Join-Path $root 'README.md') -Raw
if (-not $readme.Contains("# The First Relics v$version")) { $problems += "README.md title is not v$version" }
if (-not $readme.Contains("Current public version: ``$version``")) { $problems += "README.md 'Current public version' is not $version" }
$changelog = Get-Content (Join-Path $root 'CHANGELOG.md') -Raw
if (-not $changelog.Contains("## v$version")) { $problems += "CHANGELOG.md has no '## v$version' entry" }
if ($problems) { throw "Release check failed:`n - " + ($problems -join "`n - ") }

$include = @('module.json', 'README.md', 'CHANGELOG.md', 'LICENSE.md', 'scripts', 'styles', 'data', 'art')
$exclude = @('art/icons/v1/_contact-sheet.png')

$files = foreach ($entry in $include) {
  $path = Join-Path $root $entry
  if (-not (Test-Path $path)) { throw "Missing release path: $entry" }
  if ((Get-Item $path).PSIsContainer) { Get-ChildItem $path -Recurse -File } else { Get-Item $path }
}

$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$zipPath = Join-Path $dist "the-first-relics-v$version.zip"
if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
$count = 0
try {
  foreach ($file in $files) {
    # Forward slashes keep the archive valid on Linux-hosted Foundry servers.
    $relative = [System.IO.Path]::GetRelativePath($root, $file.FullName).Replace('\', '/')
    if ($exclude -contains $relative) { continue }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    $count++
  }
} finally {
  $zip.Dispose()
}

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
"Built $([System.IO.Path]::GetRelativePath($root, $zipPath)) ($count files, $sizeMb MB)"
