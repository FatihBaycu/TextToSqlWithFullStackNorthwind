import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Users, 
  Calendar,
  AlertCircle,
  Loader2,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../api';
import MetricCard from '../components/MetricCard';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [metrics, setMetrics] = useState({
    revenue: '$0',
    orders: '0',
    products: '0',
    customers: '0'
  });

  const [monthlySales, setMonthlySales] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stats, charts, activity] = await Promise.all([
          api.getDashboardStats(),
          api.getDashboardCharts(),
          api.getRecentActivity()
        ]);

        const formattedRevenue = stats.revenue.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        });

        setMetrics({
          revenue: formattedRevenue,
          orders: stats.orders.toLocaleString(),
          products: stats.products.toString(),
          customers: stats.customers.toString()
        });

        setMonthlySales(charts.monthlySales);
        setCategorySales(charts.categorySales);
        setRecentOrders(activity.recentOrders);
        setTopProducts(activity.topProducts);

      } catch (err) {
        console.error('[Dashboard] Load failed:', err);
        setError(err.message || 'Database link offline.');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

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

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <span className="text-sm font-mono text-muted-foreground">Loading active telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-6 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-rose-500">Telemetry Connection Offline</h3>
        <p className="mt-2 text-xs text-muted-foreground font-mono leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md border border-border bg-background px-4 py-2 text-xs font-mono text-foreground hover:bg-accent cursor-pointer"
        >
          Reconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Operational Overview</h2>
          <p className="text-xs text-muted-foreground mt-1">Live corporate stats compiled directly from Northwind PostgreSQL instances.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card-bg px-3 py-1.5 text-xs text-muted-foreground font-mono shadow-sm">
          <Calendar className="h-3.5 w-3.5" />
          <span>PostgreSQL Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Gross Corporate Sales" 
          value={metrics.revenue} 
          change="Lifetime Sales" 
          changeType="positive"
          icon={TrendingUp}
        />
        <MetricCard 
          title="Aggregated Orders" 
          value={metrics.orders} 
          change="Purchase records" 
          changeType="positive"
          icon={ShoppingBag}
        />
        <MetricCard 
          title="Catalog Inventory" 
          value={metrics.products} 
          change="Available stock items" 
          changeType="positive"
          icon={Package}
        />
        <MetricCard 
          title="Active Corporate Leads" 
          value={metrics.customers} 
          change="Customer directory" 
          changeType="positive"
          icon={Users}
        />
      </div>

      {/* Analytics Charts Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold tracking-wide font-mono text-foreground uppercase">Sales Revenue Velocity</h3>
            <p className="text-xs text-muted-foreground mt-1">Monthly breakdown of gross historical revenue.</p>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySales} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.06}/>
                    <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--card-border)',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--card-fg)'
                  }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '3px' }}
                  formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="var(--foreground)" strokeWidth={1.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Bar Chart */}
        <div className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold tracking-wide font-mono text-foreground uppercase">Category Distribution</h3>
            <p className="text-xs text-muted-foreground mt-1">Revenue performance broken down by product categories.</p>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} width={65} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'var(--card-bg)', 
                    borderColor: 'var(--card-border)',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--card-fg)'
                  }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)', marginBottom: '3px' }}
                  formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, 'Sales']}
                />
                <Bar dataKey="sales" fill="var(--foreground)" radius={[0, 4, 4, 0]} maxBarSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid of Tables: Recent Orders & Top Stocked Products */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders Table */}
        <div className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold tracking-wide font-mono text-foreground uppercase">Recent Invoices</h3>
              <p className="text-xs text-muted-foreground mt-1">Last invoice executions monitored in PostgreSQL.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 font-medium">ID</th>
                    <th className="py-2.5 font-medium">Company</th>
                    <th className="py-2.5 font-medium">Ship to</th>
                    <th className="py-2.5 font-medium text-center">Status</th>
                    <th className="py-2.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {recentOrders.map((order) => {
                    // Mocks calculation for status here if not returned
                    const status = order.order_id % 3 === 0 ? 'Pending' : order.order_id % 7 === 0 ? 'Overdue' : 'Shipped';
                    return (
                      <tr key={order.order_id} className="hover:bg-accent/40">
                        <td className="py-2.5 text-muted-foreground font-semibold">{order.order_id}</td>
                        <td className="py-2.5 truncate max-w-[130px] font-sans font-medium">{order.company_name}</td>
                        <td className="py-2.5 text-muted-foreground">{order.ship_country}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${getStatusStyles(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-medium">${parseFloat(order.total || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Inventory Stock Levels */}
        <div className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold tracking-wide font-mono text-foreground uppercase">Warehouse Stock</h3>
              <p className="text-xs text-muted-foreground mt-1">Available lines with highest count in stock.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2.5 font-medium">Product Name</th>
                    <th className="py-2.5 font-medium">Category</th>
                    <th className="py-2.5 font-medium text-right">Price</th>
                    <th className="py-2.5 font-medium text-right">In Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {topProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-accent/40">
                      <td className="py-2.5 truncate max-w-[140px] font-sans font-medium">{prod.product_name}</td>
                      <td className="py-2.5 text-muted-foreground">{prod.category_name}</td>
                      <td className="py-2.5 text-right">${parseFloat(prod.unit_price || 0).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-medium text-emerald-500">{prod.units_in_stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
