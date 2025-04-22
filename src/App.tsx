import './App.css'
import { Sweepstakes } from './components/Sweepstakes'
import { Header } from './components/Header'
import { QuickGuide } from './components/QuickGuide'
import { WalletProvider } from './context/WalletContext'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <div className="app-container">
          <Header />
          <div className="app-content">
            <QuickGuide />
            <Sweepstakes />
          </div>
        </div>
      </WalletProvider>
    </ThemeProvider>
  )
}

export default App
