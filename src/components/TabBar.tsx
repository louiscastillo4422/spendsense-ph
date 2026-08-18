export type Screen =
  | 'home'
  | 'accounts'
  | 'transactions'
  | 'goals'
  | 'more'
  | 'budget'
  | 'automation'
  | 'testsms'
  | 'security'
  | 'reports'

const SECONDARY: Screen[] = ['more', 'budget', 'automation', 'testsms', 'security', 'reports']

const TABS: { key: Screen; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'accounts', label: 'Accounts', icon: '💳' },
  { key: 'transactions', label: 'Activity', icon: '📊' },
  { key: 'goals', label: 'Goals', icon: '🎯' },
  { key: 'more', label: 'More', icon: '⋯' },
]

export function TabBar({ current, onChange }: { current: Screen; onChange: (s: Screen) => void }) {
  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 border-t border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl">
      <div className="flex items-stretch justify-around px-2 pt-1.5 pb-6">
        {TABS.map((tab) => {
          const active = current === tab.key || (tab.key === 'more' && SECONDARY.includes(current))
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition ${
                active ? 'text-slate-900 dark:text-white' : 'text-slate-400'
              }`}
            >
              <span className={`text-[19px] leading-none transition ${active ? 'scale-110' : ''}`}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
