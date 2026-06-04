import React, { useState } from "react";
import { sendPayment } from "./Freighter";

const HORIZON_TX_URL = "https://stellar.expert/explorer/testnet/tx";

const SendTransaction = ({ publicKey, onSent }) => {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const submitting = status === "sending";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    setTxHash("");

    try {
      const { hash } = await sendPayment({
        source: publicKey,
        destination: destination.trim(),
        amount,
        memo,
      });

      setStatus("success");
      setTxHash(hash);
      setMessage("Payment sent successfully!");

      // Reset the form fields and let the parent refresh the balance.
      setDestination("");
      setAmount("");
      setMemo("");
      if (onSent) onSent();
    } catch (error) {
      console.error("Transaction failed:", error);
      setStatus("error");
      setMessage(error.message || "The transaction could not be completed.");
    }
  };

  return (
    <div className="card send-card">
      <h2>Send XLM</h2>
      <form onSubmit={handleSubmit} className="send-form">
        <label>
          Destination address
          <input
            type="text"
            placeholder="G..."
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            required
          />
        </label>

        <label>
          Amount (XLM)
          <input
            type="number"
            step="0.0000001"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Memo (optional)
          <input
            type="text"
            placeholder="Thanks!"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={28}
          />
        </label>

        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? "Sending…" : "Send Payment"}
        </button>
      </form>

      {status === "success" && (
        <div className="feedback success">
          <p>✅ {message}</p>
          <p className="tx-hash">
            Tx hash: <code>{txHash}</code>
          </p>
          <a
            href={`${HORIZON_TX_URL}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Stellar Expert ↗
          </a>
        </div>
      )}

      {status === "error" && (
        <div className="feedback error">
          <p>❌ {message}</p>
        </div>
      )}
    </div>
  );
};

export default SendTransaction;
