# Rewires the RD "open account" form to use a searchable customer dropdown with
# prefill (mirroring the deposits workflow) plus a real scheme catalogue select.
# Uses literal substring replacement because the RD form is emitted as a single
# long JSX line that line-based editors cannot target partially.
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$path = Join-Path $root 'src/features/admin/AdminPages.tsx'
$text = [System.IO.File]::ReadAllText($path)

$old1 = @'
<label>Customer ID<input value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder="Customer ID" /></label>
'@
$new1 = @'
<label className="full-field">Search customer<input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search by name, mobile number or customer number..." aria-label="Search customers" /></label><label className="full-field">Customer<select value={customerId} onChange={(event) => selectCustomer(event.target.value)} aria-label="Select customer"><option value="">{customerLoading ? 'Loading customers...' : 'Select a customer'}</option>{customers.map((option) => <option key={option.id} value={option.id}>{option.name} - {option.customerNumber}</option>)}</select></label>{customerError ? <p className="form-error full-field">{customerError}</p> : null}{customerDetails ? <p className="form-note full-field">Opening against {customerDetails.name} - {customerDetails.phone}{customerDetails.branch ? ` - ${customerDetails.branch}` : null}</p> : null}
'@

$old2 = @'
<label>Product / scheme code<input value={productCode} onChange={(event) => setProductCode(event.target.value)} /></label><label>Branch<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label>
'@
$new2 = @'
<label>Product / scheme<select value={productCode} onChange={(event) => selectScheme(event.target.value)} aria-label="Select recurring deposit scheme"><option value="">{schemeLoading ? 'Loading schemes...' : schemes.length ? 'Select a scheme' : 'No active schemes configured'}</option>{schemes.map((scheme) => <option key={scheme.id} value={scheme.code}>{scheme.name} - {scheme.code} - {scheme.interestRate}%</option>)}</select></label>{selectedScheme ? <p className="form-note full-field">{selectedScheme.name} collects {selectedScheme.frequency} instalments from {formatCurrency(Number(selectedScheme.minInstalmentAmount))}{selectedScheme.maxInstalmentAmount ? ` to ${formatCurrency(Number(selectedScheme.maxInstalmentAmount))}` : ''} at {selectedScheme.interestRate}% - duration {selectedScheme.minDurationMonths}-{selectedScheme.maxDurationMonths} months - grace {selectedScheme.gracePeriodMonths} month(s)</p> : null}<label>Branch<input value={branch} disabled placeholder="Loaded from the customer record" /></label>
'@

$old3 = @'
<label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label>
'@
$new3 = @'
<label>Nominee phone<input value={nomineePhone} onChange={(event) => setNomineePhone(event.target.value)} /></label><label>Nominee relation<input value={nomineeRelation} onChange={(event) => setNomineeRelation(event.target.value)} /></label>
'@

$old4 = @'
<label>Opening channel<input value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)} /></label>
'@
$new4 = @'
<label>Opening channel<select value={openingChannel} onChange={(event) => setOpeningChannel(event.target.value)}><option>Branch counter</option><option>Doorstep collection</option><option>Mobile app</option><option>Agent assisted</option></select></label>
'@

$pairs = @(
    @{ Old = $old1.Trim(); New = $new1.Trim() },
    @{ Old = $old2.Trim(); New = $new2.Trim() },
    @{ Old = $old3.Trim(); New = $new3.Trim() },
    @{ Old = $old4.Trim(); New = $new4.Trim() }
)

foreach ($pair in $pairs) {
    if (-not $text.Contains($pair.Old)) {
        throw "RD wire: search fragment not found -> $($pair.Old.Substring(0, 40))"
    }
    if ($text.Contains($pair.New)) {
        throw "RD wire: replacement already present -> $($pair.New.Substring(0, 40))"
    }
    $text = $text.Replace($pair.Old, $pair.New)
}

[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'RD customer-select + scheme wiring applied.'
