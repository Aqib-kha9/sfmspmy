# Reverts the collateral replacements made by wire-rd-customer-select.ps1.
# That script used String.Replace on the whole file, so identical "Customer ID"
# / "Product / scheme code" / "Nominee phone" / "Opening channel" fragments in
# CollectionModal, the FD modal and WithdrawalModal were also rewritten even
# though those components have no RD customer/scheme state.
#
# Because every collateral replacement sits on its own single long JSX line, we
# revert per line. RDModal (line 1097) is intentionally left untouched.
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$path = Join-Path $root 'src/features/admin/AdminPages.tsx'
$text = [System.IO.File]::ReadAllText($path)

$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = $text -split "`r?`n"

# ---- Original fragments (as authored before the RD wiring) ----
$old1 = @'
<label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="Customer ID" /></label>
'@
$old2 = @'
<label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label>
'@
$old3 = @'
<label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label>
'@
$old4 = @'
<label>Opening channel<input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label>
'@

# ---- RD replacement fragments currently present in the file ----
$new1 = @'
<label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} - {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}
'@
$new2 = @'
<label>Product / scheme<select value={productCode} onChange={(event) => selectScheme(event.target.value)} aria-label="Select recurring deposit scheme"><option value="">{schemeLoading ? 'Loading schemes...' : schemes.length ? 'Select a scheme' : 'No active schemes configured'}</option>{schemes.map((scheme) => <option key={scheme.id} value={scheme.code}>{scheme.name} - {scheme.code} - {scheme.interestRate}%</option>)}</select></label>{selectedScheme ? <p className="form-note full-field">{selectedScheme.name} collects {selectedScheme.frequency} instalments from {formatCurrency(Number(selectedScheme.minInstalmentAmount))}{selectedScheme.maxInstalmentAmount ? ` to ${formatCurrency(Number(selectedScheme.maxInstalmentAmount))}` : ''} at {selectedScheme.interestRate}% - duration {selectedScheme.minDurationMonths}-{selectedScheme.maxDurationMonths} months - grace {selectedScheme.gracePeriodMonths} month(s)</p> : null}<label>Branch<input value={branch} disabled placeholder="Loaded from the customer record" /></label>
'@
$new3 = @'
<label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee relation<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} /></label>
'@
$new4 = @'
<label>Opening channel<select value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)}><option>Branch counter</option><option>Doorstep collection</option><option>Mobile app</option><option>Agent assisted</option></select></label>
'@

$old1 = $old1.Trim(); $old2 = $old2.Trim(); $old3 = $old3.Trim(); $old4 = $old4.Trim()
$new1 = $new1.Trim(); $new2 = $new2.Trim(); $new3 = $new3.Trim(); $new4 = $new4.Trim()

# Guard: the correct RDModal wiring must still be present and untouched.
if (-not $lines[1096].Contains('selectCustomer(event.target.value)')) { throw 'Expected RDModal (line 1097) to still contain the customer dropdown.' }
if (-not $lines[1096].Contains('selectScheme(event.target.value)')) { throw 'Expected RDModal (line 1097) to still contain the scheme dropdown.' }

function Revert-Line {
    param([int]$LineNumber, [string[]]$Search, [string[]]$Replace)
    $index = $LineNumber - 1
    $line = $lines[$index]
    for ($i = 0; $i -lt $Search.Count; $i++) {
        if (-not $line.Contains($Search[$i])) {
            throw "Revert: expected fragment not found on line $LineNumber (index $index)."
        }
        $line = $line.Replace($Search[$i], $Replace[$i])
    }
    $lines[$index] = $line
}

# CollectionModal and WithdrawalModal: drop the customer dropdown that needs
# RD-only state (they keep their original free-text "Customer ID" field).
Revert-Line -LineNumber 235 -Search @($new1) -Replace @($old1)
Revert-Line -LineNumber 1691 -Search @($new1) -Replace @($old1)
# FD modal: drop the scheme select, nominee relation and channel select.
Revert-Line -LineNumber 1273 -Search @($new2, $new3, $new4) -Replace @($old2, $old3, $old4)

[System.IO.File]::WriteAllText($path, [string]::Join($nl, $lines), (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Reverted collateral RD replacements in CollectionModal, FDModal and WithdrawalModal.'
