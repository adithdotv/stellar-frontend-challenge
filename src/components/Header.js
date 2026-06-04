import React, { useState, useCallback } from "react";
import {
  connect,
  disconnect,
  getXlmBalance,
  NETWORK,
} from "./Freighter";
import SendTransaction from "./SendTransaction";

const Header = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  // Re-fetch the balance for the current key (used on connect and after a send).
  const refreshBalance = useCallback(async (key) => {
    const target = key || publicKey;
    if (!target) return;
    setLoadingBalance(true);
    try {
      const xlm = await getXlmBalance(target);
      setBalance(Number(xlm).toFixed(2));
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setError("Could not fetch balance from Horizon.");
    } finally {
      setLoadingBalance(false);
    }
  }, [publicKey]);

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      const key = await connect();
      setPublicKey(key);
      setConnected(true);
      await refreshBalance(key);
    } catch (err) {
      console.error("Error connecting to Freighter:", err);
      setError(err.message || "Failed to connect to Freighter.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setConnected(false);
    setPublicKey("");
    setBalance("");
    setError("");
  };

  return (
    <div className="wallet-app">
      <header className="app-bar">
        <h1>Stellar DApp</h1>
        <span className="network-badge">{NETWORK}</span>
        {connected && (
          <button className="btn ghost" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}
      </header>

      <main className="content">
        {error && <div className="feedback error banner">⚠️ {error}</div>}

        {!connected ? (
          <div className="card connect-card">
            <p>Connect your Freighter wallet to get started.</p>
            <button
              className="btn primary"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect Freighter Wallet"}
            </button>
          </div>
        ) : (
          <>
            <div className="card account-card">
              <div className="row">
                <span className="label">Address</span>
                <span className="value mono" title={publicKey}>
                  {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
                </span>
              </div>
              <div className="row">
                <span className="label">Balance</span>
                <span className="value balance">
                  {loadingBalance ? "Loading…" : `${balance} XLM`}
                </span>
              </div>
              <button
                className="btn ghost small"
                onClick={() => refreshBalance()}
                disabled={loadingBalance}
              >
                Refresh
              </button>
            </div>

            <SendTransaction
              publicKey={publicKey}
              onSent={() => refreshBalance()}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default Header;
