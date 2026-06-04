import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  connect as freighterConnect,
  disconnect as freighterDisconnect,
  getXlmBalance,
  isWalletAllowed,
  getPublicKey,
} from "./Freighter";

const WalletContext = createContext(null);

// Shared wallet state, so every section sees the same connection and it
// survives navigation between sections (the provider never unmounts).
export const WalletProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  // Bumped on connect and after a send so dependent views re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshBalance = useCallback(
    async (key) => {
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
    },
    [publicKey]
  );

  const refreshAll = useCallback(() => {
    refreshBalance();
    setRefreshKey((k) => k + 1);
  }, [refreshBalance]);

  const connect = useCallback(async () => {
    setError("");
    setConnecting(true);
    try {
      const key = await freighterConnect();
      setPublicKey(key);
      setConnected(true);
      await refreshBalance(key);
    } catch (err) {
      console.error("Error connecting to Freighter:", err);
      setError(err.message || "Failed to connect to Freighter.");
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    await freighterDisconnect();
    setConnected(false);
    setPublicKey("");
    setBalance("");
    setError("");
  }, []);

  // Restore the session on mount: if Freighter still has this app authorized,
  // re-read the key silently without prompting the user again.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!(await isWalletAllowed())) return;
        const key = await getPublicKey();
        if (!active || !key) return;
        setPublicKey(key);
        setConnected(true);
        const xlm = await getXlmBalance(key);
        if (active) setBalance(Number(xlm).toFixed(2));
      } catch (err) {
        // No prior session to restore — stay disconnected.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = {
    connected,
    publicKey,
    balance,
    loadingBalance,
    connecting,
    error,
    refreshKey,
    connect,
    disconnect,
    refreshBalance,
    refreshAll,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
};
