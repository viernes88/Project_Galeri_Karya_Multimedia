import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletContext } from "./wallet-context";
import { CHAINS } from "../config/constants";
import {
  CHAIN_ID,
  checkIsCurator,
  isContractConfigured,
} from "../services/contract";

const hasWallet = typeof window !== "undefined" && Boolean(window.ethereum);

export default function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isCurator, setIsCurator] = useState(false);
  const [error, setError] = useState("");

  // Sambung ulang otomatis (tanpa popup) dan pantau perubahan akun/jaringan
  useEffect(() => {
    if (!hasWallet) return;
    const eth = window.ethereum;
    const onAccounts = (a) => setAccount(a[0]?.toLowerCase() ?? null);
    const onChain = (hex) => setChainId(parseInt(hex, 16));

    eth
      .request({ method: "eth_accounts" })
      .then(onAccounts)
      .catch(() => {});
    eth
      .request({ method: "eth_chainId" })
      .then(onChain)
      .catch(() => {});
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, []);

  // Cek apakah akun ini kurator
  useEffect(() => {
    let cancelled = false;
    if (account && isContractConfigured()) {
      checkIsCurator(account)
        .then((v) => !cancelled && setIsCurator(v))
        .catch(() => !cancelled && setIsCurator(false));
    }
    return () => {
      cancelled = true;
      setIsCurator(false);
    };
  }, [account]);

  const connect = useCallback(async () => {
    if (!hasWallet) {
      setError(
        "MetaMask tidak ditemukan. Pasang ekstensi MetaMask lalu muat ulang halaman.",
      );
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]?.toLowerCase() ?? null);
      setChainId(
        parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16),
      );
      setError("");
    } catch (e) {
      setError(e.code === 4001 ? "Koneksi wallet dibatalkan." : e.message);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const hex = "0x" + CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (e) {
      const notAdded = e.code === 4902 || e?.data?.originalError?.code === 4902;
      if (notAdded && CHAINS[CHAIN_ID]?.add) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: hex, ...CHAINS[CHAIN_ID].add }],
          });
        } catch (e2) {
          setError(e2.message);
        }
      } else if (e.code !== 4001) {
        setError(e.message);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      hasWallet,
      account,
      chainId,
      isCorrectChain: chainId === CHAIN_ID,
      isCurator,
      error,
      connect,
      switchNetwork,
    }),
    [account, chainId, isCurator, error, connect, switchNetwork],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
