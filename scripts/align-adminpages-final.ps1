$ErrorActionPreference = 'Stop'

# Final alignment pass for AdminPages.tsx against docs/client-answers.md:
# - Regular savings naming (Savings/Current/Term deposit -> Regular savings/Fixed deposit/Recurring deposit)
# - 85% loan-against-FD validation
# - Weekly-basis SHG loan seed example
# - >Rs 2,00,000 withdrawal seed example (President approval)
# - KYC Aadhaar labeling
# All search/replace strings are ASCII-only (no U+00B7, no U+20B9).

$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$content = [System.IO.File]::ReadAllText($path, $utf8)
$beforeLines = ($content -split "`n").Count
$newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }

# --- Multi-line insertion payloads ---

$fdCapLine = "            if (Number(principal) > 100000) { setError('Fixed deposit principal cannot exceed Rs 1,00,000 as per society rules.'); return; }"
$lienLines = "            const lienAmount = Number((lienDetails.match(/\d+/) ?? ['0'])[0]);" + $newline + "            if (lienAmount > Number(principal) * 0.85) { setError('Loan against FD cannot exceed 85% of the FD amount as per society rules.'); return; }"

$loanRow = "    { id: 'LN-30428', customerId: 'CUS-10479', customerName: 'Anita Kalambe', customerPhone: '96XXXX8821', loanType: 'SHG Loan', principal: 60000, loanDate: '2026-06-14', tenureMonths: 24, interestRate: 12, repaymentFrequency: 'Weekly', installmentAmount: 1500, outstandingAmount: 54000, paidAmount: 6000, pendingAmount: 54000, status: 'Active', lifecycle: 'Active', installments: [{ id: 'LNI-528', dueDate: '05 Sep 2026', amount: 1500, principal: 1150, interest: 350, agent: 'Sunita Wankhede', status: 'Pending' }], events: [{ id: 'LNE-30428-1', type: 'Loan disbursed', date: '2026-06-14', actor: 'Suprit Ganvir', reference: 'DISB-30428', note: 'SHG loan disbursed on a weekly collection basis.' }] },"

$loanTail = "reference: 'CLS-30439', note: 'All principal and charges settled; account closed.' }] }," + $newline + "];"

$wdRow = "    { id: 'WD-00882', customerId: 'CUS-10480', customerName: 'Shobha Nagpure', customerPhone: '99XXXX4408', sourceAccountType: 'Fixed deposit', sourceAccountId: 'FD-2024062', amount: 250000, requestedOn: '2026-08-09', requestedBy: 'Customer', channel: 'Branch counter', status: 'Review', reference: 'WD-00882', note: 'High-value withdrawal above Rs 2,00,000 pending President (Vandana Devendra Ganvir) authorization.', events: [{ id: 'WDE-882A', type: 'Requested', date: '09 Aug 2026', performedBy: 'Shobha Nagpure', reference: 'WD-00882', note: 'Withdrawal submitted for President approval.' }] },"

$wdAnchor = "    { id: 'WD-00881', customerId: 'CUS-10482'"

