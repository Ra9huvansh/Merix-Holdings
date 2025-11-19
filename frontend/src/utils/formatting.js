import { ethers } from "ethers";

export const formatUnits = (value, decimals = 18) => {
  if (!value) return "0";
  try {
    return ethers.formatUnits(value, decimals);
  } catch (error) {
    return "0";
  }
};

export const parseUnits = (value, decimals = 18) => {
  if (!value || value === "") return "0";
  try {
    return ethers.parseUnits(value, decimals).toString();
  } catch (error) {
    return "0";
  }
};

export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatHealthFactor = (healthFactor) => {
  if (!healthFactor) return "∞";
  const hf = Number(formatUnits(healthFactor));
  if (hf > 1000000) return "∞";
  return hf.toFixed(2);
};

export const formatUSD = (value) => {
  if (!value) return "$0.00";
  const usd = Number(formatUnits(value));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
};

