# Aligns AdminPages.tsx collections, reconciliation, reports and security sections
# with the client questionnaire answers (docs/client-answers.md).
# All search strings are ASCII-only; the middle dot is built via char code.
$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot '..\src\features\admin\AdminPages.tsx'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$content = [System.IO.File]::ReadAllText($path, $utf8)
$newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
$dot = [string][char]0xB7

# Reconciliation event display times (contain a middle dot).
$ev1o = "date: '22 Aug 2026 $dot 06:10 PM'"; $ev1n = "date: '22 Aug 2026 $dot 04:10 PM'"
$ev2o = "date: '22 Aug 2026 $dot 06:25 PM'"; $ev2n = "date: '22 Aug 2026 $dot 04:25 PM'"
$ev3o = "date: '22 Aug 2026 $dot 06:22 PM'"; $ev3n = "date: '22 Aug 2026 $dot 04:22 PM'"
$ev4o = "date: '22 Aug 2026 $dot 06:45 PM'"; $ev4n = "date: '22 Aug 2026 $dot 04:45 PM'"
$ev5o = "date: '22 Aug 2026 $dot 06:48 PM'"; $ev5n = "date: '22 Aug 2026 $dot 04:48 PM'"

# Security policy + role seed blocks (multi-line).
$loginOld = "    { id: 'login', name: 'Failed login protection', description: 'Lock an account after repeated failed authentication attempts.', enabled: true, value: '5 attempts / 15 minutes' },"
$loginNew = "    { id: 'login', name: 'Failed login protection', description: 'Lock an account after repeated failed attempts. The Managing Director unlocks locked accounts.', enabled: true, value: '5 attempts, then lock - unlocked by Managing Director' },"

$rotationOld = "    { id: 'rotation', name: 'Refresh token rotation', description: 'Rotate sessions when a refresh token is used.', enabled: true, value: 'Enabled' },"
$rotationNew = "    { id: 'rotation', name: 'Refresh token rotation', description: 'Rotate sessions when a refresh token is used.', enabled: true, value: 'Enabled' },$newline    { id: 'session', name: 'Session timeout', description: 'Automatically sign out idle sessions after the configured window.', enabled: true, value: '30-60 minutes' },"

$roleAdminOld = "    { id: 'role-admin', name: 'Super Admin / Proprietor', members: 2, scope: 'All branches and financial operations', permissions: ['Customers', 'Accounts', 'Approvals', 'Reports', 'Security'], status: 'Active' },"
$roleAdminNew = "    { id: 'role-md', name: 'Managing Director', members: 1, scope: 'All patsanstha operations and financial controls', permissions: ['Customers', 'Accounts', 'Loans', 'Deposits', 'Withdrawals', 'Approvals', 'Reports', 'Security'], status: 'Active' },"

$roleOpsOld = "    { id: 'role-ops', name: 'Operations Manager', members: 3, scope: 'Assigned branches and collections', permissions: ['Customers', 'Collections', 'Reconciliation', 'Reports'], status: 'Active' },"
$roleOpsNew = "    { id: 'role-president', name: 'President', members: 1, scope: 'High-value withdrawal approvals and governance', permissions: ['Customers', 'Accounts', 'High-value approvals', 'Reports'], status: 'Active' },$newline    { id: 'role-vp', name: 'Vice President', members: 1, scope: 'Governance oversight and reviews', permissions: ['Customers', 'Reports'], status: 'Active' },$newline    { id: 'role-manager', name: 'Manager', members: 1, scope: 'Branch operations and staff supervision', permissions: ['Customers', 'Accounts', 'Collections', 'Reconciliation', 'Reports'], status: 'Active' },"

