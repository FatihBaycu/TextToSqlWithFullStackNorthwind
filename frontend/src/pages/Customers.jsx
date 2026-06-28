import React, { useState, useEffect } from 'react';
import { Users, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    currentPage: 1,
    limit: 12,
    totalPages: 1
  });

  const loadCustomers = async (targetPage = 1, currentSearch = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomers({
        page: targetPage,
        limit: 12,
        search: currentSearch
      });
      setCustomers(data.customers || []);
      setPagination(data.pagination);
      setPage(data.pagination.currentPage);
    } catch (err) {
      console.error('[Customers] Error:', err);
      setError(err.message || 'Failed to retrieve customer catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadCustomers(1, search);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handlePageChange = (direction) => {
    const nextPage = direction === 'next' ? page + 1 : page - 1;
    if (nextPage >= 1 && nextPage <= pagination.totalPages) {
      loadCustomers(nextPage, search);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Customers Directory</h2>
          <p className="text-xs text-muted-foreground mt-1">Browse active client list contacts, corporate handles, and locations.</p>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, city..."
            className="w-full sm:w-64 rounded-md border border-border bg-card-bg pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono shadow-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
          <span className="text-xs font-mono text-zinc-500">Querying customers directory...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-6 text-center max-w-xl mx-auto my-8 font-mono">
          <AlertCircle className="h-5 w-5 text-rose-500 mx-auto mb-2" />
          <p className="text-xs text-rose-500 font-semibold">Error loading database</p>
          <p className="text-[11px] text-zinc-500 mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customers.length > 0 ? (
              customers.map((cust) => (
                <div 
                  key={cust.customer_id} 
                  className="rounded-lg border border-card-border bg-card-bg p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-800 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground tracking-tight leading-snug font-sans">
                        {cust.company_name}
                      </h3>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono font-medium text-muted-foreground uppercase">
                        {cust.customer_id}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs text-foreground font-medium font-sans">{cust.contact_name}</p>
                      <p className="text-[10px] text-muted-foreground font-sans italic leading-none">{cust.contact_title}</p>
                    </div>
                  </div>

                  <div className="border-t border-border mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
                    <span>{cust.city}, {cust.country}</span>
                    <span className="text-foreground">{cust.phone}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-border p-8 text-center text-xs text-muted-foreground font-mono bg-card-bg">
                No matching customers found.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="rounded-lg border border-card-border bg-card-bg px-6 py-3 flex items-center justify-between text-[11px] text-muted-foreground font-mono shadow-sm">
            <span>Showing {customers.length} entries (Total: {pagination.totalCount})</span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-background cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={page >= pagination.totalPages}
                className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 hover:bg-accent hover:text-accent-foreground disabled:opacity-30 disabled:hover:bg-background cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
