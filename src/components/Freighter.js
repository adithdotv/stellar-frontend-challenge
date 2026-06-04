import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Network configuration — this dApp runs against the Stellar Testnet.
// ---------------------------------------------------------------------------
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const NETWORK = "TESTNET";
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// ---------------------------------------------------------------------------
// Wallet detection & connection
// ---------------------------------------------------------------------------

/**
 * True when the Freighter browser extension is installed/available.
 */
export const isFreighterInstalled = async () => {
  const { isConnected: connected, error } = await isConnected();
  if (error) throw new Error(error);
  return connected;
};

/**
 * Prompt the user to authorize this app, then return their public key.
 * `requestAccess` opens the Freighter popup the first time; afterwards it
 * resolves immediately with the granted address.
 */
export const connect = async () => {
  if (!(await isFreighterInstalled())) {
    throw new Error(
      "Freighter wallet was not detected. Install it from freighter.app and refresh."
    );
  }

  const { address, error } = await requestAccess();
  if (error) throw new Error(error);
  if (!address) throw new Error("Connection was rejected in Freighter.");

  return address;
};

/**
 * Read the currently-authorized public key without prompting.
 * Returns "" when the app has not been granted access yet.
 */
export const getPublicKey = async () => {
  const { address, error } = await getAddress();
  if (error) throw new Error(error);
  return address || "";
};

/**
 * Whether the app already has permission to talk to the wallet.
 */
export const isWalletAllowed = async () => {
  const { isAllowed: allowed, error } = await isAllowed();
  if (error) throw new Error(error);
  return allowed;
};

/**
 * Freighter has no programmatic "disconnect"; the user controls access from
 * the extension. We clear the granted flag where supported and let the UI
 * drop its local state so the app behaves as disconnected.
 */
export const disconnect = async () => {
  try {
    await setAllowed(false);
  } catch (_) {
    // Older Freighter builds ignore the argument — safe to swallow.
  }
};

// ---------------------------------------------------------------------------
// Network guard
// ---------------------------------------------------------------------------

/**
 * Confirm the wallet is pointed at Testnet so transactions don't silently
 * target the wrong network.
 */
export const assertTestnet = async () => {
  const { network, error } = await getNetwork();
  if (error) throw new Error(error);
  if (network !== NETWORK) {
    throw new Error(
      `Freighter is set to "${network}". Switch it to Testnet to use this app.`
    );
  }
};

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

/**
 * Fetch the native XLM balance for a public key. Unfunded accounts (which do
 * not yet exist on-chain) resolve to "0" instead of throwing.
 */
export const getXlmBalance = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (error) {
    if (error?.response?.status === 404) {
      return "0"; // Account not funded yet on Testnet.
    }
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Faucet
// ---------------------------------------------------------------------------

/**
 * Request free Testnet XLM for a public key from Friendbot. Funds an account
 * that does not yet exist; surfaces a friendly message when it's already
 * funded or otherwise rejected.
 *
 * @param {string} publicKey  The account to fund.
 * @returns {Promise<{hash?: string}>}  The funding transaction hash, if any.
 */
export const requestTestnetXlm = async (publicKey) => {
  const res = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail =
      data?.detail ||
      data?.extras?.result_codes?.transaction ||
      "Friendbot could not fund this account.";
    // Most common case: the account already has a balance.
    if (res.status === 400 && /createAccountAlreadyExist|exist/i.test(JSON.stringify(data))) {
      throw new Error("This account is already funded on Testnet.");
    }
    throw new Error(detail);
  }

  return { hash: data?.hash || data?.id };
};

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent payment operations involving a public key, newest
 * first. Each entry is normalized for display with the direction relative to
 * the connected wallet.
 *
 * @param {string} publicKey  The connected wallet.
 * @param {number} [limit]    How many records to fetch (default 10).
 * @returns {Promise<Array<{
 *   id: string, type: string, hash: string, createdAt: string,
 *   direction: "sent" | "received" | "self", amount: string,
 *   asset: string, from: string, to: string
 * }>>}
 */
export const getRecentPayments = async (publicKey, limit = 10) => {
  try {
    const { records } = await server
      .payments()
      .forAccount(publicKey)
      .order("desc")
      .limit(limit)
      .call();

    return records
      // Keep native XLM payments and account-creation funding events.
      .filter(
        (op) =>
          op.type === "payment" || op.type === "create_account"
      )
      .map((op) => {
        const isCreate = op.type === "create_account";
        const amount = isCreate ? op.starting_balance : op.amount;
        const asset =
          isCreate || op.asset_type === "native"
            ? "XLM"
            : op.asset_code || "?";
        const from = isCreate ? op.funder : op.from;
        const to = isCreate ? op.account : op.to;

        let direction = "received";
        if (from === publicKey && to === publicKey) direction = "self";
        else if (from === publicKey) direction = "sent";

        return {
          id: op.id,
          type: op.type,
          hash: op.transaction_hash,
          createdAt: op.created_at,
          direction,
          amount,
          asset,
          from,
          to,
        };
      });
  } catch (error) {
    if (error?.response?.status === 404) {
      return []; // Account not funded yet — no history.
    }
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Build, sign (via Freighter) and submit a native XLM payment on Testnet.
 *
 * @param {object} params
 * @param {string} params.source       Sender public key (the connected wallet).
 * @param {string} params.destination  Recipient public key.
 * @param {string} params.amount       Amount of XLM as a string, e.g. "1.5".
 * @param {string} [params.memo]       Optional text memo.
 * @returns {Promise<{hash: string}>}  The submitted transaction hash.
 */
export const sendPayment = async ({ source, destination, amount, memo }) => {
  // Validate inputs early with clear messaging.
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error("The destination address is not a valid Stellar public key.");
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Enter an amount greater than 0.");
  }

  await assertTestnet();

  // Load the source account to obtain its current sequence number.
  const sourceAccount = await server.loadAccount(source);

  let builder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: StellarSdk.Asset.native(),
      amount: amount.toString(),
    })
  );

  if (memo && memo.trim()) {
    builder = builder.addMemo(StellarSdk.Memo.text(memo.trim()));
  }

  const transaction = builder.setTimeout(180).build();

  // Hand the XDR to Freighter for signing.
  const { signedTxXdr, error } = await signTransaction(transaction.toXDR(), {
    network: NETWORK,
    networkPassphrase: NETWORK_PASSPHRASE,
    address: source,
  });
  if (error) throw new Error(error);

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  // Submit to the network and surface a friendly error on rejection.
  try {
    const result = await server.submitTransaction(signedTx);
    return { hash: result.hash };
  } catch (submitError) {
    const codes =
      submitError?.response?.data?.extras?.result_codes;
    if (codes) {
      throw new Error(
        `Transaction failed: ${codes.transaction || ""} ${
          (codes.operations || []).join(", ")
        }`.trim()
      );
    }
    throw submitError;
  }
};
