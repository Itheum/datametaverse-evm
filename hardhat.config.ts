import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
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
