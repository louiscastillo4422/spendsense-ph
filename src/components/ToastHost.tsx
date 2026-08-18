import { useApp } from '../state/store'

/** iOS-style notification banners for simulated push notifications. */
export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-10 z-50 flex flex-col gap-2 px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="animate-pop pointer-events-auto rounded-3xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700 shadow-card px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[15px] font-bold">
              S
            </span>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">SpendSense PH</p>
                <span className="text-[11px] text-slate-400">now</span>
              </div>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white leading-tight">{t.title}</p>
              {t.body && <p className="text-[13px] text-slate-500 dark:text-slate-300 leading-tight mt-0.5 whitespace-pre-line">{t.body}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
