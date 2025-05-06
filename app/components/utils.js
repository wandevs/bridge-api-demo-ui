import { decodeFunctionData, parseAbi } from 'viem';

export async function sendTronTx({
    toAddr,
    functionSelector,
    callValue,
    data, // raw tx.data
    params, // arrays, function params
}) {
    console.log('sendTronTx', toAddr, functionSelector, callValue, data, params);
    if (!window.tronWeb?.ready) {
        console.log('[TRON_TX] Requesting TronLink authorization...');
        const res = await window.tronLink.request({ method: 'tron_requestAccounts' });
        console.log('[TRON_TX] TronLink authorization result:', res);
        if (res.code !== 200) {
            throw new Error(`TronLink authorization failed: ${res.message}`);
        }
    }

    const isMobile = window.innerWidth <= 768;


    const abi = parseAbi(['function ' + functionSelector]);

    let decoded;

    if (data) {
        decoded = decodeFunctionData({
            abi,
            data: data
        });
    } else if (params) {
        decoded = { args: params };
    }

    console.log('function args', abi, decoded.args);
    abi[0].stateMutability = "payable";

    const sendParams = {
        feeLimit: 300_000_000,
        callValue: Number(callValue),
        shouldPollResponse: !isMobile,
        keepTxID: true,
    };
    console.log('sendParams', sendParams);


    const contract = await window.tronWeb.contract(abi, toAddr);
    const result = await contract[functionSelector.split('(')[0]](...decoded.args).send(
        sendParams
    );
    console.log('send tx', result);
    return result;
}

