import React from 'react';

export interface PaginationProps {
    page: number;
    pageSize: number;
    totalItems: number;
    itemName?: string;
    setPage: (page: number | ((current: number) => number)) => void;
}

export function Pagination({ page, pageSize, totalItems, itemName = 'items', setPage }: PaginationProps) {
    const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
    const startItem = totalItems ? (page - 1) * pageSize + 1 : 0;
    const endItem = Math.min(page * pageSize, totalItems);

    return (
        <div className="table-footer">
            <span>Showing {startItem}–{endItem} of {totalItems} {itemName}</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                    className="pagination-button" 
                    disabled={page === 1} 
                    onClick={() => setPage(Math.max(1, page - 1))}
                >
                    Previous
                </button>
                {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
                    let num = i + 1;
                    if (pageCount > 7 && page > 4) {
                        num = page - 3 + i;
                        if (num > pageCount) num = pageCount - 7 + i + 1;
                    }
                    return (
                        <button 
                            key={num} 
                            className={`pagination-button ${page === num ? 'selected' : ''}`} 
                            onClick={() => setPage(num)}
                        >
                            {num}
                        </button>
                    );
                })}
                <button 
                    className="pagination-button" 
                    disabled={page >= pageCount} 
                    onClick={() => setPage(Math.min(pageCount, page + 1))}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
