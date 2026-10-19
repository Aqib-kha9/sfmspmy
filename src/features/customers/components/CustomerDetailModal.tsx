import { useEffect, useState, FormEvent } from 'react';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Modal } from '../../../components/overlays/Modal';
import { StatusPill, statusClass } from '../../../components/ui/StatusPill';
import { collectionsRepository } from '../../admin/services/operations/collectionsApiRepository';
import { depositsRepository, type DepositProduct } from '../../admin/services/operations/depositsApiRepository';
import type { VisitView } from '../../../lib/api/types';
import { formatTimestamp } from '../../admin/services/operations/helpers';
import { Req, Opt, FormLegend } from '../../../components/ui/FieldIndicators';
import type { Customer } from '../types/customer.types';

const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const display = (value: string) => value || 'Not provided';

export function CustomerDetailModal({
    customer,
    onClose,
    onEdit,
    onDelete,
    onViewStatement,
    onApprove,
    onRefreshCustomer,
}: {
    customer: Customer;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onViewStatement: () => void;
    onApprove?: () => void;
    onRefreshCustomer?: () => Promise<void> | void;
}) {
    const [visits, setVisits] = useState<VisitView[]>([]);
    const [openAccountOpen, setOpenAccountOpen] = useState(false);
    const [products, setProducts] = useState<DepositProduct[]>([]);
    const [productCode, setProductCode] = useState('SAV-STD');
    const [openingAmount, setOpeningAmount] = useState('100');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [accountSaving, setAccountSaving] = useState(false);
    const [accountError, setAccountError] = useState('');
    const [accountSuccess, setAccountSuccess] = useState('');
    
    useEffect(() => {
        void collectionsRepository.listVisits({ customerId: customer.systemId, limit: 10 }).then((res) => {
            setVisits(res.items);
        }).catch(console.error);
    }, [customer.systemId]);

    useEffect(() => {
        if (!openAccountOpen) return;
        depositsRepository.products().then((prods) => {
            setProducts(prods);
            const std = prods.find((p) => p.code === 'SAV-STD') || prods[0];
            if (std) {
                setProductCode(std.code);
                setOpeningAmount(String(std.minOpeningAmount || 100));
            }
        }).catch(console.error);
    }, [openAccountOpen]);

    const handleProductChange = (code: string) => {
        setProductCode(code);
        const prod = products.find((p) => p.code === code);
        if (prod) {
            setOpeningAmount(String(prod.minOpeningAmount || 100));
        }
    };

    const handleCreateAccount = async (e: FormEvent) => {
        e.preventDefault();
        if (accountSaving) return;
        setAccountError('');
        setAccountSuccess('');
        const amount = Number(openingAmount);
        if (!amount || amount <= 0) {
            setAccountError('Please enter a valid opening deposit amount.');
            return;
        }
        const selProd = products.find((p) => p.code === productCode);
        if (selProd && amount < selProd.minOpeningAmount) {
            setAccountError(`Minimum opening amount for this scheme is ₹${selProd.minOpeningAmount}`);
            return;
        }
        setAccountSaving(true);
        try {
            const acc = await depositsRepository.create({
                customerId: customer.systemId,
                productCode,
                openingAmount: amount,
                paymentMethod,
            });
            setAccountSuccess(`Account ${acc.id} successfully opened and activated!`);
            if (onRefreshCustomer) {
                await onRefreshCustomer();
            }
            setTimeout(() => {
                setOpenAccountOpen(false);
                setAccountSuccess('');
            }, 1500);
        } catch (err: unknown) {
            setAccountError(err instanceof Error ? err.message : 'Failed to open account.');
        } finally {
            setAccountSaving(false);
        }
    };

    return <>
        <Modal title={customer.name} eyebrow={`CUSTOMER PROFILE / ${customer.id}`} onClose={onClose} wide>
            <p className="customer-modal-intro">Complete identity, KYC, nominee, service and transaction record.</p>
            <div className="customer-profile-summary"><div className="customer-avatar">{initials(customer.name)}</div><div><strong>{customer.id}</strong><span>{customer.phone} · Registered {customer.registrationDate}</span></div><StatusPill status={customer.status} /></div>
            <div className="customer-detail-grid">
                <div><span>Customer type</span><strong>{customer.customerType}</strong></div><div><span>Branch</span><strong>{display(customer.branch)}</strong></div><div><span>Mobile number</span><strong>{customer.phone}</strong></div><div><span>Email</span><strong>{display(customer.email)}</strong></div>
                <div><span>Alternate phone</span><strong>{display(customer.alternatePhone)}</strong></div><div><span>Date of birth / incorporation</span><strong>{display(customer.dateOfBirth)}</strong></div><div><span>Gender</span><strong>{display(customer.gender)}</strong></div><div><span>Occupation / business</span><strong>{display(customer.occupation || customer.businessType)}</strong></div>
                <div><span>Current address</span><strong>{customer.address}</strong></div><div><span>Permanent address</span><strong>{display(customer.permanentAddress)}</strong></div><div><span>Identity</span><strong>{display(customer.identityType)} · {display(customer.identityReference)}</strong></div><div><span>PAN / tax identifier</span><strong>{display(customer.taxIdentifier)}</strong></div>
                <div><span>KYC verification</span><strong>{customer.kycMethod} · {display(customer.kycVerifiedOn)}</strong></div><div><span>AML risk category</span><strong>{display(customer.amlRiskCategory)}</strong></div><div><span>Source of funds</span><strong>{display(customer.sourceOfFunds)}</strong></div><div><span>Communication preference</span><strong>{display(customer.communicationPreference)}</strong></div>
                <div><span>Nominee</span><strong>{customer.nomineeName} · {customer.nomineeRelation}</strong></div><div><span>Nominee mobile</span><strong>{customer.nomineePhone}</strong></div><div><span>Guardian</span><strong>{display(customer.guardianName)} · {display(customer.guardianPhone)}</strong></div><div><span>Consent captured</span><strong>{customer.consentCaptured ? 'Yes' : 'Not recorded'}</strong></div>
                <div><span>Assigned agent</span><strong>{display(customer.assignedAgent)}</strong></div><div><span>Total value</span><strong>{customer.value || '—'}</strong></div><div><span>Account status</span><strong>{customer.status}</strong></div><div><span>Account summary</span><strong>{display(customer.accountSummary)}</strong></div><div><span>Document references</span><strong>{display(customer.documentReferences)}</strong></div>
            </div>
            <section className="customer-subsection">
                <div className="customer-section-heading">
                    <div>
                        <h3>Active accounts and services</h3>
                        <p>Deposit, RD, FD and loan services mapped to this customer.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{customer.services.length} services</span>
                        <button
                            type="button"
                            className="primary-button"
                            style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setOpenAccountOpen(true)}
                        >
                            <Plus size={14} /> Open Account
                        </button>
                    </div>
                </div>
                {customer.services.length ? (
                    <div className="customer-service-list">
                        {customer.services.map((service) => (
                            <div className="customer-service-row" key={service.id}>
                                <div>
                                    <strong>{service.label}</strong>
                                    <span>{service.accountNumber} · {service.detail}</span>
                                </div>
                                <div>
                                    <strong>₹{Number(service.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                    <span className={statusClass(service.status)}>{service.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <strong>No active accounts</strong>
                        <span>This customer has no active accounts currently.</span>
                        <button
                            type="button"
                            className="primary-button"
                            style={{ marginTop: '10px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => setOpenAccountOpen(true)}
                        >
                            <Plus size={15} /> Open Savings / Deposit Account
                        </button>
                    </div>
                )}
            </section>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Transaction history</h3><p>Collections, repayments and withdrawal activity for this customer.</p></div><span>{customer.transactions.length} entries</span></div>{customer.transactions.length ? <div className="customer-transaction-list">{customer.transactions.map((transaction) => <div className="customer-transaction-row" key={transaction.id}><div><strong>{transaction.type}</strong><span>{transaction.id} · {transaction.date || 'Date not recorded'} · {display(transaction.agent)}</span></div><div><strong>₹{Number(transaction.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong><span>{display(transaction.reference)}</span><span className={statusClass(transaction.status)}>{transaction.status}</span></div></div>)}</div> : <div className="empty-state"><strong>No transactions recorded</strong><span>Financial activity will be retained in this history.</span></div>}</section>
            <section className="customer-subsection"><div className="customer-section-heading"><div><h3>Visit history</h3><p>Recent doorstep visits by collection agents.</p></div><span>{visits.length} entries</span></div>{visits.length ? <div className="customer-transaction-list">{visits.map((visit) => <div className="customer-transaction-row" key={visit.id}><div><strong>{visit.visitDate}</strong><span>{visit.agentName} · {visit.visitedAt ? formatTimestamp(visit.visitedAt) : 'No time'}</span></div><div><strong>{visit.outcome === 'notAvailable' ? 'Not Available' : visit.outcome}</strong><span>{display(visit.remark || '')}</span><span className={`status-pill ${visit.outcome}`}>{visit.outcome}</span></div></div>)}</div> : <div className="empty-state"><strong>No visits recorded</strong><span>Agents have not recorded any visits for this customer yet.</span></div>}</section>
            <div className="customer-detail-actions">
                <button className="secondary-button" onClick={onViewStatement}>View statement</button>
                {customer.status === 'Pending' && onApprove && (
                    <button
                        className="primary-button"
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        onClick={onApprove}
                    >
                        <CheckCircle2 size={15} /> Approve customer
                    </button>
                )}
                {onEdit && <button className="primary-button" onClick={onEdit}>Edit customer</button>}
                {onDelete && (
                    <button
                        className="primary-button"
                        style={{ background: '#dc2626', borderColor: '#dc2626' }}
                        onClick={onDelete}
                    >
                        Delete customer
                    </button>
                )}
            </div>
        </Modal>

        {openAccountOpen && (
            <Modal title={`Open Account · ${customer.name}`} eyebrow="ACCOUNT ONBOARDING" onClose={() => setOpenAccountOpen(false)}>
                <form className="form-grid customer-form" onSubmit={(e) => void handleCreateAccount(e)}>
                    <FormLegend />
                    <p className="form-note full-field">
                        Opening an account against <strong>{customer.name}</strong> ({customer.id}). Accounts are activated immediately.
                    </p>
                    <label className="full-field">
                        <span>Product / Scheme <Req /></span>
                        <select value={productCode} onChange={(e) => handleProductChange(e.target.value)}>
                            {products.map((p) => (
                                <option key={p.id} value={p.code}>
                                    {p.name} · {p.code} (Min: ₹{p.minOpeningAmount})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Opening Deposit Amount (₹) <Req /></span>
                        <input
                            type="number"
                            min="1"
                            value={openingAmount}
                            onChange={(e) => setOpeningAmount(e.target.value)}
                            placeholder="100"
                        />
                    </label>
                    <label>
                        <span>Payment Method <Req /></span>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </label>
                    {accountError && <p className="form-error full-field">{accountError}</p>}
                    {accountSuccess && <p className="form-note full-field" style={{ color: '#16a34a', fontWeight: 600 }}>{accountSuccess}</p>}
                    <div className="admin-form-actions full-field">
                        <button type="button" className="secondary-button" onClick={() => setOpenAccountOpen(false)} disabled={accountSaving}>
                            Cancel
                        </button>
                        <button type="submit" className="primary-button" disabled={accountSaving}>
                            {accountSaving ? <Loader2 size={15} className="spin" /> : null}
                            {accountSaving ? 'Opening account…' : 'Open & Activate Account'}
                        </button>
                    </div>
                </form>
            </Modal>
        )}
    </>;
}

