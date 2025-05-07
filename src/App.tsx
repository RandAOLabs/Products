import './App.css'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { HomePage } from './components/HomePage'
import SweepstakesHome from './components/Sweepstakes/SweepstakesHome'
import { SweepstakesDetail } from './components/Sweepstakes/SweepstakesDetail'
import { SweepstakesAdmin } from './components/Sweepstakes/SweepstakesAdmin'
import { WalletProvider } from './context/WalletContext'
import { ThemeProvider } from './context/ThemeContext'
import { SweepstakesProvider } from './context/SweepstakesContext'

function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <div className="app-container">
          <Header />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/sweepstakes" element={<SweepstakesHome />} />
              <Route path="/sweepstakes/:sweepstakesId" element={<SweepstakesDetail />} />
              <Route path="/admin" element={<SweepstakesProvider><SweepstakesAdmin /></SweepstakesProvider>} />
            </Routes>
          </div>
        </div>
      </WalletProvider>
    </ThemeProvider>
  )
}

export default App
