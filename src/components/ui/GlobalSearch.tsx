import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, UserPlus, FilePlus, ArrowDownToLine, ArrowUpRight, Calculator, FileText, X } from 'lucide-react';

export function GlobalSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        inputRef.current?.focus();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const staticLinks = [
        { title: 'Dashboard Overview', path: '/dashboard', icon: <Calculator size={16} /> },
        { title: 'Customers Directory', path: '/customers', icon: <UserPlus size={16} /> },
        { title: 'Savings Deposits', path: '/deposits', icon: <ArrowDownToLine size={16} /> },
        { title: 'Fixed Deposits', path: '/fixed-deposits', icon: <FilePlus size={16} /> },
        { title: 'Recurring Deposits', path: '/recurring-deposits', icon: <FilePlus size={16} /> },
        { title: 'Loans Management', path: '/loans', icon: <FileText size={16} /> },
        { title: 'Pending Withdrawals', path: '/withdrawals', icon: <ArrowUpRight size={16} /> },
        { title: 'Doorstep Collections', path: '/collections', icon: <ArrowDownToLine size={16} /> },
        { title: 'Agent Visits', path: '/visits', icon: <FileText size={16} /> },
        { title: 'System Reports', path: '/reports', icon: <FileText size={16} /> },
        { title: 'Team & Staff', path: '/staff', icon: <UserPlus size={16} /> },
        { title: 'Security Center', path: '/security', icon: <FileText size={16} /> },
        { title: 'System Settings', path: '/settings', icon: <FileText size={16} /> },
    ];

    const actions = [
        { title: 'Add new customer', path: '/customers?action=new', icon: <UserPlus size={16} /> },
        { title: 'Create loan account', path: '/loans?action=new', icon: <FilePlus size={16} /> },
        { title: 'New withdrawal request', path: '/withdrawals?action=new', icon: <ArrowUpRight size={16} /> },
        { title: 'Record deposit', path: '/deposits?action=new', icon: <ArrowDownToLine size={16} /> },
    ];

    const searchLower = query.toLowerCase();
    
    const filteredLinks = staticLinks.filter(item => item.title.toLowerCase().includes(searchLower));
    const filteredActions = actions.filter(item => item.title.toLowerCase().includes(searchLower));

    const handleNavigate = (path: string) => {
        navigate(path);
        onClose();
    };

    return (
        <div className="global-search-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="global-search-modal">
                <div className="global-search-header">
                    <Search size={20} className="global-search-icon" />
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Search pages, customers, accounts or actions..." 
                        className="global-search-input"
                    />
                    <button className="icon-button" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="global-search-results">
                    {query.length > 0 ? (
                        <>
                            {filteredLinks.length > 0 && (
                                <div className="search-section">
                                    <div className="search-section-title">Pages</div>
                                    {filteredLinks.map((link) => (
                                        <button key={link.path} className="search-result-item" onClick={() => handleNavigate(link.path)}>
                                            <div className="search-result-icon">{link.icon}</div>
                                            <span>{link.title}</span>
                                            <ArrowRight size={14} className="search-result-arrow" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {filteredActions.length > 0 && (
                                <div className="search-section">
                                    <div className="search-section-title">Quick Actions</div>
                                    {filteredActions.map((action) => (
                                        <button key={action.title} className="search-result-item" onClick={() => handleNavigate(action.path)}>
                                            <div className="search-result-icon">{action.icon}</div>
                                            <span>{action.title}</span>
                                            <ArrowRight size={14} className="search-result-arrow" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {filteredLinks.length === 0 && filteredActions.length === 0 && (
                                <div className="search-empty">
                                    <Search size={32} className="search-empty-icon" />
                                    <strong>No results found</strong>
                                    <p>We couldn't find anything matching "{query}"</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="search-section">
                                <div className="search-section-title">Quick Actions</div>
                                {actions.map((action) => (
                                    <button key={action.title} className="search-result-item" onClick={() => handleNavigate(action.path)}>
                                        <div className="search-result-icon">{action.icon}</div>
                                        <span>{action.title}</span>
                                        <ArrowRight size={14} className="search-result-arrow" />
                                    </button>
                                ))}
                            </div>
                            <div className="search-section">
                                <div className="search-section-title">Recent Pages</div>
                                {staticLinks.slice(0, 4).map((link) => (
                                    <button key={link.path} className="search-result-item" onClick={() => handleNavigate(link.path)}>
                                        <div className="search-result-icon">{link.icon}</div>
                                        <span>{link.title}</span>
                                        <ArrowRight size={14} className="search-result-arrow" />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                
                <div className="global-search-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>Enter</kbd> to select</span>
                    <span><kbd>ESC</kbd> to close</span>
                </div>
            </div>
        </div>
    );
}
