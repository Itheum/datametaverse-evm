import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: "test test test test test test test test test test test test",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 5,
        passphrase: "",
      }
    },
  },
};

export default config;
