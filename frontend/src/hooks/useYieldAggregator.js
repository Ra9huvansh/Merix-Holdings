import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./useWeb3";
import { YIELD_AGGREGATOR_ABI, REDEMPTION_CONTRACT_ABI, ERC20_ABI } from "../constants/abis";
import {
  YIELD_AGGREGATOR_ADDRESS,
  REDEMPTION_CONTRACT_ADDRESS,
  DSC_TOKEN_ADDRESS,
} from "../constants/addresses";

export const useYieldAggregator = () => {
  const { signer, account, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [vaultInfo, setVaultInfo] = useState({
    totalShares: "0",
    totalAssets: "0",
    simulatedTotalAssets: "0",
    userShares: "0",
    userPrincipal: "0",
    realizedProfit: "0",
    currentValue: "0",
  });
  const [strategies, setStrategies] = useState([]);
  const [userStrategyDeposits, setUserStrategyDeposits] = useState([]);

  const getVaultContract = useCallback(() => {
    if (!signer || !YIELD_AGGREGATOR_ADDRESS) return null;
    return new ethers.Contract(YIELD_AGGREGATOR_ADDRESS, YIELD_AGGREGATOR_ABI, signer);
  }, [signer]);

  const getRedemptionContract = useCallback(() => {
    if (!signer || !REDEMPTION_CONTRACT_ADDRESS) return null;
    return new ethers.Contract(REDEMPTION_CONTRACT_ADDRESS, REDEMPTION_CONTRACT_ABI, signer);
  }, [signer]);

  const getDscContract = useCallback(() => {
    if (!signer || !DSC_TOKEN_ADDRESS) return null;
    return new ethers.Contract(DSC_TOKEN_ADDRESS, ERC20_ABI, signer);
  }, [signer]);

  const fetchVaultInfo = useCallback(async () => {
    if (!isConnected || !account || !signer || !YIELD_AGGREGATOR_ADDRESS) return;
    try {
      const vault = getVaultContract();
      if (!vault) return;

      const [totalShares, totalAssets, simulatedTotalAssets, userInfo, stratCount] =
        await Promise.all([
          vault.totalShares(),
          vault.totalAssets(),
          vault.getSimulatedTotalAssets(),
          vault.getUserInfo(account),
          vault.getStrategyCount(),
        ]);

      // Use simulatedTotalAssets (not stale on-chain totalAssets) for live display
      const simulatedCurrentValue =
        totalShares === 0n
          ? 0n
          : (userInfo.shares * simulatedTotalAssets) / totalShares;

      setVaultInfo({
        totalShares: totalShares.toString(),
        totalAssets: totalAssets.toString(),
        simulatedTotalAssets: simulatedTotalAssets.toString(),
        userShares: userInfo.shares.toString(),
        userPrincipal: userInfo.principal.toString(),
        realizedProfit: userInfo.realizedPft.toString(),
        currentValue: simulatedCurrentValue.toString(),
      });

      // Fetch all strategy info and user deposits in parallel
      const count = Number(stratCount);
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          Promise.all([
            vault.getStrategy(i),
            vault.getUserStrategyDeposited(account, i),
          ])
        )
      );

      const strats = [];
      const deposits = [];
      results.forEach(([strat, userDeposit], i) => {
        strats.push({
          id: i,
          name: strat.name,
          riskLevel: strat.riskLevel,
          apyBps: strat.apyBps.toString(),
          totalDeposited: strat.totalDeposited.toString(),
          accruedYield: strat.accruedYield.toString(),
        });
        deposits.push(userDeposit.toString());
      });

      setStrategies(strats);
      setUserStrategyDeposits(deposits);
    } catch (err) {
      console.error("Error fetching vault info:", err);
    }
  }, [isConnected, account, signer, getVaultContract]);

  useEffect(() => {
    fetchVaultInfo();
    const interval = setInterval(fetchVaultInfo, 15000);
    return () => clearInterval(interval);
  }, [fetchVaultInfo]);

  const depositToStrategy = async (strategyId, amount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const dsc = getDscContract();
      const vault = getVaultContract();
      const amountWei = ethers.parseUnits(amount, 18);

      const allowance = await dsc.allowance(account, YIELD_AGGREGATOR_ADDRESS);
      if (allowance < amountWei) {
        const tx = await dsc.approve(YIELD_AGGREGATOR_ADDRESS, ethers.MaxUint256);
        await tx.wait();
      }

      const tx = await vault.depositToStrategy(strategyId, amountWei);
      await tx.wait();
      await fetchVaultInfo();
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromStrategy = async (strategyId, dscAmount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const vault = getVaultContract();
      const amountWei = ethers.parseUnits(dscAmount, 18);
      const tx = await vault.withdrawFromStrategy(strategyId, amountWei);
      await tx.wait();
      await fetchVaultInfo();
    } finally {
      setLoading(false);
    }
  };

  // redeemDscForWeth does NOT call fetchAccountInfo here —
  // that is done in YieldTerminal after this resolves so both hooks refresh together.
  const redeemDscForWeth = async (dscAmount) => {
    if (!signer) throw new Error("Not connected");
    setLoading(true);
    try {
      const dsc = getDscContract();
      const redemption = getRedemptionContract();
      const amountWei = ethers.parseUnits(dscAmount, 18);

      const allowance = await dsc.allowance(account, REDEMPTION_CONTRACT_ADDRESS);
      if (allowance < amountWei) {
        const tx = await dsc.approve(REDEMPTION_CONTRACT_ADDRESS, ethers.MaxUint256);
        await tx.wait();
      }

      const tx = await redemption.redeemDscForWeth(amountWei);
      await tx.wait();
      await fetchVaultInfo();
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    vaultInfo,
    strategies,
    userStrategyDeposits,
    depositToStrategy,
    withdrawFromStrategy,
    redeemDscForWeth,
    fetchVaultInfo,
  };
};
