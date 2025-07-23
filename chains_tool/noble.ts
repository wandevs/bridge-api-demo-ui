import {SigningStargateClient} from "@cosmjs/stargate";

const Stargate = require("@cosmjs/stargate");
const Long = require("long");


interface FeeCurrency {
    gasPriceStep: {
        average: number;
        high: number;
        low: number;
    };
    coinMinimalDenom: string;
}

interface ChainInfo {
    chainId: string;
    feeCurrencies: FeeCurrency[];
}

interface KeplrWallet {
    getChainInfosWithoutEndpoints(): Promise<ChainInfo[]>;
    getKey(chainId: string): Promise<{ bech32Address: string }>;
}

declare global {
    interface Window {
        keplr: KeplrWallet;
    }
}

const DefaultChainInfo = {
    "testnet":  {
        "chainNameForKeplr": "grand-1",
        rpc:"https://noble-testnet-rpc.polkachu.com"
    },
    "mainnet": {
        "chainNameForKeplr": "noble-1",
        rpc: "https://noble-rpc.polkachu.com",
    },
}

const ChainsInfo = {
    "NOBLE": {
        "testnet": {
            "chainNameForKeplr": "grand-1",
            rpc: "https://noble-testnet-rpc.polkachu.com"
        },
        "mainnet": {
            "chainNameForKeplr": "noble-1",
            rpc: "https://noble-rpc.polkachu.com",
        }
    },

    "KAVA": {
        "testnet":  {
            "chainNameForKeplr": "kava_2221-16000",
            rpc:"https://rpc.testnet.kava.io",
        },
        "mainnet": {
            "chainNameForKeplr": "kava_2222-10",
            rpc: "https://rpc.kava-rpc.com",
        },
    }
} as const;

interface ChainConfig {
    chainNameForKeplr: string;
    rpc: string;
}

function get_chainConfig(chainName: string, bMainNet: boolean): ChainConfig  {
    const chainInfo = ChainsInfo[chainName as keyof typeof ChainsInfo];

    if (!chainInfo) {
        console.warn(`Chain '${chainName}' not found in ChainsInfo.`);
        throw new Error(`Chain '${chainName}' not found in ChainsInfo.`);
    }

    return bMainNet ? chainInfo["mainnet"] : chainInfo["testnet"];
}

export async function signAndSendTransaction(txBase64Str: string, chainName: string, isTestnet: boolean): Promise<string> {
    let bMainNet = !isTestnet;
    const chainConfig = get_chainConfig(chainName, bMainNet);
    const chainNameForKeplr = chainConfig.chainNameForKeplr;
    console.log("chainNameForKeplr: ", chainNameForKeplr);
    const wallet = window.keplr;

    // txBase64Str = "SGVsbG8sIFdvcmxkISBUaGlzIGlzIGEgdGVzdC4="; // for test
    const txJsonStr = Buffer.from(txBase64Str, 'base64').toString('utf8'); // Create a buffer from the base64 string then convert to string
    console.log("decoded TxStr: ", txJsonStr);

    if(wallet) {

        const tx = JSON.parse(txJsonStr);

        let options = {timeoutHeight: 100, gasPrice: 0};
        let memo = tx.memo || "";
        let timeoutHeight = options.timeoutHeight || 0;
        let gasPrice = options.gasPrice;
        if (!gasPrice) {
            let chains = await wallet.getChainInfosWithoutEndpoints();
            let chainInfo = chains.find(v => v.chainId === chainNameForKeplr);
            if(!chainInfo) {
                throw new Error(`Noble wallet: no support for chain: ${chainNameForKeplr}`);
            }
            let feeCurrency = chainInfo.feeCurrencies[0];
            // @ts-ignore
            gasPrice = feeCurrency.gasPriceStep.average + feeCurrency.coinMinimalDenom;
        }

        let key = await wallet.getKey(chainNameForKeplr);
        let client = await getStargateClient(wallet, chainConfig.rpc, chainNameForKeplr);
        // fee
        let gasUsed = await client.simulate(key.bech32Address, tx.messages, memo);
        gasUsed = gasUsed * 1.5; // rectify by experience
        console.debug({gasUsed, gasPrice});
        let fee = (0, Stargate.calculateFee)(Math.round(gasUsed), gasPrice);
        // timeoutHeight
        let maxHeight = new Long(0);
        if (timeoutHeight) {
            let height = await client.getHeight();
            maxHeight = new Long(height + timeoutHeight);
        }
        let txHash = await client.signAndBroadcastSync(key.bech32Address, tx.messages, fee, memo, maxHeight); //也是返回 txHash ！
        return txHash;

    } else {
        console.error("Noble wallet is not found");
        throw new Error("Noble wallet not found");
    }
}

async function getStargateClient(wallet: any, rpc: string, chainNameForKeplr: string): Promise<SigningStargateClient> {
    const offlineSigner = wallet.getOfflineSigner(chainNameForKeplr);
    let client = await Stargate.SigningStargateClient.connectWithSigner(rpc, offlineSigner);
    return client
}