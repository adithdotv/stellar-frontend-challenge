import React, { useState } from "react";
import { useWallet } from "./WalletContext";

const Account = () => {
  const {
    publicKey,
    balance,
    loadingBalance,
    refreshBalance,
    disconnect,
  } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <div className="card account-card">
      <div className="row">
        <span className="label">Address</span>
        <span className="address-value">
          <span className="value mono" title={publicKey}>
            {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
          </span>
          <button
            className="copy-btn"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy address"}
            aria-label="Copy address"
          >
            {copied ? "✓" : "⧉"}
          </button>
        </span>
      </div>
      <div className="row">
        <span className="label">Balance</span>
        <span className="value balance">
          {loadingBalance ? "Loading…" : `${balance} XLM`}
        </span>
      </div>
      <div className="account-actions">
        <button
          className="btn ghost small"
          onClick={() => refreshBalance()}
          disabled={loadingBalance}
        >
          Refresh
        </button>
        <button className="btn ghost small" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    </div>
  );
};

export default Account;
