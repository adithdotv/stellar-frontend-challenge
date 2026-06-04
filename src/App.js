import { useState } from 'react';
import './App.css';
import Header from './components/Header';
import TipJar from './components/TipJar';
import { NETWORK } from './components/Freighter';

function App() {
  const [page, setPage] = useState('wallet');

  return (
    <div className="App wallet-app">
      <header className="app-bar">
        <h1>Stellar DApp</h1>
        <span className="network-badge">{NETWORK}</span>
        <nav className="nav-tabs">
          <button
            className={`tab ${page === 'wallet' ? 'active' : ''}`}
            onClick={() => setPage('wallet')}
          >
            Wallet
          </button>
          <button
            className={`tab ${page === 'tip' ? 'active' : ''}`}
            onClick={() => setPage('tip')}
          >
            Tip Jar
          </button>
        </nav>
      </header>

      {page === 'wallet' ? <Header /> : <TipJar />}
    </div>
  );
}

export default App;