$roleAgentOld = "    { id: 'role-agent', name: 'Collection Agent', members: 18, scope: 'Assigned route and customers only', permissions: ['Assigned customers', 'Mobile collection', 'Own history'], status: 'Active' },"
$roleAgentNew = "    { id: 'role-cashier', name: 'Cashier', members: 1, scope: 'Cash counting, handover and daily cash report', permissions: ['Collections', 'Reconciliation', 'Cash report'], status: 'Active' },$newline    { id: 'role-clerk', name: 'Clerk', members: 1, scope: 'Account entries and customer service', permissions: ['Customers', 'Accounts', 'Deposits'], status: 'Active' },$newline    { id: 'role-agent', name: 'Collection Agent', members: 4, scope: 'Assigned route and customers only', permissions: ['Assigned customers', 'Mobile collection', 'Own history'], status: 'Active' },"

$pairs = @(
    @{ o = "<option>All agents</option><option>Arjun Kapoor</option><option>Priya Sharma</option><option>Rajesh Kumar</option>"; n = "<option>All agents</option><option>Prakash Meshram</option><option>Sunita Wankhede</option><option>Dinesh Charde</option><option>Rekha Kalambe</option>"; l = 'reports agent select' }
    @{ o = "generatedBy: 'Priya Sharma'"; n = "generatedBy: 'Suprit Ganvir'"; l = 'report generatedBy Priya' }
    @{ o = "name: 'Daily Collection Report'"; n = "name: 'Cash Collection Report'"; l = 'report name daily collection' }
    @{ o = "name: 'Deposit & RD Statement', category: 'Finance', scope: 'Deposit and RD accounts', output: 'Opening balance, installments, credits and closing balance', description: 'Account-level statement for savings deposits and recurring deposit schedules.'"; n = "name: 'Deposit Report', category: 'Finance', scope: 'Deposit accounts', output: 'Opening balance, deposits, credits and closing balance', description: 'Account-level statement for regular savings and recurring deposit accounts.'"; l = 'report deposit statement' }
    @{ o = "name: 'FD Maturity Report', category: 'Finance', scope: 'Fixed deposits', output: 'Maturity date, principal, interest and maturity value', description: 'Track upcoming fixed deposit maturities and payout readiness.'"; n = "name: 'Miscellaneous Report', category: 'Compliance', scope: 'Miscellaneous records', output: 'Miscellaneous entries, references and audit details', description: 'Miscellaneous operational and compliance outputs for the patsanstha.'"; l = 'report miscellaneous' }
    @{ o = "const [format, setFormat] = useState<'PDF' | 'CSV' | 'Excel'>('PDF');"; n = "const [format, setFormat] = useState<'PDF'>('PDF');"; l = 'report format type' }
    @{ o = "<option>PDF</option><option>CSV</option><option>Excel</option>"; n = "<option>PDF</option>"; l = 'report format options' }
    @{ o = "const [branch, setBranch] = useState('All branches');"; n = "const [branch, setBranch] = useState('Yavatmal branch');"; l = 'report branch state' }
    @{ o = "<option>All branches</option><option>JPR-CENTRAL</option><option>JPR-NORTH</option>"; n = "<option>Yavatmal branch</option>"; l = 'report branch options' }
    @{ o = "collectionType: 'Deposit collection' | 'RD collection' | 'Loan installment' | 'Other collection';"; n = "collectionType: 'Daily collection' | 'RD installment' | 'Loan repayment' | 'Penalty' | 'Other collection';"; l = 'collection type union' }
    @{ o = "collectionType: 'Deposit collection'"; n = "collectionType: 'Daily collection'"; l = 'collection seed deposit type' }
    @{ o = "collectionType: 'RD collection'"; n = "collectionType: 'RD installment'"; l = 'collection seed rd type' }
    @{ o = "collectionType: 'Loan installment'"; n = "collectionType: 'Loan repayment'"; l = 'collection seed loan type' }
    @{ o = "('RD collection')"; n = "('RD installment')"; l = 'collection modal default type' }
    @{ o = "<option>Deposit collection</option><option>RD collection</option><option>Loan installment</option><option>Other collection</option>"; n = "<option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option><option>Other collection</option>"; l = 'collection type select options' }
    @{ o = "customerName: 'Meera Joshi'"; n = "customerName: 'Vandana Deshmukh'"; l = 'collection customer Meera' }
    @{ o = "customerName: 'Vikram Patel'"; n = "customerName: 'Ramesh Bhoyar'"; l = 'collection customer Vikram' }
    @{ o = "customerName: 'Sanjay Rao'"; n = "customerName: 'Shobha Nagpure'"; l = 'collection customer Sanjay' }
    @{ o = "customerName: 'Anita Devi'"; n = "customerName: 'Anita Kalambe'"; l = 'collection customer Anita' }
    @{ o = "agent: 'Rajesh Kumar'"; n = "agent: 'Prakash Meshram'"; l = 'agent field Rajesh' }
    @{ o = "agent: 'Priya Sharma'"; n = "agent: 'Sunita Wankhede'"; l = 'agent field Priya' }
    @{ o = "agent: 'Amit Verma'"; n = "agent: 'Dinesh Charde'"; l = 'agent field Amit' }
    @{ o = "agent: 'Neha Singh'"; n = "agent: 'Rekha Kalambe'"; l = 'agent field Neha' }
    @{ o = "useState('Rajesh Kumar')"; n = "useState('Prakash Meshram')"; l = 'collection modal agent default' }
    @{ o = "<option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option>"; n = "<option>Prakash Meshram</option><option>Sunita Wankhede</option><option>Dinesh Charde</option><option>Rekha Kalambe</option>"; l = 'agent select options' }
    @{ o = "performedBy: 'Rajesh Kumar', note: 'Mobile collection entry synchronized.'"; n = "performedBy: 'Prakash Meshram', note: 'Mobile collection entry synchronized.'"; l = 'collection event Rajesh 1' }
    @{ o = "performedBy: 'Priya Sharma', note: 'Receipt issued and synchronized.'"; n = "performedBy: 'Sunita Wankhede', note: 'Receipt issued and synchronized.'"; l = 'collection event Priya' }
    @{ o = "performedBy: 'Amit Verma', note: 'Entry received from mobile application.'"; n = "performedBy: 'Dinesh Charde', note: 'Entry received from mobile application.'"; l = 'collection event Amit' }
    @{ o = "performedBy: 'Rajesh Kumar', note: 'Entry synchronized successfully.'"; n = "performedBy: 'Prakash Meshram', note: 'Entry synchronized successfully.'"; l = 'collection event Rajesh 2' }
    @{ o = "performedBy: 'Rajesh Kumar', note: 'Daily collection submitted from mobile app.'"; n = "performedBy: 'Prakash Meshram', note: 'Daily collection submitted from mobile app.'"; l = 'recon event Rajesh' }
    @{ o = "performedBy: 'Neha Singh', note: 'Submission is waiting for supervisor verification.'"; n = "performedBy: 'Rekha Kalambe', note: 'Submission is waiting for supervisor verification.'"; l = 'recon event Neha' }
    @{ o = "Capture the customer payment, assigned agent and receipt audit details."; n = "Capture the customer payment, assigned agent and receipt audit details. Collect only from the customer or an authorised person - third-party collection is not permitted."; l = 'collection modal description' }
    @{ o = "route: 'Jaipur East / Sitapura'"; n = "route: 'Waghapur Tekdi route'"; l = 'recon route 1' }
    @{ o = "route: 'Jaipur North / Vaishali Nagar'"; n = "route: 'Dattapur route'"; l = 'recon route 2' }
    @{ o = "route: 'Jaipur South / Sanganer'"; n = "route: 'Ambajogai Road route'"; l = 'recon route 3' }
    @{ o = "route: 'Jaipur West / Mansarovar'"; n = "route: 'Nehru Chowk route'"; l = 'recon route 4' }
    @{ o = "submittedOn: '2026-08-22T18:10'"; n = "submittedOn: '2026-08-22T16:10'"; l = 'recon submittedOn 1' }
    @{ o = "submittedOn: '2026-08-22T18:22'"; n = "submittedOn: '2026-08-22T16:22'"; l = 'recon submittedOn 2' }
    @{ o = "submittedOn: '2026-08-22T18:35'"; n = "submittedOn: '2026-08-22T16:35'"; l = 'recon submittedOn 3' }
    @{ o = "submittedOn: '2026-08-22T18:48'"; n = "submittedOn: '2026-08-22T16:48'"; l = 'recon submittedOn 4' }
    @{ o = $ev1o; n = $ev1n; l = 'recon event time 1' }
    @{ o = $ev2o; n = $ev2n; l = 'recon event time 2' }
    @{ o = $ev3o; n = $ev3n; l = 'recon event time 3' }
    @{ o = $ev4o; n = $ev4n; l = 'recon event time 4' }
    @{ o = $ev5o; n = $ev5n; l = 'recon event time 5' }
    @{ o = "remarks: 'All receipts and cash count verified.'"; n = "remarks: 'All receipts verified and cash counted by the Cashier.'"; l = 'recon remarks cashier' }
    @{ o = "Verify agent cash submissions against recorded collections and resolve exceptions."; n = "Verify agent cash submissions against recorded collections and resolve exceptions. Cash handover closes before 4:00 PM and daily submission before 5:00 PM."; l = 'recon page description' }
    @{ o = $loginOld; n = $loginNew; l = 'login lockout policy' }
    @{ o = $rotationOld; n = $rotationNew; l = 'session timeout policy' }
    @{ o = $roleAdminOld; n = $roleAdminNew; l = 'security role MD' }
    @{ o = $roleOpsOld; n = $roleOpsNew; l = 'security roles president vp manager' }
    @{ o = $roleAgentOld; n = $roleAgentNew; l = 'security roles cashier clerk agent' }
    @{ o = "role: 'Super Admin / Proprietor'"; n = "role: 'Managing Director'"; l = 'session role MD' }
    @{ o = "user: 'Priya Sharma', role: 'Operations Manager'"; n = "user: 'Vandana Devendra Ganvir', role: 'President'"; l = 'session president' }
    @{ o = "user: 'Rajesh Kumar', role: 'Collection Agent'"; n = "user: 'Prakash Meshram', role: 'Collection Agent'"; l = 'session agent' }
    @{ o = "location: 'Jaipur, IN'"; n = "location: 'Yavatmal, IN'"; l = 'session locations Jaipur' }
    @{ o = "location: 'Delhi, IN'"; n = "location: 'Nagpur, IN'"; l = 'session location Delhi' }
    @{ o = "device: 'Finora mobile app'"; n = "device: 'Patsanstha mobile app'"; l = 'session device Finora' }
    @{ o = "Manage authentication posture, role permissions, active sessions and immutable audit activity."; n = "Manage authentication posture, role permissions, active sessions and immutable audit activity. Activity history is immutable and reviewed by the Managing Director."; l = 'security page description' }
    @{ o = "'Arjun Kapoor'"; n = "'Suprit Ganvir'"; l = 'global Arjun Kapoor' }
)

$applied = 0
foreach ($p in $pairs) {
    $old = $p['o']
    if (-not $content.Contains($old)) { throw "SEARCH NOT FOUND: $($p['l'])" }
    $content = $content.Replace($old, $p['n'])
    $applied++
}

[System.IO.File]::WriteAllText($path, $content, $utf8)
Write-Output "Applied $applied replacement rules."

$legacy = @('Jaipur', 'Arjun Kapoor', 'Meera Joshi', 'Vikram Patel', 'Sanjay Rao', 'Anita Devi', 'Rajesh Kumar', 'Priya Sharma', 'Amit Verma', 'Neha Singh', 'Finora', 'JPR-', 'Super Admin', 'Operations Manager', 'Delhi, IN', 'RD collection', 'Loan installment', 'CSV', 'Excel')
foreach ($term in $legacy) {
    $count = ([regex]::Matches($content, [regex]::Escape($term))).Count
    Write-Output "remaining '$term' = $count"
}
