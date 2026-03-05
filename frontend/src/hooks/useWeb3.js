import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "../constants/addresses";

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  // Prevents accountsChanged events fired mid-connect from interfering
  const connectingRef = useRef(false);

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask!");
      return;
    }

    setIsConnecting(true);
    connectingRef.current = true;
    try {
      // Show account picker so user can choose a different address
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        if (permError.code === 4001) return; // user cancelled
        // unsupported by this wallet — fall through to eth_requestAccounts
      }

      const p = new ethers.BrowserProvider(window.ethereum);
      const network = await p.getNetwork();

      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902 && CHAIN_ID === 11155111) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                  chainId: `0x${CHAIN_ID.toString(16)}`,
                  chainName: "Sepolia",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://sepolia.infura.io/v3/"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                }],
              });
            } catch {
              alert("Please add Sepolia network to MetaMask manually.");
              return;
            }
          } else {
            throw switchError;
          }
        }
      }

      const accounts = await p.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error("No accounts selected");

      const s = await p.getSigner();
      // Only clear the disconnect flag on actual successful connection
      localStorage.removeItem("wallet_disconnected");
      setProvider(p);
      setSigner(s);
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      if (error.code !== 4001) {
        console.error("Error connecting wallet:", error);
        alert("Failed to connect wallet: " + (error.message || error));
      }
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem("wallet_disconnected", "true");
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setIsConnected(false);
  };

  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;

    // Auto-connect on load only if user hasn't explicitly disconnected
    const init = async () => {
      if (localStorage.getItem("wallet_disconnected") === "true") return;
      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        const accounts = await p.listAccounts();
        if (accounts.length > 0) {
          const s = await p.getSigner();
          setProvider(p);
          setSigner(s);
          setAccount(accounts[0].address);
          setIsConnected(true);
        }
      } catch (e) {
        console.error("Auto-connect error:", e);
      }
    };
    init();

    const handleAccountsChanged = (accounts) => {
      // Ignore all mid-connect events
      if (connectingRef.current) return;

      if (accounts.length === 0) {
        setProvider(null);
        setSigner(null);
        setAccount(null);
        setIsConnected(false);
      } else {
        // User switched account in MetaMask — update state
        const update = async () => {
          try {
            const p = new ethers.BrowserProvider(window.ethereum);
            const s = await p.getSigner();
            setProvider(p);
            setSigner(s);
            setAccount(accounts[0]);
            setIsConnected(true);
          } catch (e) {
            console.error("accountsChanged error:", e);
          }
        };
        update();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => window.location.reload());

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return {
    provider,
    signer,
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
};
