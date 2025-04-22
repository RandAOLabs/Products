import reactLogo from '/react.svg'
import viteLogo from '/vite.svg'
import arioLogo from '/ario_black.png'
import arcaoLogo from '/arcao.png'
import './App.css'
import { Counter } from './components/Counter'
import { LogoLink } from './components/LogoLink'

function App() {
  return (
    <>
      <div>
        <LogoLink
          href="https://vitejs.dev"
          src={viteLogo}
          alt="Vite logo"
        />
        <LogoLink
          href="https://react.dev"
          src={reactLogo}
          alt="React logo"
          className="logo react"
        />
        <LogoLink
          href="https://ar.io"
          src={arioLogo}
          alt="AR.IO logo"
        />
        <LogoLink
          href="https://discord.gg/arc-ao"
          src={arcaoLogo}
          alt="ArcAO logo"
        />
      </div>
      <h1>Vite + React + AR.IO + ArcAO</h1>
      <Counter />
      <p className="read-the-docs">
        Click on the Vite, React, AR.IO and ArcAO logos to learn more
      </p>
    </>
  )
}

export default App
