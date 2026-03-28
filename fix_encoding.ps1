$path = "c:\Users\Administrator\Downloads\math-matrix-pro-2026\src\App.tsx"
$text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Fix corrupted Vietnamese patterns (double-encoded + undefined bytes)
$fixes = @{
    "Đ`u0001`\`u0000`ng xuất" = "Đăng xuất"
    "Đ`u0001`\`u0000`ng nhập" = "Đăng nhập"
    "Tên đ`u0001`\`u0000`ng nhập" = "Tên đăng nhập"
    "t`u0001`\`u0000`ng nhập" = "tên đăng nhập"
}

# More robust: replace the specific Unicode replacement character sequences
# Pattern: ă = C4 83, 83 is undefined in Windows-1252 -> became U+FFFD
$text = $text -replace 'Đ\x{FFFD}\x{FFFD}ng', 'Đăng'
$text = $text -replace 'đ\x{FFFD}\x{FFFD}ng', 'đăng'
$text = $text -replace '\x{FFFD}\x{FFFD}ng nhập', 'đăng nhập'
$text = $text -replace 'Tên \x{FFFD}.\x{FFFD}ng', 'Tên đăng'
$text = $text -replace '\x{FFFD}', '?'

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $text, $utf8NoBom)
Write-Host "Done"
