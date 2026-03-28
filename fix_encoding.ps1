$path = "c:\Users\Administrator\Downloads\math-matrix-pro-2026\src\App.tsx"
$bytes = [System.IO.File]::ReadAllBytes($path)
# The file was double-encoded: original UTF-8 -> read as Latin-1 -> written as UTF-8
# To fix: read as UTF-8 (get garbled string) -> get bytes as Latin-1 -> interpret as UTF-8
$garbled = [System.Text.Encoding]::UTF8.GetString($bytes)
$latin1Bytes = [System.Text.Encoding]::GetEncoding(28591).GetBytes($garbled)
$fixed = [System.Text.Encoding]::UTF8.GetString($latin1Bytes)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $fixed, $utf8NoBom)
Write-Host "Fixed! Sample: $($fixed.Substring(0, 80))"
