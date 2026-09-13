# Renders the actual permission names inside the Team & Staff "Permission matrix" modal
# instead of only showing a count per role. Targeted substring replacement inside the
# long single-line StaffPage JSX return.
$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$text = [System.IO.File]::ReadAllText($path)

$search = '{roleOptions.map((role) => <div className="security-role-row" key={role.id}><div><strong>{role.label}</strong><span>{role.description ?? ''System role''}</span></div><span>{role.permissions.length} permissions</span></div>)}'

$replace = '{roleOptions.map((role) => <div className="security-role-row security-role-matrix" key={role.id}><div className="security-role-meta"><strong>{role.label}</strong><span>{role.description ?? ''System role''}</span></div><div className="security-role-perms"><span className="security-role-count">{role.permissions.length} permissions</span><div className="permission-chip-grid">{role.permissions.map((permission) => <span className="permission-chip" key={permission}>{humanisePermission(permission)}</span>)}</div></div></div>)}'

if (-not $text.Contains($search)) {
    Write-Output 'SEARCH NOT FOUND'
    exit 1
}

$text = $text.Replace($search, $replace)
$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $encoding)
Write-Output 'REPLACED OK'
