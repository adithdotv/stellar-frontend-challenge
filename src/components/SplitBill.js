import React, { useState } from "react";
import { sendPayment } from "./Freighter";

const HORIZON_TX_URL = "https://stellar.expert/explorer/testnet/tx";

// Equal share of `total` across `divisor` people, capped at 7 decimals (the
// Stellar precision limit) and returned as a string for sendPayment.
const shareOf = (total, divisor) => {
  const n = Number(total);
  if (!Number.isFinite(n) || n <= 0 || divisor <= 0) return "0";
  return (n / divisor).toFixed(7);
};

const SplitBill = ({ publicKey, onSent }) => {
  const [total, setTotal] = useState("");
  const [recipients, setRecipients] = useState([""]);
  const [includeMe, setIncludeMe] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState({}); // index -> {status, hash, error}
  const [error, setError] = useState("");

  // People sharing the bill: recipients (+ me when I'm part of the split).
  const divisor = recipients.length + (includeMe ? 1 : 0);
  const perShare = shareOf(total, divisor);

  const updateRecipient = (i, value) => {
    setRecipients((prev) => prev.map((r, idx) => (idx === i ? value : r)));
  };
  const addRecipient = () => setRecipients((prev) => [...prev, ""]);
  const removeRecipient = (i) =>
    setRecipients((prev) => prev.filter((_, idx) => idx !== i));

  const handleSplit = async (e) => {
    e.preventDefault();
    setError("");

    const targets = recipients.map((r) => r.trim()).filter(Boolean);
    if (targets.length === 0) {
      setError("Add at least one recipient address.");
      return;
    }
    if (Number(perShare) <= 0) {
      setError("Enter a total greater than 0.");
      return;
    }

    setSending(true);
    setResults({});

    // Send sequentially — each payment needs the source account's next
    // sequence number, so they can't run in parallel.
    for (let i = 0; i < recipients.length; i++) {
      const address = recipients[i].trim();
      if (!address) continue;

      setResults((prev) => ({ ...prev, [i]: { status: "pending" } }));
      try {
        const { hash } = await sendPayment({
          source: publicKey,
          destination: address,
          amount: perShare,
          memo: "Split bill",
        });
        setResults((prev) => ({ ...prev, [i]: { status: "success", hash } }));
      } catch (err) {
        console.error("Split payment failed:", err);
        setResults((prev) => ({
          ...prev,
          [i]: { status: "error", error: err.message || "Failed" },
        }));
      }
    }

    setSending(false);
    if (onSent) onSent();
  };

  return (
    <div className="card split-card">
      <h2>Split Bill</h2>
      <p className="split-sub">
        Split a total equally and pay each person their share.
      </p>

      <form onSubmit={handleSplit} className="send-form">
        <label>
          Total amount (XLM)
          <input
            type="number"
            step="0.0000001"
            min="0"
            placeholder="0.00"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            required
          />
        </label>

        <div className="recipients">
          <span className="label">Recipients</span>
          {recipients.map((r, i) => (
            <div className="recipient-row" key={i}>
              <input
                type="text"
                placeholder="G..."
                value={r}
                onChange={(e) => updateRecipient(i, e.target.value)}
              />
              {results[i] && (
                <span className={`dot ${results[i].status}`} title={results[i].status} />
              )}
              {recipients.length > 1 && (
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => removeRecipient(i)}
                  aria-label="Remove recipient"
                  title="Remove"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={addRecipient}>
            + Add recipient
          </button>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeMe}
            onChange={(e) => setIncludeMe(e.target.checked)}
          />
          Include me in the split ({divisor} {divisor === 1 ? "person" : "people"})
        </label>

        <div className="split-summary">
          <span className="label">Each person pays</span>
          <span className="value balance">{perShare} XLM</span>
        </div>

        <button type="submit" className="btn primary" disabled={sending}>
          {sending ? "Sending…" : `Send ${perShare} XLM to each`}
        </button>
      </form>

      {error && <div className="feedback error">❌ {error}</div>}

      {Object.keys(results).length > 0 && (
        <ul className="split-results">
          {recipients.map((r, i) => {
            const res = results[i];
            if (!res || !r.trim()) return null;
            return (
              <li key={i} className="split-result-row">
                <span className="mono">
                  {r.trim().slice(0, 4)}…{r.trim().slice(-4)}
                </span>
                {res.status === "pending" && <span className="muted">Sending…</span>}
                {res.status === "success" && (
                  <a
                    href={`${HORIZON_TX_URL}/${res.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ok"
                  >
                    ✅ Sent ↗
                  </a>
                )}
                {res.status === "error" && (
                  <span className="fail" title={res.error}>
                    ❌ {res.error}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SplitBill;
