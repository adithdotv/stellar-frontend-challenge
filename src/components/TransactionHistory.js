import React, { useState, useEffect, useCallback } from "react";
import { getRecentPayments } from "./Freighter";

const HORIZON_TX_URL = "https://stellar.expert/explorer/testnet/tx";

const shorten = (key) =>
  key ? `${key.slice(0, 4)}…${key.slice(-4)}` : "—";

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const TransactionHistory = ({ publicKey, refreshKey }) => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!publicKey) return;
    setStatus("loading");
    setError("");
    try {
      const records = await getRecentPayments(publicKey, 10);
      setItems(records);
      setStatus("ready");
    } catch (err) {
      console.error("Failed to load transaction history:", err);
      setError("Could not load transaction history from Horizon.");
      setStatus("error");
    }
  }, [publicKey]);

  // Reload on mount, when the wallet changes, or when the parent bumps refreshKey.
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className="card history-card">
      <div className="history-head">
        <h2>Recent Transactions</h2>
        <button
          className="btn ghost small"
          onClick={load}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Loading…" : "Refresh"}
        </button>
      </div>

      {status === "error" && (
        <div className="feedback error">❌ {error}</div>
      )}

      {status === "ready" && items.length === 0 && (
        <p className="empty">No transactions yet.</p>
      )}

      {items.length > 0 && (
        <ul className="tx-list">
          {items.map((tx) => {
            const incoming = tx.direction === "received";
            const counterparty = incoming ? tx.from : tx.to;
            const sign = incoming ? "+" : tx.direction === "self" ? "" : "−";
            return (
              <li key={tx.id} className="tx-item">
                <div className="tx-main">
                  <span className={`tx-badge ${tx.direction}`}>
                    {incoming ? "Received" : tx.direction === "self" ? "Self" : "Sent"}
                  </span>
                  <span className={`tx-amount ${tx.direction}`}>
                    {sign}
                    {Number(tx.amount).toFixed(2)} {tx.asset}
                  </span>
                </div>
                <div className="tx-meta">
                  <span className="mono">
                    {incoming ? "from" : "to"} {shorten(counterparty)}
                  </span>
                  <span>{formatDate(tx.createdAt)}</span>
                </div>
                <a
                  className="tx-link"
                  href={`${HORIZON_TX_URL}/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TransactionHistory;
