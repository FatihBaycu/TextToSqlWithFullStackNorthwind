import React from 'react';

export default function MetricCard({ title, value, change, changeType, icon: Icon }) {
  return (
    <div className="rounded-lg border border-card-border bg-card-bg p-6 transition-all hover:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-mono text-zinc-500 uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-zinc-400" />}
      </div>
      
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-semibold tracking-tight font-mono text-zinc-100">{value}</span>
        {change && (
          <span className={`text-xs font-mono font-medium ${
            changeType === 'positive' ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {changeType === 'positive' ? '+' : ''}{change}
          </span>
        )}
      </div>
    </div>
  );
}
