# align-adminpages-products.ps1
#
# Aligns the product sections of admin-panel/src/features/admin/AdminPages.tsx
# (deposits, recurring deposits, fixed deposits, loans, withdrawals, customers,
# agents and settings) with docs/client-answers.md for Savitribai Fule Mahila
# Nagari Sahakari Patsanstha Maryadit Yavatmal:
#   - Yavatmal customer/agent identities, routes, addresses, organization values
#   - Client loan products (Business/SHG/Personal/Mortgage/Gold), 60% collateral LTV
#   - RD frequencies Daily/Weekly/Monthly/Quarterly
#   - Client payment channels (Cash/Bank transfer/Cheque/Mobile money)
#   - Rs 100 minimum opening balance, Rs 1,00,000 fixed deposit cap
#   - President approval for withdrawals above Rs 2,00,000
#   - Seven client customer types and Penalty transaction type
#   - 3-year retention, client notification channels, S.A.L.A receipt prefix
#
# Edits are applied as literal whole-content Replace() calls because the target
# JSX lines exceed interactive diff line-length limits. All search strings are
# ASCII-only and must match exactly; the script fails loudly if any search is
# not found or if legacy demo terms remain afterwards.

$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$content = [System.IO.File]::ReadAllText($path, $utf8)
$newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }

# ---------------------------------------------------------------------------
# Multi-line validation blocks, joined with the file's own newline style.
# ---------------------------------------------------------------------------

$depositValidationOriginal = "if (!customerId.trim() || !openingAmount || Number(openingAmount) <= 0 || !openedOn) { setError('Customer, opening deposit amount and opening date are required.'); return; }"
$depositValidationUpdated = $depositValidationOriginal + $newline + "            if (Number(openingAmount) < 100) { setError('Minimum opening balance is Rs 100 as per society rules.'); return; }"

$fdValidationOriginal = "if (!customerId.trim() || !principal || Number(principal) <= 0 || !openedOn || !maturityDate || !nomineeName.trim() || !nomineeRelation.trim()) { setError('Customer, principal, dates and complete nominee details are required.'); return; }"
$fdValidationUpdated = $fdValidationOriginal + $newline + "            if (Number(principal) > 100000) { setError('Fixed deposit principal cannot exceed Rs 1,00,000 as per society rules.'); return; }"

$withdrawalValidationOriginal = "if (!record || !reviewer.trim() || !requestedOn || !reference.trim() || !note.trim()) { setError('Reviewer, decision date, authorization reference and note are required.'); return; }"
$withdrawalValidationUpdated = $withdrawalValidationOriginal + $newline + "        if (decision === 'Approved' && record.amount > 200000 && reviewer.trim() !== 'Vandana Devendra Ganvir') { setError('Withdrawals above Rs 2,00,000 require approval by the President (Vandana Devendra Ganvir).'); return; }"

# ---------------------------------------------------------------------------
# Replacement pairs. Order matters: the WD-00880 identity fix runs before the
# bare name renames, structural type/option changes use post-rename text, and
# the customer seed 'Business' fix runs only after the customerType union and
# the customer type options have been replaced.
# ---------------------------------------------------------------------------

