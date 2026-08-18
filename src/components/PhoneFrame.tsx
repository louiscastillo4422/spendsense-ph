import type { ReactNode } from 'react'

/** A 390×844 iPhone shell with a status bar and dynamic-island notch. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full flex flex-col items-center justify-start sm:justify-center py-6 px-3">
      <div className="relative">
        {/* device body */}
        <div className="relative w-[390px] h-[844px] max-h-[92vh] rounded-[3.2rem] bg-slate-950 p-[10px] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)]">
          <div className="relative h-full w-full overflow-hidden rounded-[2.6rem] bg-slate-50 dark:bg-slate-950">
            <StatusBar />
            {children}
          </div>
        </div>
        {/* side buttons */}
        <div className="absolute -left-[3px] top-32 h-8 w-[3px] rounded-l bg-slate-800" />
        <div className="absolute -left-[3px] top-44 h-12 w-[3px] rounded-l bg-slate-800" />
        <div className="absolute -left-[3px] top-60 h-12 w-[3px] rounded-l bg-slate-800" />
        <div className="absolute -right-[3px] top-52 h-16 w-[3px] rounded-r bg-slate-800" />
      </div>
      <p className="mt-3 text-[11px] text-slate-400 text-center max-w-[360px]">
        Interactive prototype · Not affiliated with BPI or GCash · All data is fictional and stays on your device
      </p>
    </div>
  )
}

function StatusBar() {
  return (
    <div className="relative z-30 flex items-center justify-between px-7 pt-2.5 pb-1 text-[13px] font-semibold text-slate-900 dark:text-white select-none">
      <span>9:41</span>
      <div className="absolute left-1/2 top-2 -translate-x-1/2 h-6 w-28 rounded-full bg-slate-950" />
      <div className="flex items-center gap-1.5">
        <span aria-hidden>▂▄▆</span>
        <span aria-hidden className="text-[11px]">
          5G
        </span>
        <span aria-hidden>🔋</span>
      </div>
    </div>
  )
}
