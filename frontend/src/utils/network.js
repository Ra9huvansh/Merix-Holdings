export const getNetworkName = (chainId) => {
  const networks = {
    1: "Ethereum Mainnet",
    11155111: "Sepolia",
    31337: "Anvil Local",
    1337: "Localhost",
  };
  return networks[chainId] || `Chain ${chainId}`;
};

export const getNetworkColor = (chainId) => {
  const colors = {
    1: "#627EEA", // Ethereum blue
    11155111: "#8B5CF6", // Sepolia purple
    31337: "#10B981", // Anvil green
    1337: "#10B981", // Localhost green
  };
  return colors[chainId] || "#718096";
};

