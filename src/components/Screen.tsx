import type { ReactNode } from 'react'

/** Scrollable content region that sits between the status bar and tab bar. */
export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 top-8 bottom-0 overflow-y-auto no-scrollbar pb-28">
      <div className="px-4 pt-2">{children}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between mb-4 pt-1">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
      <div className="text-4xl">{emoji}</div>
      <h3 className="text-[17px] font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-[260px]">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
