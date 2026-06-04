import React, { useState } from "react";
import { useWallet } from "./WalletContext";
import { NETWORK } from "./Freighter";
import Account from "./Account";
import Faucet from "./Faucet";
import SendTransaction from "./SendTransaction";
import SplitBill from "./SplitBill";
import TransactionHistory from "./TransactionHistory";
import TipJar from "./TipJar";

// Section registry. `gated` sections require a connected wallet.
const SECTIONS = [
  { id: "account", label: "Account", gated: true },
  { id: "faucet", label: "Faucet", gated: true },
  { id: "send", label: "Send", gated: true },
  { id: "split", label: "Split Bill", gated: true },
  { id: "history", label: "History", gated: true },
  { id: "tip", label: "Tip Jar", gated: false },
];

const Shell = () => {
  const {
    connected,
    publicKey,
    connecting,
    error,
    refreshKey,
    refreshAll,
    connect,
    disconnect,
  } = useWallet();
  const [active, setActive] = useState("account");

  const current = SECTIONS.find((s) => s.id === active) || SECTIONS[0];

  const renderSection = () => {
    // Static section — always available.
    if (current.id === "tip") return <TipJar />;

    // Gated sections need a connected wallet.
    if (current.gated && !connected) {
      return (
        <div className="card connect-card">
          <p>Connect your Freighter wallet to use {current.label}.</p>
          <button className="btn primary" onClick={connect} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Freighter Wallet"}
          </button>
        </div>
      );
    }

    switch (current.id) {
      case "account":
        return <Account />;
      case "faucet":
        return <Faucet publicKey={publicKey} onFunded={refreshAll} />;
      case "send":
        return <SendTransaction publicKey={publicKey} onSent={refreshAll} />;
      case "split":
        return <SplitBill publicKey={publicKey} onSent={refreshAll} />;
      case "history":
        return (
          <TransactionHistory publicKey={publicKey} refreshKey={refreshKey} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="App wallet-app">
      <header className="app-bar">
        <h1>Stellar DApp</h1>
        <span className="network-badge">{NETWORK}</span>
        <div className="bar-account">
          {connected ? (
            <>
              <span className="bar-key mono" title={publicKey}>
                {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
              </span>
              <button className="btn ghost small" onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="btn primary small"
              onClick={connect}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </header>

      <nav className="section-nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`tab ${active === s.id ? "active" : ""}`}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {error && <div className="feedback error banner">⚠️ {error}</div>}
        {renderSection()}
      </main>
    </div>
  );
};

export default Shell;
