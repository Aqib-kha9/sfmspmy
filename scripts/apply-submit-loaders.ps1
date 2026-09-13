# Applies the canonical CustomerFormModal loading pattern to every modal form in
# AdminPages.tsx (and the ChangePasswordModal button):
#   saving state -> guard -> try/finally -> disabled + Loader2 spinner.
# Every SEARCH string is verified; the script throws (and writes nothing) if any
# string no longer matches, so it can never half-apply.
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$ell = [string][char]0x2026

$target = Join-Path $root 'src\features\admin\AdminPages.tsx'
$script:content = [System.IO.File]::ReadAllText($target, $utf8)

$nl = "`n"
if ($script:content.Contains("`r`n")) { $nl = "`r`n" }

$script:changes = 0
function Set-Part([string]$label, [string]$old, [string]$new) {
    if (-not $script:content.Contains($old)) { throw "SEARCH NOT FOUND [$label]" }
    $script:content = $script:content.Replace($old, $new)
    $script:changes++
}
function Set-Optional([string]$label, [string]$old, [string]$new) {
    $count = ([regex]::Matches($script:content, [regex]::Escape($old))).Count
    if ($count -gt 0) { $script:content = $script:content.Replace($old, $new); $script:changes++; Write-Output "OPTIONAL [$label] applied x$count" }
    else { Write-Output "OPTIONAL [$label] not present (skipped)" }
}

# --- 1. Import Loader2 -----------------------------------------------------------------
Set-Part 'import-loader2' @'
    LockKeyhole,
'@ @'
    Loader2,
    LockKeyhole,
'@

# --- 2. onSave prop types become async -------------------------------------------------
Set-Part 'prop-collection' 'onSave: (input: CollectionInput) => void }) {' 'onSave: (input: CollectionInput) => Promise<void> }) {'
Set-Part 'prop-reconciliation' 'onSave: (status: ReconciliationRecord[''status''], note: string, metadata: ReconciliationInput) => void }) {' 'onSave: (status: ReconciliationRecord[''status''], note: string, metadata: ReconciliationInput) => Promise<void> }) {'
Set-Part 'prop-deposit' 'onSave: (input: DepositInput | DepositTransactionInput) => void; onToast: (message: string) => void }) {' 'onSave: (input: DepositInput | DepositTransactionInput) => Promise<void>; onToast: (message: string) => void }) {'
Set-Part 'prop-rd' 'onSave: (input: RDInput | RDCollectionInput) => void }) {' 'onSave: (input: RDInput | RDCollectionInput) => Promise<void> }) {'
Set-Part 'prop-fd' 'onSave: (input: FDInput | FDActionInput) => void }) {' 'onSave: (input: FDInput | FDActionInput) => Promise<void> }) {'
Set-Part 'prop-loan' 'onSave: (input: LoanInput | LoanCollectionInput) => void }) {' 'onSave: (input: LoanInput | LoanCollectionInput) => Promise<void> }) {'
Set-Part 'prop-withdrawal' 'onSave: (input: WithdrawalInput | WithdrawalActionInput) => void }) {' 'onSave: (input: WithdrawalInput | WithdrawalActionInput) => Promise<void> }) {'
Set-Part 'prop-settlement' 'onSave: (input: WithdrawalSettlementInput) => void }) {' 'onSave: (input: WithdrawalSettlementInput) => Promise<void> }) {'
Set-Part 'prop-scopedcustomer' 'onSave: (record: CustomerInput) => void }) {' 'onSave: (record: CustomerInput) => Promise<void> }) {'
Set-Part 'prop-agent' 'onSave: (input: AgentInput) => void }) {' 'onSave: (input: AgentInput) => Promise<void> }) {'
Set-Part 'prop-staff' 'onSave: (input: StaffFormInput) => void }) {' 'onSave: (input: StaffFormInput) => Promise<void> }) {'

# --- 3. CollectionModal parent becomes async (its submit is now awaited) ---------------
Set-Part 'parent-collection-async' '    const saveCollection = (_input: CollectionInput) => { close();' '    const saveCollection = async (_input: CollectionInput) => { close();'

# --- 4. Await every onSave call --------------------------------------------------------
Set-Part 'await-onsave' 'onSave(' 'await onSave('

# --- 5. onSubmitting handlers are async-friendly ---------------------------------------
Set-Optional 'onsubmit-guard' 'onSubmit={submit}' 'onSubmit={(event) => void submit(event)}'

# --- 6. Submit buttons get disabled + Loader2 + Saving label ---------------------------
Set-Part 'btn-collection' '<button type="submit" className="primary-button"><CheckCircle2 size={16} /> Save collection</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} {saving ? ''Saving[[ELL]]'' : ''Save collection''}</button>'

Set-Part 'btn-reconciliation' '<button type="submit" className="primary-button"><CheckCircle2 size={15} /> Save decision</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} {saving ? ''Saving[[ELL]]'' : ''Save decision''}</button>'

