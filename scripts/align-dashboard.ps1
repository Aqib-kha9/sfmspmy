$path = 'admin-panel\src\features\dashboard\DashboardPage.tsx'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($path, $utf8)

# Greeting: M.D. Suprit Ganvir
$text = $text.Replace('Good morning, Arjun', 'Good morning, Suprit')
$text = $text.Replace('with your business today', 'at the patsanstha today')

# Transaction modal: client customers + client transaction types (Daily, RD, Loan repayment, Penalty)
$text = $text.Replace('<option>Meera Joshi</option><option>Vikram Patel</option><option>Sanjay Rao</option><option>Anita Devi</option>', '<option>Vandana Deshmukh</option><option>Ramesh Bhoyar</option><option>Shobha Nagpure</option><option>Anita Kalambe</option>')
$text = $text.Replace('<option>RD installment</option><option>Loan repayment</option><option>Deposit collection</option><option>Withdrawal</option>', '<option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option><option>Deposit collection</option><option>Withdrawal</option>')

# Customer modal: 7 client customer types, client KYC docs, client channels, single Yavatmal branch, client agents
$text = $text.Replace('<option>Individual</option><option>Business</option>', '<option>Individual</option><option>Cooperation</option><option>Group</option><option>SHG</option><option>Organisation</option><option>Minor</option><option>Joint</option>')
$text = $text.Replace('<option>Aadhaar</option><option>PAN</option><option>Passport</option><option>Voter ID</option><option>Driving licence</option>', '<option>Aadhaar</option><option>PAN</option><option>Electricity bill</option>')
$text = $text.Replace('<option>SMS</option><option>WhatsApp</option><option>Email</option><option>Phone</option><option>Do not contact</option>', '<option>SMS</option><option>WhatsApp</option><option>Email</option><option>Printed receipt</option><option>App notification</option><option>Voice call</option>')
$text = $text.Replace('<option>All branches</option><option>Jaipur Main Branch</option><option>Vaishali Nagar Branch</option><option>Jhotwara Branch</option>', '<option>Yavatmal Branch - Rajgruha Apartment, Waghapur Tekdi</option>')
$text = $text.Replace('<option>Jaipur Main Branch</option><option>Vaishali Nagar Branch</option><option>Jhotwara Branch</option>', '<option>Yavatmal Branch - Rajgruha Apartment, Waghapur Tekdi</option>')
$text = $text.Replace('<option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option><option>Neha Singh</option><option>Unassigned</option>', '<option>Prakash Meshram</option><option>Sunita Wankhede</option><option>Dinesh Charde</option><option>Rekha Kalambe</option><option>Unassigned</option>')

# Collection modal: client customers, client collection types, client payment methods, client agents
$text = $text.Replace('<option>Meera Joshi</option><option>Anita Devi</option><option>Vikram Patel</option>', '<option>Vandana Deshmukh</option><option>Anita Kalambe</option><option>Ramesh Bhoyar</option>')
$text = $text.Replace('<option>RD installment</option><option>Loan repayment</option><option>Deposit collection</option><option>Other collection</option>', '<option>Daily collection</option><option>RD installment</option><option>Loan repayment</option><option>Penalty</option>')
$text = $text.Replace('<option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Card</option><option>Cheque</option>', '<option>Cash</option><option>Bank transfer</option><option>Cheque</option><option>Mobile money</option>')
$text = $text.Replace('<option>All agents</option><option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option>', '<option>All agents</option><option>Prakash Meshram</option><option>Sunita Wankhede</option><option>Dinesh Charde</option>')
$text = $text.Replace('<option>Rajesh Kumar</option><option>Priya Sharma</option><option>Amit Verma</option>', '<option>Prakash Meshram</option><option>Sunita Wankhede</option><option>Dinesh Charde</option>')
$text = $text.Replace('defaultValue="Rajesh Kumar"', 'defaultValue="Prakash Meshram"')

# Report modal: client report names, PDF-only export, single Yavatmal branch
$text = $text.Replace('<option>Daily Collection Report</option><option>Agent-wise Collection Report</option><option>Customer-wise Transaction Report</option><option>Deposit & RD Statement</option><option>FD Maturity Report</option><option>Customer-wise Transaction Report</option><option>Loan Collection Report</option><option>Withdrawal Report</option><option>Pending Collection Report</option>', '<option>Cash Collection Report</option><option>Withdrawal Report</option><option>Deposit Report</option><option>Miscellaneous Report</option><option>Agent-wise Collection Report</option><option>Customer-wise Transaction Report</option><option>Loan Collection Report</option><option>Pending Collection Report</option>')
$text = $text.Replace('<option>PDF</option><option>CSV</option><option>Excel</option><option>JSON</option>', '<option>PDF</option>')

[System.IO.File]::WriteAllText($path, $text, $utf8)
Write-Output 'DashboardPage replacements applied.'