$pairs = @(
    @{ o = "customerName: 'Mohan Das', customerPhone: '97XXXX1182'"; n = "customerName: 'Anita Kalambe', customerPhone: '96XXXX8821'"; l = 'WD-00880 seed identity (CUS-10479)' },

    @{ o = 'Meera Joshi'; n = 'Vandana Deshmukh'; l = 'customer rename Meera Joshi' },
    @{ o = 'Vikram Patel'; n = 'Ramesh Bhoyar'; l = 'customer rename Vikram Patel' },
    @{ o = 'Sanjay Rao'; n = 'Shobha Nagpure'; l = 'customer rename Sanjay Rao' },
    @{ o = 'Anita Devi'; n = 'Anita Kalambe'; l = 'customer rename Anita Devi' },
    @{ o = 'Rajesh Kumar'; n = 'Prakash Meshram'; l = 'agent rename Rajesh Kumar' },
    @{ o = 'Priya Sharma'; n = 'Sunita Wankhede'; l = 'agent rename Priya Sharma' },
    @{ o = 'Amit Verma'; n = 'Dinesh Charde'; l = 'agent rename Amit Verma' },
    @{ o = 'Neha Singh'; n = 'Rekha Kalambe'; l = 'agent rename Neha Singh' },
    @{ o = 'Kavita Shah'; n = 'Vandana Deshmukh'; l = 'customer rename Kavita Shah' },
    @{ o = 'Mohan Das'; n = 'Anita Kalambe'; l = 'rows withdrawal WD-00880 display name' },
    @{ o = 'Arjun Kapoor'; n = 'Suprit Ganvir'; l = 'settings activity actor' },

    @{ o = 'Home Loan'; n = 'Business Loan'; l = 'loan product Home Loan' },
    @{ o = 'Other Loan'; n = 'Personal Loan'; l = 'loan product Other Loan' },
    @{ o = 'Home loan'; n = 'Business loan'; l = 'loan product Home loan (sentence case)' },

    @{ o = 'Jaipur Main'; n = 'Yavatmal Main'; l = 'default branch' },
    @{ o = 'Jaipur Central / Market Road'; n = 'Dattapur route'; l = 'agent route AGT-0017' },
    @{ o = 'Jaipur North / Lake View'; n = 'Ambajogai Road route'; l = 'agent route AGT-0016' },
    @{ o = 'Jaipur West / Station Lane'; n = 'Nehru Chowk route'; l = 'agent route AGT-0015' },
    @{ o = 'Jaipur East / Sitapura'; n = 'Waghapur Tekdi route'; l = 'agent route placeholder' },

    @{ o = '12 Finance Street, Central Market, Jaipur, Rajasthan'; n = 'Rajgruha Apartment, Waghapur Tekdi, Yavatmal'; l = 'settings branch address' },
    @{ o = '12 Finance Street, Jaipur, Rajasthan'; n = 'Rajgruha Apartment, Waghapur Tekdi, Yavatmal'; l = 'customer address 1' },
    @{ o = '44 Market Road, Jaipur, Rajasthan'; n = 'Dattapur Road, Yavatmal'; l = 'customer address 2' },
    @{ o = '8 Lake View Colony, Jaipur, Rajasthan'; n = 'Ambajogai Road, Yavatmal'; l = 'customer address 3' },
    @{ o = '19 Station Lane, Jaipur, Rajasthan'; n = 'Nehru Chowk, Yavatmal'; l = 'customer address 4' },
    @{ o = '2 Old Town, Jaipur, Rajasthan'; n = 'Waghapur Tekdi, Yavatmal'; l = 'customer address 5' },

    @{ o = 'Finora Cooperative Finance'; n = 'Savitribai Fule Mahila Nagari Sahakari Patsanstha Maryadit Yavatmal'; l = 'organization name' },
    @{ o = '@finora.coop'; n = '@savitribaipatsanstha.coop'; l = 'email domain' },
    @{ o = 'CF-2019-8841'; n = 'Yavatmal/RSR/CR/2026/0659'; l = 'registration number' },
    @{ o = 'JPR-CENTRAL'; n = 'YVT-MAIN'; l = 'branch code' },
    @{ o = 'Jaipur Central Branch'; n = 'Yavatmal Branch'; l = 'branch name' },
    @{ o = 'SMS, email, in-app'; n = 'SMS, WhatsApp, email, printed receipt, app notification, voice call'; l = 'notification channels' },
    @{ o = "gracePeriodDays: '3'"; n = "gracePeriodDays: '30'"; l = 'grace period one month' },
    @{ o = "receiptPrefix: 'FIN'"; n = "receiptPrefix: 'S.A.L.A'"; l = 'receipt prefix' },
    @{ o = "auditRetention: '7 years'"; n = "auditRetention: '3 years'"; l = 'audit retention' },
    @{ o = "transactionRetention: '10 years'"; n = "transactionRetention: '3 years'"; l = 'transaction retention' },

    @{ o = "principal: 250000, tenureMonths: 36, interestRate: 8, openedOn: '2024-02-14', maturityDate: '2027-02-14', maturityAmount: 315000"; n = "principal: 100000, tenureMonths: 36, interestRate: 8, openedOn: '2024-02-14', maturityDate: '2027-02-14', maturityAmount: 124000"; l = 'FD-2024062 principal and maturity within cap' },
    @{ o = "amount: 250000, reference: 'FD-OPEN-4062'"; n = "amount: 100000, reference: 'FD-OPEN-4062'"; l = 'FD-2024062 opening event amount' },

    @{ o = "if (loanType === 'Gold Loan' && (!collateralDescription.trim() || Number(collateralValue) <= 0 || Number(collateralLtv) <= 0 || Number(collateralLtv) > 100)) { setError('Gold loans require collateral description, valuation and LTV between 1% and 100%.'); return; }"; n = "if (loanType === 'Gold Loan' && (!collateralDescription.trim() || Number(collateralValue) <= 0 || Number(collateralLtv) <= 0 || Number(collateralLtv) > 60)) { setError('Gold loans require collateral description, valuation and LTV between 1% and 60% as per society rules.'); return; }"; l = 'gold loan collateral LTV cap 60 percent' },

    @{ o = "loanType: 'Gold Loan' | 'Business Loan' | 'Mortgage Loan' | 'Personal Loan';"; n = "loanType: 'Business Loan' | 'SHG Loan' | 'Personal Loan' | 'Mortgage Loan' | 'Gold Loan';"; l = 'loan type union' },
    @{ o = '<option>Gold Loan</option><option>Business Loan</option><option>Mortgage Loan</option><option>Personal Loan</option>'; n = '<option>Business Loan</option><option>SHG Loan</option><option>Personal Loan</option><option>Mortgage Loan</option><option>Gold Loan</option>'; l = 'loan type options in both loan modals' },
    @{ o = "frequency: 'Monthly' | 'Weekly' | 'Quarterly';"; n = "frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';"; l = 'RD frequency union' },
    @{ o = '<option>Monthly</option><option>Weekly</option><option>Quarterly</option>'; n = '<option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option>'; l = 'RD frequency options' },
    @{ o = '<option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option>'; n = '<option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Mobile money</option>'; l = 'deposit payment method options' },
    @{ o = "disbursementMethod?: 'Cash' | 'Bank transfer' | 'Account credit';"; n = "disbursementMethod?: 'Cash' | 'Bank transfer' | 'Cheque' | 'Mobile money';"; l = 'disbursement method type union' },
    @{ o = "payoutMethod?: 'Cash' | 'Bank transfer' | 'Account credit';"; n = "payoutMethod?: 'Cash' | 'Bank transfer' | 'Cheque' | 'Mobile money';"; l = 'withdrawal payout method type union' },
    @{ o = "record?.disbursementMethod ?? 'Account credit'"; n = "record?.disbursementMethod ?? 'Bank transfer'"; l = 'loan disbursement method default' },
    @{ o = '<option>Cash</option><option>Bank transfer</option><option>Account credit</option>'; n = '<option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Mobile money</option>'; l = 'disbursement and payout method options' },
    @{ o = "customerType: 'Individual' | 'Business';"; n = "customerType: 'Individual' | 'Cooperation' | 'Group' | 'SHG' | 'Organisation' | 'Minor' | 'Joint';"; l = 'customer type union' },
    @{ o = '<option>Individual</option><option>Business</option>'; n = '<option>Individual</option><option>Cooperation</option><option>Group</option><option>SHG</option><option>Organisation</option><option>Minor</option><option>Joint</option>'; l = 'customer type options in both customer modals' },
    @{ o = "type: 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal';"; n = "type: 'Deposit collection' | 'RD installment' | 'Loan repayment' | 'Withdrawal' | 'Penalty';"; l = 'customer transaction type union' },
    @{ o = "customerType: 'Business'"; n = "customerType: 'SHG'"; l = 'customer seed type Business to SHG' },

    @{ o = $depositValidationOriginal; n = $depositValidationUpdated; l = 'DepositModal minimum opening balance Rs 100' },
    @{ o = $fdValidationOriginal; n = $fdValidationUpdated; l = 'FDModal principal cap Rs 1,00,000' },
    @{ o = $withdrawalValidationOriginal; n = $withdrawalValidationUpdated; l = 'WithdrawalModal President approval above Rs 2,00,000' }
)

