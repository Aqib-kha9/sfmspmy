$ErrorActionPreference = 'Stop'

# Wires the LoansPage in AdminPages.tsx onto the loansApiRepository backend adapter.
# The page's handler functions were originally synchronous mock closures collapsed
# onto single very long lines, so the script splices whole lines by prefix match
# instead of using text diffing.

$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$utf8 = New-Object System.Text.UTF8Encoding($false)

$raw = [System.IO.File]::ReadAllText($path)
$nl = if ($raw.Contains("`r`n")) { "`r`n" } else { "`n" }
$lines = [System.IO.File]::ReadAllLines($path)

$importAdd = @'
import { loansRepository } from './services/operations/loansApiRepository';
import type { LoanInput as LoanRepoInput, LoanCollectionInput as LoanRepoCollectionInput } from './services/operations/loansApiRepository';
'@
$importAdd = $importAdd -split "`r?`n"

$effectBlock = @'
    useEffect(() => {
        let active = true;
        loansRepository
            .list()
            .then((rows) => { if (active) setLoanRows(rows); })
            .catch((reason) => { if (active) notify(messageFor(reason, 'Unable to load loans from the backend.')); });
        return () => { active = false; };
    }, []);
'@
$effectBlock = $effectBlock -split "`r?`n"

$saveAccount = @'
    const saveAccount = async (input: LoanInput) => {
        try {
            const record = await loansRepository.create(input as LoanRepoInput);
            setLoanRows((current) => [record, ...current]);
            setPage(1);
            close();
            notify(`Loan application ${record.id} opened on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to open the loan application on the backend.'));
        }
    };
'@
$saveAccount = $saveAccount -split "`r?`n"

$saveCollection = @'
    const saveCollection = async (input: LoanCollectionInput) => {
        if (!selected) return;
        try {
            const loanId = selected.loanId ?? selected.id;
            const updated = await loansRepository.recordCollection(loanId, input as LoanRepoCollectionInput);
            setLoanRows((current) => current.map((row) => ((row.loanId ?? row.id) === loanId ? updated : row)));
            setSelected(updated);
            close();
            notify('Loan repayment allocation recorded on the backend.');
        } catch (reason) {
            notify(messageFor(reason, 'Unable to record the loan repayment.'));
        }
    };
'@
$saveCollection = $saveCollection -split "`r?`n"

$updateLifecycle = @'
    const updateLifecycle = async (lifecycle: LoanLifecycle, status: Status) => {
        if (!selected) return;
        try {
            const applicationId = selected.applicationId;
            const loanId = selected.loanId;
            if (lifecycle === 'Approved') {
                if (!applicationId) throw new Error('This record has no backend application to approve.');
                await loansRepository.approve(applicationId, {});
            } else if (lifecycle === 'Active') {
                if (!applicationId) throw new Error('This record has no backend application to disburse.');
                await loansRepository.disburse(applicationId);
            } else if (lifecycle === 'Rescheduled') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                await loansRepository.reschedule(loanId, { effectiveFrom: new Date().toISOString().slice(0, 10), reason: 'Rescheduled from the admin workspace.' });
            } else if (lifecycle === 'Settled') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                await loansRepository.settle(loanId, { reason: 'Settled from the admin workspace.' });
            } else if (lifecycle === 'Written off') {
                if (!loanId) throw new Error('This record has no backend loan account.');
                await loansRepository.writeOff(loanId, { reason: 'Written off from the admin workspace.' });
            } else {
                notify(`The backend has no direct action for the ${lifecycle.toLowerCase()} state.`);
                return;
            }
            void status;
            const refreshed = await loansRepository.list();
            setLoanRows(refreshed);
            const match = refreshed.find((row) => (loanId && row.loanId === loanId) || (applicationId && row.applicationId === applicationId) || row.id === selected.id);
            setSelected(match);
            if (!match) close();
            notify(`Loan moved to ${lifecycle.toLowerCase()} on the backend.`);
        } catch (reason) {
            notify(messageFor(reason, 'Unable to update the loan lifecycle.'));
        }
    };
'@
$updateLifecycle = $updateLifecycle -split "`r?`n"

$openDetail = @'
    const openDetail = (record: LoanRecord) => {
        setSelected(record);
        setModal('detail');
        if (record.loanId) {
            loansRepository.detail(record.loanId)
                .then((full) => { setSelected(full); })
                .catch((reason) => { notify(messageFor(reason, 'Unable to load the loan ledger.')); });
        }
    };
'@
$openDetail = $openDetail -split "`r?`n"

$out = New-Object System.Collections.Generic.List[string]
$stateSeeded = $false
$importUsed = $false
$effectUsed = $false
$accountUsed = $false
$collectionUsed = $false
$lifecycleUsed = $false
$detailUsed = $false

foreach ($line in $lines) {
    if ($line.StartsWith("import type { WithdrawalInput as RepoWithdrawalInput }")) {
        $out.Add($line)
        if (-not $importUsed) { $out.AddRange($importAdd); $importUsed = $true }
        continue
    }
    if ($line -eq '    const [loanRows, setLoanRows] = useState<LoanRecord[]>(loanSeed);') {
        $out.Add('    const [loanRows, setLoanRows] = useState<LoanRecord[]>([]);')
        $stateSeeded = $true
        continue
    }
    if ($line.StartsWith('    const filteredRows = loanRows.filter(')) {
        if (-not $effectUsed) { $out.AddRange($effectBlock); $effectUsed = $true }
        $out.Add($line)
        continue
    }
    if ($line.StartsWith('    const saveAccount = (input: LoanInput) =>')) {
        $out.AddRange($saveAccount); $accountUsed = $true; continue
    }
    if ($line.StartsWith('    const saveCollection = (input: LoanCollectionInput) =>')) {
        $out.AddRange($saveCollection); $collectionUsed = $true; continue
    }
    if ($line.StartsWith('    const updateLifecycle = (lifecycle: LoanLifecycle, status: Status) =>')) {
        $out.AddRange($updateLifecycle); $lifecycleUsed = $true; continue
    }
    if ($line.StartsWith('    const openDetail = (record: LoanRecord) =>')) {
        $out.AddRange($openDetail); $detailUsed = $true; continue
    }
    $out.Add($line)
}

if (-not ($importUsed -and $stateSeeded -and $effectUsed -and $accountUsed -and $collectionUsed -and $lifecycleUsed -and $detailUsed)) {
    throw "LoansPage wiring anchors were not all matched (import=$importUsed state=$stateSeeded effect=$effectUsed account=$accountUsed collection=$collectionUsed lifecycle=$lifecycleUsed detail=$detailUsed)"
}

[System.IO.File]::WriteAllText($path, ($out -join $nl), $utf8)
Write-Output "LoansPage wired: $($out.Count) lines written."
