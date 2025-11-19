import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "../constants/addresses";

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Check if user explicitly disconnected
  const wasExplicitlyDisconnected = () => {
    return localStorage.getItem("wallet_explicitly_disconnected") === "true";
  };
  
  const setExplicitlyDisconnected = (value) => {
    if (value) {
      localStorage.setItem("wallet_explicitly_disconnected", "true");
    } else {
      localStorage.removeItem("wallet_explicitly_disconnected");
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask!");
      return;
    }

    setIsConnecting(true);
    try {
      // Force MetaMask to show account selection dialog by requesting permissions
      // Using wallet_requestPermissions ensures the user can select which account to connect
      // This works even if permissions already exist - it will show the account selection
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        // If user rejects, that's fine - we'll handle it below
        if (permError.code === 4001) {
          // User rejected the connection
          return;
        }
        // If wallet_requestPermissions doesn't work, fall back to eth_requestAccounts
        // This might happen with some wallet implementations
        console.log("wallet_requestPermissions not supported, using eth_requestAccounts");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Chain doesn't exist in MetaMask, try to add it
            if (CHAIN_ID === 11155111) {
              // Sepolia testnet
              try {
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: `0x${CHAIN_ID.toString(16)}`,
                    chainName: "Sepolia",
                    nativeCurrency: {
                      name: "ETH",
                      symbol: "ETH",
                      decimals: 18
                    },
                    rpcUrls: ["https://sepolia.infura.io/v3/"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"]
                  }]
                });
              } catch (addError) {
                alert("Please add Sepolia network to MetaMask manually:\n\nNetwork Name: Sepolia\nRPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY\nChain ID: 11155111\nCurrency Symbol: ETH\nBlock Explorer: https://sepolia.etherscan.io");
                throw addError;
              }
            } else {
              alert(`Please add chain with ID ${CHAIN_ID} to MetaMask`);
            }
          } else {
            throw switchError;
          }
        }
      }

      // Now get the accounts - this will use the account selected in the permissions dialog
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts selected");
      }

      const signer = await provider.getSigner();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setIsConnected(true);
      // Clear the explicit disconnect flag when user manually connects
      setExplicitlyDisconnected(false);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        // User rejected the connection
        return;
      }
      alert("Failed to connect wallet: " + (error.message || error));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setIsConnected(false);
    // Mark that user explicitly disconnected
    setExplicitlyDisconnected(true);
  };

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const checkConnection = async () => {
        // Don't auto-connect if user explicitly disconnected
        if (wasExplicitlyDisconnected()) {
          return;
        }
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0].address);
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      };

      checkConnection();

      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          // Only auto-reconnect if user didn't explicitly disconnect
          if (!wasExplicitlyDisconnected()) {
            checkConnection();
          }
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
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