Set-Part 'btn-deposit' '<button type="submit" className="primary-button">{mode === ''account'' ? ''Create deposit account'' : ''Save transaction''}</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : (mode === ''account'' ? ''Create deposit account'' : ''Save transaction'')}</button>'

Set-Part 'btn-rd' '<button type="submit" className="primary-button">{mode === ''account'' ? ''Create RD account'' : ''Record installment''}</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : (mode === ''account'' ? ''Create RD account'' : ''Record installment'')}</button>'

Set-Part 'btn-fd' '<button type="submit" className="primary-button">{mode === ''account'' ? ''Create FD account'' : `Save ${action.toLowerCase()} action`}</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : (mode === ''account'' ? ''Create FD account'' : `Save ${action.toLowerCase()} action`)}</button>'

Set-Part 'btn-loan' '<button className="primary-button" type="submit">{mode === ''account'' ? ''Create loan workflow'' : ''Record repayment''}</button>' '<button className="primary-button" type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : (mode === ''account'' ? ''Create loan workflow'' : ''Record repayment'')}</button>'

Set-Part 'btn-withdrawal' '<button type="submit" className="primary-button">Save locally</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : ''Save locally''}</button>'

Set-Part 'btn-settlement' '<button type="submit" className="primary-button">Complete settlement</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : ''Complete settlement''}</button>'

Set-Part 'btn-scopedcustomer' '<button type="submit" className="primary-button">Save customer</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : ''Save customer''}</button>'

Set-Part 'btn-agent' '<button type="submit" className="primary-button">Save agent locally</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : ''Save agent locally''}</button>'

Set-Part 'btn-staff' '<button className="primary-button" type="submit" disabled={locked}>{mode === ''add'' ? ''Create login'' : ''Save changes''}</button>' '<button className="primary-button" type="submit" disabled={locked || saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Saving[[ELL]]'' : (mode === ''add'' ? ''Create login'' : ''Save changes'')}</button>'

# --- 7. SettingsPage save button gets its own saving state -----------------------------
Set-Part 'settings-state' @'
    const [toast, setToast] = useState('');
    const currentSection = settingsSections.find((item) => item.id === section)!;
'@ @'
    const [toast, setToast] = useState('');
    const [saving, setSaving] = useState(false);
    const currentSection = settingsSections.find((item) => item.id === section)!;
'@

Set-Part 'settings-guard' @'
    const save = async () => {
        if (!settings.organizationName.trim()
'@ @'
    const save = async () => {
        if (saving) return;
        if (!settings.organizationName.trim()
'@

Set-Part 'settings-setSaving' @'
        try {
            await settingsRepository.save(settings);
'@ @'
        setSaving(true);
        try {
            await settingsRepository.save(settings);
'@

Set-Part 'settings-finally' @'
            notify(messageFor(reason, 'Unable to save system settings.'));
        }
    };
'@ @'
            notify(messageFor(reason, 'Unable to save system settings.'));
        } finally {
            setSaving(false);
        }
    };
'@

Set-Part 'btn-settings' '<button className="primary-button" onClick={save}><CheckCircle2 size={16} /> Save changes</button>' '<button className="primary-button" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} {saving ? ''Saving[[ELL]]'' : ''Save changes''}</button>'

# --- 8. StaffPage deactivate form ------------------------------------------------------
Set-Part 'deactivate-state' '    const [deactivateReason, setDeactivateReason] = useState('''');' ('    const [deactivateReason, setDeactivateReason] = useState('''');' + $nl + '    const [deactivateSaving, setDeactivateSaving] = useState(false);')

Set-Part 'deactivate-setSaving' '        const member = deactivateTarget;' ('        setDeactivateSaving(true);' + $nl + '        const member = deactivateTarget;')

Set-Part 'deactivate-finally' @'
        } catch (reason) {
            notify(messageFor(reason, 'Unable to deactivate the staff account.'));
        }
    };
'@ @'
        } catch (reason) {
            notify(messageFor(reason, 'Unable to deactivate the staff account.'));
        } finally {
            setDeactivateSaving(false);
        }
    };
'@

Set-Part 'deactivate-form' '<form className="form-grid customer-form" onSubmit={(event) => { event.preventDefault(); void confirmDeactivate(); }}><label className="full-field">Reason for deactivation<textarea value={deactivateReason} onChange={(event) => setDeactivateReason(event.target.value)} rows={3} placeholder="Resignation, role change, policy breach..." /></label><div className="customer-detail-actions full-field"><button type="button" className="filter-button" onClick={stopDeactivate}>Cancel</button><button className="primary-button" type="submit">Deactivate account</button></div></form>' '<form className="form-grid customer-form" onSubmit={(event) => { event.preventDefault(); void confirmDeactivate(); }}><label className="full-field">Reason for deactivation<textarea value={deactivateReason} onChange={(event) => setDeactivateReason(event.target.value)} rows={3} placeholder="Resignation, role change, policy breach..." /></label><div className="customer-detail-actions full-field"><button type="button" className="filter-button" onClick={stopDeactivate} disabled={deactivateSaving}>Cancel</button><button className="primary-button" type="submit" disabled={deactivateSaving}>{deactivateSaving ? <Loader2 size={15} className="spin" /> : null}{deactivateSaving ? ''Deactivating[[ELL]]'' : ''Deactivate account''}</button></div></form>'