$pairs = @(
    # 1-2: type unions (must run before global renames)
    @{ o = "    accountType: 'Savings deposit' | 'Current deposit' | 'Term deposit';"; n = "    accountType: 'Regular savings' | 'Fixed deposit' | 'Recurring deposit';"; l = 'deposit accountType union' },
    @{ o = "    sourceAccountType: 'Savings deposit' | 'Current deposit' | 'Recurring deposit' | 'Fixed deposit';"; n = "    sourceAccountType: 'Regular savings' | 'Recurring deposit' | 'Fixed deposit';"; l = 'withdrawal sourceAccountType union' },
    # 3-4: global quoted renames
    @{ o = "'Savings deposit'"; n = "'Regular savings'"; l = 'quoted Savings deposit global' },
    @{ o = "'Savings deposit "; n = "'Regular savings "; l = 'Savings deposit prefix global' },
    # 5-6: giant JSX option lists
    @{ o = '<option>Savings deposit</option><option>Current deposit</option><option>Term deposit</option>'; n = '<option>Regular savings</option><option>Fixed deposit</option><option>Recurring deposit</option>'; l = 'deposit modal options' },
    @{ o = '<option>Savings deposit</option><option>Current deposit</option><option>Recurring deposit</option><option>Fixed deposit</option>'; n = '<option>Regular savings</option><option>Recurring deposit</option><option>Fixed deposit</option>'; l = 'withdrawal modal options' },
    # 7-8: depositSeed per-row product fixes
    @{ o = "accountType: 'Current deposit',"; n = "accountType: 'Fixed deposit',"; l = 'deposit seed current to fixed' },
    @{ o = "accountType: 'Term deposit',"; n = "accountType: 'Recurring deposit',"; l = 'deposit seed term to recurring' },
    # 9: 85% loan-against-FD validation
    @{ o = $fdCapLine; n = $fdCapLine + $newline + $lienLines; l = 'FD 85 percent lien cap' },
    # 10: weekly-basis SHG loan seed
    @{ o = $loanTail; n = "reference: 'CLS-30439', note: 'All principal and charges settled; account closed.' }] }," + $newline + $loanRow + $newline + "];"; l = 'weekly SHG loan seed' },
    # 11: >Rs 2,00,000 withdrawal seed (President approval)
    @{ o = $wdAnchor; n = $wdRow + $newline + $wdAnchor; l = 'high value withdrawal seed' },
    # 12-14: KYC Aadhaar labeling
    @{ o = '<label>KYC status<select value={status}'; n = '<label>KYC status (Aadhaar verification)<select value={status}'; l = 'customer modal KYC label' },
    @{ o = 'Account status / KYC'; n = 'Account status / KYC (Aadhaar)'; l = 'scoped customer KYC label' },
    @{ o = '<label>KYC reference<input value={kycReference} onChange={(event) => setKycReference(event.target.value)} /></label>'; n = '<label>KYC reference (Aadhaar)<input value={kycReference} onChange={(event) => setKycReference(event.target.value)} placeholder="Aadhaar number / reference" /></label>'; l = 'deposit modal KYC reference label' }
)

foreach ($p in $pairs) {
    if (-not $content.Contains($p['o'])) { throw "SEARCH NOT FOUND: $($p['l'])" }
    $content = $content.Replace($p['o'], $p['n'])
    Write-Output ("OK: " + $p['l'])
}

[System.IO.File]::WriteAllText($path, $content, $utf8)

# --- Verification ---
$afterLines = ($content -split "`n").Count
Write-Output ("Lines: $beforeLines -> $afterLines")

$legacy = @('Savings deposit', 'Current deposit', 'Term deposit')
foreach ($term in $legacy) {
    $count = ([regex]::Matches($content, [regex]::Escape($term))).Count
    if ($count -ne 0) { throw "LEGACY TERM REMAINS: $term x $count" }
    Write-Output ("ZERO: $term")
}

$expected = @(
    @{ t = 'Regular savings'; min = 10 },
    @{ t = 'LN-30428'; min = 1 },
    @{ t = 'WD-00882'; min = 1 },
    @{ t = '85% of the FD amount'; min = 1 },
    @{ t = 'Aadhaar'; min = 3 },
    @{ t = "repaymentFrequency: 'Weekly'"; min = 1 }
)
foreach ($e in $expected) {
    $count = ([regex]::Matches($content, [regex]::Escape($e['t']))).Count
    if ($count -lt $e['min']) { throw "MISSING EXPECTED: $($e['t']) x $count (min $($e['min']))" }
    Write-Output ("PRESENT: $($e['t']) x $count")
}

Write-Output 'ALIGN-ADMINPAGES-FINAL: ALL CHECKS PASSED'
