$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$content = [System.IO.File]::ReadAllText($path, $utf8)

$before = ([regex]::Matches($content, [regex]::Escape('Account credit'))).Count
if ($before -eq 0) { throw 'SEARCH NOT FOUND: Account credit' }

$content = $content.Replace('Account credit', 'Bank transfer')
[System.IO.File]::WriteAllText($path, $content, $utf8)

$after = ([regex]::Matches($content, [regex]::Escape('Account credit'))).Count
Write-Output "Account credit: $before -> $after"
if ($after -ne 0) { throw "LEGACY TERM REMAINS: Account credit x $after" }
Write-Output 'FIX-ACCOUNT-CREDIT: PASSED'
