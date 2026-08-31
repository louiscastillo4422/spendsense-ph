import { useState } from 'react'
import { StoreProvider, useApp } from './state/store'
import { PhoneFrame } from './components/PhoneFrame'
import { TabBar, type Screen } from './components/TabBar'
import { ToastHost } from './components/ToastHost'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Accounts } from './screens/Accounts'
import { Transactions } from './screens/Transactions'
import { Goals } from './screens/Goals'
import { More } from './screens/More'
import { Budget } from './screens/Budget'
import { Automation } from './screens/Automation'
import { TestSMS } from './screens/TestSMS'
import { Security } from './screens/Security'
import { Reports } from './screens/Reports'
import { Insights } from './screens/Insights'
import { ParserRules } from './screens/ParserRules'

function Shell() {
  const { state } = useApp()
  const [screen, setScreen] = useState<Screen>('home')

  if (!state.settings.onboarded) {
    return (
      <PhoneFrame>
        <Onboarding />
        <ToastHost />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      {screen === 'home' && <Home navigate={setScreen} />}
      {screen === 'accounts' && <Accounts />}
      {screen === 'transactions' && <Transactions />}
      {screen === 'goals' && <Goals />}
      {screen === 'more' && <More navigate={setScreen} />}
      {screen === 'budget' && <Budget />}
      {screen === 'automation' && <Automation />}
      {screen === 'testsms' && <TestSMS navigate={setScreen} />}
      {screen === 'security' && <Security />}
      {screen === 'reports' && <Reports />}
      {screen === 'insights' && <Insights />}
      {screen === 'parserrules' && <ParserRules />}

      <ToastHost />
      <TabBar current={screen} onChange={setScreen} />
    </PhoneFrame>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
