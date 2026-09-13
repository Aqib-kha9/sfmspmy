$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$path = Join-Path $root 'admin-panel\src\features\admin\AdminPages.tsx'
$fragmentPath = Join-Path $root 'admin-panel\scripts\_loan-tabs-fragment.txt'

$content = [System.IO.File]::ReadAllText($path)
$fragment = [System.IO.File]::ReadAllText($fragmentPath).Trim()

$freqOld = '<option>Monthly</option><option>Fortnightly</option><option>Weekly</option><option>Quarterly</option>'
$freqNew = '<option>Daily</option><option>Weekly</option><option>Fortnightly</option><option>Monthly</option><option>Quarterly</option>'
$typeOld = '<option>Business Loan</option><option>SHG Loan</option><option>Personal Loan</option><option>Mortgage Loan</option><option>Gold Loan</option>'
$typeNew = '<option>Daily Loan</option><option>Weekly Loan</option><option>Personal Loan</option><option>Mortgage Loan</option><option>Business Loan</option><option>Gold Loan</option><option>SHG Loan</option><option>Other Loan</option>'
$anchor = 'aria-label="Search loans" /></div>'
$insert = $anchor + $fragment
$phoneOld = 'primaryPhone: string;'
$phoneNew = "primaryPhone: string;`r`n    alternatePhone: string;"

function Count-Occurrences([string]$haystack, [string]$needle) {
    if ([string]::IsNullOrEmpty($needle)) { return 0 }
    return ([regex]::Matches($haystack, [regex]::Escape($needle))).Count
}

$freqCount = Count-Occurrences $content $freqOld
$typeCount = Count-Occurrences $content $typeOld
$anchorCount = Count-Occurrences $content $anchor
$phoneCount = Count-Occurrences $content $phoneOld

Write-Output ("freq={0} type={1} anchor={2} phone={3}" -f $freqCount, $typeCount, $anchorCount, $phoneCount)

if ($freqCount -ne 1 -or $typeCount -ne 2 -or $anchorCount -ne 1 -or $phoneCount -ne 1) {
    Write-Output 'PRECONDITION FAILED - no changes written.'
    exit 1
}

$content = $content.Replace($freqOld, $freqNew)
$content = $content.Replace($typeOld, $typeNew)
$content = $content.Replace($anchor, $insert)
$content = $content.Replace($phoneOld, $phoneNew)

[System.IO.File]::WriteAllText($path, $content)
Write-Output 'DONE'