$applied = 0
foreach ($p in $pairs) {
    if (-not $content.Contains($p['o'])) { throw "SEARCH NOT FOUND: $($p['l'])" }
    $content = $content.Replace($p['o'], $p['n'])
    $applied += 1
}

[System.IO.File]::WriteAllText($path, $content, $utf8)

# ---------------------------------------------------------------------------
# Verify that no legacy demo terms remain anywhere in the file.
# ---------------------------------------------------------------------------

$legacyTerms = @(
    'Jaipur', 'Rajasthan', 'Arjun Kapoor', 'Meera Joshi', 'Vikram Patel', 'Sanjay Rao', 'Anita Devi',
    'Rajesh Kumar', 'Priya Sharma', 'Amit Verma', 'Neha Singh', 'Kavita Shah', 'Mohan Das',
    'Finora', 'finora.coop', 'Home Loan', 'Other Loan', '<option>UPI</option>', 'JPR-', "'Business'"
)
$remaining = @()
foreach ($term in $legacyTerms) {
    $count = ([regex]::Matches($content, [regex]::Escape($term))).Count
    if ($count -gt 0) { $remaining += "$term=$count" }
}
if ($remaining.Count -gt 0) {
    throw "LEGACY TERMS REMAIN: $($remaining -join '; ')"
}

Write-Host "align-adminpages-products.ps1: applied $applied replacement rules to AdminPages.tsx; all legacy term counts are zero."
