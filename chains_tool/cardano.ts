import * as CardanoWasm from "@emurgo/cardano-serialization-lib-asmjs-gc";

declare global {
    interface Lace {
        // Define the properties and methods of the Lace type
        isEnabled: () => Promise<boolean>;
        signTx: (transaction: string) => Promise<string>;
        submitTx: (transaction: string) => Promise<string>;
    }
    interface Window {
        cardano: {
            lace: {
                enable: () => Promise<Lace>;
            };
        };
    }
}

export async function signAndSendTransaction(txHex: string): Promise<string | void> {
    if (window.cardano && window.cardano.lace) {

        const handler = async function (walletApi: Lace) {
            try {
                const tx = CardanoWasm.Transaction.from_hex(txHex);
                const witnessSetHex = await walletApi.signTx(txHex);
                const witnessSet = CardanoWasm.TransactionWitnessSet.from_hex(witnessSetHex);
                const redeemers = tx.witness_set().redeemers();
                if (redeemers) {
                    console.log('[ADA] signAndSendTransaction() add redeemers ...');
                    witnessSet.set_redeemers(redeemers);
                }

                const signedTx = CardanoWasm.Transaction.new(tx.body(), witnessSet, tx.auxiliary_data());
                console.log(`[ADA] signAndSendTransaction() signedTx len:`, signedTx.to_hex().length);

                // 2) send
                let txHash = await walletApi.submitTx(signedTx.to_hex());
                console.debug("sendTransaction() got txHash: %O", txHash);
                return txHash;
            } catch (error) {
                console.error("Failed to sign transaction:", error);
                throw error; // Re-throw error for handling in the caller
            }
        }

        const walletApi = await window.cardano.lace.enable().catch((err) => {
            console.error("Cardano wallet is not enabled");
            throw new Error("Cardano wallet not enabled");
        });

        const txHash = await handler(walletApi);

    } else {
        console.error("Cardano wallet is not found");
        throw new Error("Cardano wallet not found");
    }
}

