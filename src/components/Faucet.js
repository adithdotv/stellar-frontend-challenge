import React, { useState } from "react";
import { requestTestnetXlm } from "./Freighter";

const Faucet = ({ publicKey, onFunded }) => {
  const [status, setStatus] = useState("idle"); // idle | funding | success | error
  const [message, setMessage] = useState("");

  const funding = status === "funding";

  const handleFund = async () => {
    setStatus("funding");
    setMessage("");
    try {
      await requestTestnetXlm(publicKey);
      setStatus("success");
      setMessage("Funded! 10,000 test XLM added to your wallet.");
      if (onFunded) onFunded();
    } catch (error) {
      console.error("Faucet request failed:", error);
      setStatus("error");
      setMessage(error.message || "Could not request testnet XLM.");
    }
  };

  return (
    <div className="card faucet-card">
      <div className="faucet-head">
        <div>
          <h2>Testnet Faucet</h2>
          <p className="faucet-sub">Get free XLM to test transactions.</p>
        </div>
        <button
          className="btn primary"
          onClick={handleFund}
          disabled={funding}
        >
          {funding ? "Requesting…" : "Request 10,000 XLM"}
        </button>
      </div>

      {status === "success" && (
        <div className="feedback success">✅ {message}</div>
      )}
      {status === "error" && (
        <div className="feedback error">❌ {message}</div>
      )}
    </div>
  );
};

export default Faucet;
