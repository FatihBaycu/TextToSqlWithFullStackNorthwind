import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Terminal,
  Sun,
  Moon
} from 'lucide-react';

export default function Layout({ children, currentPage, setCurrentPage }) {
  const [collapsed, setCollapsed] = useState(false);
  const [dbStatus, setDbStatus] = useState('connecting');
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  // Sync theme to root classList and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Verify connection to backend health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:5001/health');
        if (res.ok) {
          setDbStatus('connected');
        } else {
          setDbStatus('disconnected');
        }
      } catch (err) {
        setDbStatus('disconnected');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, highlight: true }
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 bg-sidebar">
          {!collapsed && (
            <div className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wider text-foreground">
              <Terminal className="h-4 w-4" />
              <span>SQL_ASSISTANT</span>
            </div>
          )}
          {collapsed && (
            <Terminal className="mx-auto h-4 w-4 text-foreground" />
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 hover:bg-accent hover:text-accent-foreground text-sidebar-fg cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm' 
                    : item.highlight 
                      ? 'text-foreground hover:bg-accent hover:text-accent-foreground border border-dashed border-sidebar-border'
                      : 'text-sidebar-fg hover:bg-accent hover:text-accent-foreground'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.highlight && (
                  <span className="ml-auto rounded bg-zinc-800 dark:bg-zinc-850 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Database Status Pin */}
        <div className="border-t border-sidebar-border p-3">
          <div className={`flex items-center gap-3 rounded-md p-2 text-xs font-mono bg-background border border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase">Database</span>
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    dbStatus === 'connected' ? 'bg-emerald-500 shadow-sm' : 
                    dbStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  {dbStatus === 'connected' ? 'Northwind' : dbStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-8">
          <h1 className="text-sm font-semibold tracking-wide uppercase font-mono text-muted-foreground">
            {currentPage}
          </h1>
          <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-md p-2 border border-border bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer text-foreground shadow-sm"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <span>Server: localhost:5001</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
