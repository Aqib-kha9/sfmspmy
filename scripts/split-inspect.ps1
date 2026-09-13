$t = [System.IO.File]::ReadAllText('admin-panel/scripts/security-return.txt')
$t = $t -replace '><', (">" + [Environment]::NewLine + "<")
[System.IO.File]::WriteAllText('admin-panel/scripts/security-return.txt', $t)
Write-Output (($t -split [Environment]::NewLine).Count)
