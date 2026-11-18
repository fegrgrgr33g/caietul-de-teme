# Server local pentru Caietul de teme: deschide http://localhost:8765/ după pornire.
# Pornire: powershell -ExecutionPolicy Bypass -File serve.ps1
$root = Join-Path $PSScriptRoot "site"
$port = 8765
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$port/")
$l.Start()
Write-Host "Caietul de teme ruleaza pe http://localhost:$port/"
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".svg"="image/svg+xml"; ".png"="image/png"; ".ico"="image/x-icon" }
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart("/")); if ($p -eq "") { $p = "index.html" }
  $f = [IO.Path]::GetFullPath((Join-Path $root $p))
  if ($f.StartsWith($root) -and (Test-Path $f -PathType Leaf)) {
    $b = [IO.File]::ReadAllBytes($f)
    $ct = $types[[IO.Path]::GetExtension($f).ToLower()]; if ($ct) { $c.Response.ContentType = $ct }
    $c.Response.Headers.Add("Cache-Control", "no-cache")
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
