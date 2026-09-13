$ErrorActionPreference = 'Stop'
$source = 'admin-panel/src/features/admin/AdminPages.tsx'
$lines = Get-Content -Encoding UTF8 $source
# ScopedCustomerPage return is line 1690 (1-based).
$line = $lines[1689]
$out = $line -replace '><', ('>' + [Environment]::NewLine + '<')
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'customer-return.txt'), $out)
Write-Output (($out -split [Environment]::NewLine).Count)
