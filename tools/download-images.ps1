# =========================================================
#  Miner's Haven Wiki - image downloader
#  Saves every wiki image listed in data/ImageSources.json into assets/wiki,
#  so the site never has to load pictures from the Fandom wiki.
#  Images that are already saved are skipped, so it is safe to run again
#  (for example after adding new images to data/ImageSources.json).
#  Run it by double-clicking tools\download-images.bat
# =========================================================
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

$root = Split-Path -Parent $PSScriptRoot
$listPath = Join-Path $root 'data\ImageSources.json'
if (-not (Test-Path $listPath)) { Write-Host "Can't find $listPath" -ForegroundColor Red; exit 1 }
$list = Get-Content -Raw -Encoding UTF8 $listPath | ConvertFrom-Json

$todo = New-Object System.Collections.Generic.List[object]
foreach ($p in $list.PSObject.Properties) {
  $out = Join-Path $root ($p.Name -replace '/', '\')
  if (-not (Test-Path $out)) { $todo.Add(@($out, [string]$p.Value)) }
}
$total = $list.PSObject.Properties.Name.Count
Write-Host "$total images listed, $($todo.Count) to download." -ForegroundColor Cyan
if ($todo.Count -eq 0) { Write-Host 'Everything is already saved.' -ForegroundColor Green; exit 0 }
New-Item -ItemType Directory -Force -Path (Join-Path $root 'assets\wiki') | Out-Null

$client = New-Object System.Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(60)
$client.DefaultRequestHeaders.UserAgent.ParseAdd('MinersHavenWiki-ImageSaver/1.0')
$client.DefaultRequestHeaders.Accept.ParseAdd('image/webp,image/*;q=0.8')

function Get-Batch($items) {
  $jobs = @()
  foreach ($it in $items) { $jobs += ,@($it, $client.GetAsync($it[1])) }
  $failed = @()
  foreach ($j in $jobs) {
    $it = $j[0]; $t = $j[1]
    try {
      $t.Wait()
      $res = $t.Result
      if (-not $res.IsSuccessStatusCode) { throw "HTTP $([int]$res.StatusCode)" }
      $bytes = $res.Content.ReadAsByteArrayAsync().Result
      [System.IO.File]::WriteAllBytes($it[0], $bytes)
    } catch {
      $failed += ,$it
    }
  }
  return ,$failed
}

$done = 0; $failed = @(); $batch = 8
for ($i = 0; $i -lt $todo.Count; $i += $batch) {
  $slice = $todo.GetRange($i, [Math]::Min($batch, $todo.Count - $i))
  $failed += Get-Batch $slice
  $done += $slice.Count
  Write-Progress -Activity 'Downloading wiki images' -Status "$done of $($todo.Count)" -PercentComplete ($done * 100 / $todo.Count)
}
Write-Progress -Activity 'Downloading wiki images' -Completed

if ($failed.Count) {
  Write-Host "Retrying $($failed.Count) image(s)..." -ForegroundColor Yellow
  Start-Sleep -Seconds 3
  $still = @()
  foreach ($it in $failed) { $still += Get-Batch @(,$it) }
  $failed = $still
}

$saved = $todo.Count - $failed.Count
Write-Host "Saved $saved image(s) to assets\wiki." -ForegroundColor Green
if ($failed.Count) {
  Write-Host "$($failed.Count) image(s) could not be downloaded (the site will keep loading those from the wiki):" -ForegroundColor Yellow
  foreach ($it in $failed) { Write-Host ('  ' + (Split-Path -Leaf $it[0])) }
}