# --- 9. Wrap every submit handler: saving state + guard + try/finally ------------------
$marker = '    const submit = (event: FormEvent<HTMLFormElement>) => {'
$indices = New-Object System.Collections.Generic.List[int]
$from = 0
while (($i = $script:content.IndexOf($marker, $from)) -ge 0) { $indices.Add($i); $from = $i + $marker.Length }
if ($indices.Count -ne 11) { throw "Expected 11 submit handlers, found $($indices.Count)" }

$termA = "$nl    };"
for ($k = $indices.Count - 1; $k -ge 0; $k--) {
    $start = $indices[$k]
    $braceOpen = $start + $marker.Length
    $posA = $script:content.IndexOf($termA, $braceOpen)
    $posB = $script:content.IndexOf('}); };', $braceOpen)
    if ($posA -lt 0 -and $posB -lt 0) { throw "No terminator found for handler at $start" }
    if ($posA -lt 0) { $posA = [int]::MaxValue }
    if ($posB -lt 0) { $posB = [int]::MaxValue }

    if ($posA -lt $posB) {
        $inner = $script:content.Substring($braceOpen, $posA - $braceOpen)
        $blockEnd = $posA + $termA.Length
    }
    else {
        $inner = $script:content.Substring($braceOpen, ($posB + 3) - $braceOpen)
        $blockEnd = $posB + 6
    }

    $rawLines = $inner -split [regex]::Escape($nl)
    $bodyLines = New-Object System.Collections.Generic.List[string]
    foreach ($line in $rawLines) { if ($line.Trim().Length -gt 0) { $bodyLines.Add($line) } }
    if ($bodyLines.Count -eq 0) { throw "Empty handler body at $start" }
    $extra = if ($bodyLines.Count -eq 1) { '            ' } else { '    ' }
    $indented = ($bodyLines | ForEach-Object { $extra + $_ }) -join $nl

    $block = '    const [saving, setSaving] = useState(false);' + $nl +
    '    const submit = async (event: FormEvent<HTMLFormElement>) => {' + $nl +
    '        if (saving) return;' + $nl +
    '        setSaving(true);' + $nl +
    '        try {' + $nl +
    $indented + $nl +
    '        } finally { setSaving(false); }' + $nl +
    '    };'

    $script:content = $script:content.Substring(0, $start) + $block + $script:content.Substring($blockEnd)
    $script:changes++
}

# --- finalise placeholder & write ------------------------------------------------------
$script:content = $script:content.Replace('[[ELL]]', $ell)
$remaining = ([regex]::Matches($script:content, [regex]::Escape('const submit = (event: FormEvent<HTMLFormElement>)'))).Count
if ($remaining -ne 0) { throw "Handler wrap incomplete, $remaining unwrapped handlers remain" }
[System.IO.File]::WriteAllText($target, $script:content, $utf8)
Write-Output "AdminPages.tsx: applied $($script:changes) edits"

# --- 10. ChangePasswordModal: add the Loader2 spinner -----------------------------------
$cpPath = Join-Path $root 'src\features\auth\ChangePasswordModal.tsx'
$cp = [System.IO.File]::ReadAllText($cpPath, $utf8)
function Set-Cp([string]$label, [string]$old, [string]$new) {
    if (-not $cp.Contains($old)) { throw "SEARCH NOT FOUND [ChangePasswordModal/$label]" }
    $script:cp = $cp.Replace($old, $new)
}
Set-Cp 'import' "import { ShieldCheck } from 'lucide-react';" "import { Loader2, ShieldCheck } from 'lucide-react';"
$cp = $script:cp
Set-Cp 'guard' "        event.preventDefault();`n        setError('');" "        event.preventDefault();`n        if (saving) return;`n        setError('');"
$cp = $script:cp
Set-Cp 'button' '<button type="submit" className="primary-button" disabled={saving}>{saving ? ''Updating[[ELL]]'' : ''Change password''}</button>' '<button type="submit" className="primary-button" disabled={saving}>{saving ? <Loader2 size={15} className="spin" /> : null}{saving ? ''Updating[[ELL]]'' : ''Change password''}</button>'
$cp = $script:cp.Replace('[[ELL]]', $ell)
[System.IO.File]::WriteAllText($cpPath, $cp, $utf8)
Write-Output 'ChangePasswordModal.tsx: applied 3 edits'
Write-Output 'DONE'
