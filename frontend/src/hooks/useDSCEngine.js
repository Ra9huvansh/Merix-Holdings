import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./useWeb3";
import { DSC_ENGINE_ABI, ERC20_ABI } from "../constants/abis";
import { DSC_ENGINE_ADDRESS, TOKEN_INFO, WETH_ADDRESS, WBTC_ADDRESS } from "../constants/addresses";
import { formatUnits, formatHealthFactor, formatUSD } from "../utils/formatting";

export const useDSCEngine = () => {
  const { signer, account, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState({
    totalDscMinted: "0",
    collateralValueInUsd: "0",
    healthFactor: "∞",
    collateralBalances: {},
  });
  const [tokenBalances, setTokenBalances] = useState({});
  const [dscBalance, setDscBalance] = useState("0");
  const [collateralTokens, setCollateralTokens] = useState([]);

  const getEngineContract = useCallback(() => {
    if (!signer) return null;
    return new ethers.Contract(DSC_ENGINE_ADDRESS, DSC_ENGINE_ABI, signer);
  }, [signer]);

  const getTokenContract = useCallback((address) => {
    if (!signer) return null;
    return new ethers.Contract(address, ERC20_ABI, signer);
  }, [signer]);

  const fetchAccountInfo = useCallback(async () => {
    if (!isConnected || !account || !signer) return;

    try {
      const engine = getEngineContract();
      if (!engine) return;

      const [info, healthFactor, tokens] = await Promise.all([
        engine.getAccountInformation(account),
        engine.getHealthFactor(account),
        engine.getCollateralTokens(),
      ]);

      // Debug: Log token addresses
      console.log("Contract collateral tokens:", tokens);
      console.log("WETH_ADDRESS from .env:", WETH_ADDRESS);
      console.log("WBTC_ADDRESS from .env:", WBTC_ADDRESS);

      const collateralBalances = {};
      for (const token of tokens) {
        const balance = await engine.getCollateralBalanceOfUser(token, account);
        collateralBalances[token.toLowerCase()] = balance.toString();
      }

      setAccountInfo({
        totalDscMinted: info.totalDscMinted.toString(),
        collateralValueInUsd: info.collateralValueInUsd.toString(),
        healthFactor: formatHealthFactor(healthFactor),
        collateralBalances,
      });

      setCollateralTokens(tokens);

      // Fetch token balances for all collateral tokens from contract
      const balances = {};
      for (const token of tokens) {
        const tokenContract = getTokenContract(token);
        if (tokenContract) {
          try {
            const balance = await tokenContract.balanceOf(account);
            balances[token.toLowerCase()] = balance.toString();
          } catch (error) {
            console.error(`Error fetching balance for ${token}:`, error);
            balances[token.toLowerCase()] = "0";
          }
        }
      }
      
      // Also fetch balances for WETH and WBTC from constants (in case they're not in contract tokens)
      const additionalTokens = [WETH_ADDRESS, WBTC_ADDRESS].filter(Boolean);
      
      for (const token of additionalTokens) {
        const tokenLower = token.toLowerCase();
        // Always fetch balance for WETH/WBTC from constants to ensure we have the latest
        const tokenContract = getTokenContract(token);
        if (tokenContract) {
          try {
            const balance = await tokenContract.balanceOf(account);
            balances[tokenLower] = balance.toString();
            console.log(`Balance for ${token} (${tokenLower}):`, balance.toString());
          } catch (error) {
            console.error(`Error fetching balance for ${token}:`, error);
            // Don't overwrite if we already have a balance from contract tokens
            if (!balances[tokenLower]) {
              balances[tokenLower] = "0";
            }
          }
        } else {
          console.warn(`Could not create token contract for ${token}`);
        }
      }
      
      setTokenBalances(balances);

      // Fetch DSC balance
      const dscContract = getTokenContract(import.meta.env.VITE_DSC_TOKEN_ADDRESS);
      if (dscContract) {
        const balance = await dscContract.balanceOf(account);
        setDscBalance(balance.toString());
      }
    } catch (error) {
      console.error("Error fetching account info:", error);
    }
  }, [isConnected, account, signer, getEngineContract, getTokenContract]);

  useEffect(() => {
    fetchAccountInfo();
    const interval = setInterval(fetchAccountInfo, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchAccountInfo]);

  const approveToken = async (tokenAddress, amount) => {
    if (!signer) throw new Error("Not connected");
    const tokenContract = getTokenContract(tokenAddress);
    const tx = await tokenContract.approve(DSC_ENGINE_ADDRESS, amount);
    await tx.wait();
  };

  const depositCollateral = async (tokenAddress, amount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const decimals = TOKEN_INFO[tokenAddress.toLowerCase()]?.decimals || 18;
      const amountWei = ethers.parseUnits(amount, decimals);

      // Check and approve if needed
      const allowance = await tokenContract.allowance(account, DSC_ENGINE_ADDRESS);
      if (allowance < amountWei) {
        await approveToken(tokenAddress, ethers.MaxUint256);
      }

      const engine = getEngineContract();
      const tx = await engine.depositCollateral(tokenAddress, amountWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const mintDsc = async (amount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const engine = getEngineContract();
      const amountWei = ethers.parseUnits(amount, 18);
      const tx = await engine.mintDsc(amountWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const depositCollateralAndMintDsc = async (tokenAddress, collateralAmount, dscAmount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const tokenContract = getTokenContract(tokenAddress);
      const decimals = TOKEN_INFO[tokenAddress.toLowerCase()]?.decimals || 18;
      const collateralWei = ethers.parseUnits(collateralAmount, decimals);
      const dscWei = ethers.parseUnits(dscAmount, 18);

      // Check and approve if needed
      const allowance = await tokenContract.allowance(account, DSC_ENGINE_ADDRESS);
      if (allowance < collateralWei) {
        await approveToken(tokenAddress, ethers.MaxUint256);
      }

      const engine = getEngineContract();
      const tx = await engine.depositCollateralAndMintDsc(tokenAddress, collateralWei, dscWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const redeemCollateral = async (tokenAddress, amount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const engine = getEngineContract();
      const decimals = TOKEN_INFO[tokenAddress.toLowerCase()]?.decimals || 18;
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await engine.redeemCollateral(tokenAddress, amountWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const burnDsc = async (amount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const dscAddress = import.meta.env.VITE_DSC_TOKEN_ADDRESS;
      const dscContract = getTokenContract(dscAddress);
      const amountWei = ethers.parseUnits(amount, 18);

      // Approve if needed
      const allowance = await dscContract.allowance(account, DSC_ENGINE_ADDRESS);
      if (allowance < amountWei) {
        await approveToken(dscAddress, ethers.MaxUint256);
      }

      const engine = getEngineContract();
      const tx = await engine.burnDsc(amountWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const redeemCollateralForDsc = async (tokenAddress, collateralAmount, dscAmount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const dscAddress = import.meta.env.VITE_DSC_TOKEN_ADDRESS;
      const dscContract = getTokenContract(dscAddress);
      const decimals = TOKEN_INFO[tokenAddress.toLowerCase()]?.decimals || 18;
      const collateralWei = ethers.parseUnits(collateralAmount, decimals);
      const dscWei = ethers.parseUnits(dscAmount, 18);

      // Approve DSC if needed
      const allowance = await dscContract.allowance(account, DSC_ENGINE_ADDRESS);
      if (allowance < dscWei) {
        await approveToken(dscAddress, ethers.MaxUint256);
      }

      const engine = getEngineContract();
      const tx = await engine.redeemCollateralForDsc(tokenAddress, collateralWei, dscWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  const liquidate = async (collateralAddress, userAddress, debtToCover) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const dscAddress = import.meta.env.VITE_DSC_TOKEN_ADDRESS;
      const dscContract = getTokenContract(dscAddress);
      const debtWei = ethers.parseUnits(debtToCover, 18);

      // Approve DSC if needed
      const allowance = await dscContract.allowance(account, DSC_ENGINE_ADDRESS);
      if (allowance < debtWei) {
        await approveToken(dscAddress, ethers.MaxUint256);
      }

      const engine = getEngineContract();
      const tx = await engine.liquidate(collateralAddress, userAddress, debtWei);
      await tx.wait();
      await fetchAccountInfo();
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    accountInfo,
    tokenBalances,
    dscBalance,
    collateralTokens,
    depositCollateral,
    mintDsc,
    depositCollateralAndMintDsc,
    redeemCollateral,
    burnDsc,
    redeemCollateralForDsc,
    liquidate,
    fetchAccountInfo,
  };
};

