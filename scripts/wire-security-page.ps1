$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$content = Get-Content -Raw -Encoding UTF8 $path

$before = $content
$content = $content.Replace('String(securityRoleSeed.length)', 'String(roles.length)')
$content = $content.Replace('{securityRoleSeed.map((role)', '{roles.map((role)')
$content = $content.Replace("onClick={() => notify('Session inventory refreshed locally.')}", 'onClick={refreshSessions}')

if ($content -eq $before) {
    Write-Error 'No security page replacements were applied.'
}

Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline
Write-Output 'Security page JSX rewired.'
