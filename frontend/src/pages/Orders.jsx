import React, { useState, useEffect } from 'react';
import { Database, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    currentPage: 1,
    limit: 15,
    totalPages: 1
  });

  const loadOrders = async (targetPage = 1, currentSearch = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrders({
        page: targetPage,
        limit: 15,
        search: currentSearch
      });
      setOrders(data.orders || []);
      setPagination(data.pagination);
      setPage(data.pagination.currentPage);
    } catch (err) {
      console.error('[Orders] Error:', err);
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Delay slightly if typing search query
    const delayDebounce = setTimeout(() => {
      loadOrders(1, search);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handlePageChange = (direction) => {
    const nextPage = direction === 'next' ? page + 1 : page - 1;
    if (nextPage >= 1 && nextPage <= pagination.totalPages) {
      loadOrders(nextPage, search);
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Shipped':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'Pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'Overdue':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Search Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Orders Registry</h2>
          <p className="text-xs text-muted-foreground mt-1">Monitor invoices, dispatch targets, and freight weights in real-time.</p>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country, customer..."
            className="w-full sm:w-64 rounded-md border border-border bg-card-bg pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono shadow-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />
          <span className="text-xs font-mono text-zinc-500">Querying orders registry...</span>
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
        <div className="rounded-lg border border-card-border bg-card-bg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Order ID</th>
                  <th className="px-6 py-3 font-medium">Customer ID</th>
                  <th className="px-6 py-3 font-medium">Order Date</th>
                  <th className="px-6 py-3 font-medium">Ship City</th>
                  <th className="px-6 py-3 font-medium">Ship Country</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Freight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-accent/40">
                      <td className="px-6 py-3 text-muted-foreground font-semibold">{order.order_id}</td>
                      <td className="px-6 py-3 font-medium uppercase">{order.customer_id}</td>
                      <td className="px-6 py-3 text-muted-foreground">{order.order_date || 'N/A'}</td>
                      <td className="px-6 py-3 font-sans font-medium">{order.ship_city}</td>
                      <td className="px-6 py-3 font-sans">{order.ship_country}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${getStatusStyles(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">${order.freight.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-muted-foreground">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="border-t border-border px-6 py-3 bg-muted/10 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Showing {orders.length} entries (Total: {pagination.totalCount})</span>
            
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
