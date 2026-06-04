import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// ---------------------------------------------------------------------------
// The address tips are sent to. Replace with your own Testnet public key.
// ---------------------------------------------------------------------------
const TIP_ADDRESS =
  "GBNB26WDWONCBIHNSCZVKJX2M2TSX3KJ6SAVQFAP5P7PI2BIYOGCOXJ2";

const PRESETS = ["5", "10", "25"];
const ACCOUNT_URL = "https://stellar.expert/explorer/testnet/account";

// Build a SEP-0007 pay URI so compatible wallets prefill the payment.
const buildPayUri = (amount) => {
  let uri = `web+stellar:pay?destination=${TIP_ADDRESS}`;
  if (amount && Number(amount) > 0) uri += `&amount=${amount}`;
  uri += "&network=testnet";
  return uri;
};

const TipJar = () => {
  const [amount, setAmount] = useState("10");
  const [copied, setCopied] = useState(false);

  const payUri = buildPayUri(amount);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TIP_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  return (
    <main className="content">
      <div className="card tipjar-card">
        <h2>☕ Tip Jar</h2>
        <p className="tipjar-sub">
          Scan with any Stellar wallet to send a tip on Testnet.
        </p>

        <div className="qr-wrap">
          <QRCodeSVG
            value={payUri}
            size={200}
            level="M"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0d1117"
          />
        </div>

        <div className="amount-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`btn ${amount === p ? "primary" : "ghost"} small`}
              onClick={() => setAmount(p)}
            >
              {p} XLM
            </button>
          ))}
          <input
            type="number"
            min="0"
            step="0.0000001"
            className="amount-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom"
            aria-label="Custom tip amount"
          />
        </div>

        <div className="tip-address">
          <span className="mono" title={TIP_ADDRESS}>
            {TIP_ADDRESS.slice(0, 8)}…{TIP_ADDRESS.slice(-8)}
          </span>
          <button className="btn ghost small" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy address"}
          </button>
        </div>

        <a
          className="tip-link"
          href={`${ACCOUNT_URL}/${TIP_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View account on Stellar Expert ↗
        </a>
      </div>
    </main>
  );
};

export default TipJar;
