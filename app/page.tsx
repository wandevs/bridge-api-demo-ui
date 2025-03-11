'use client';
import { ethers } from 'ethers';
import { useState } from 'react';
import { ERC20_ABI } from '../constants/erc20';
import { VersionedTransaction } from '@solana/web3.js';

interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'pending';
  json?: any;
}

interface BridgeFormData {
  fromChain: string;
  toChain: string;
  fromAccount: string;
  fromToken: string;
  toToken: string;
  toAccount: string;
  amount: string;
  partner?: string;
  btcTestnet?: boolean;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedFromChain, setSelectedFromChain] = useState('ETH');
  const [isBtcTestnet, setIsBtcTestnet] = useState(false);

  const addLog = (message: string, type: LogEntry['type'] = 'info', json?: any) => {
    setLogs(prev => [...prev, {
      timestamp: new Date(),
      message,
      type,
      json
    }]);
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    // check metamask
    const data = new FormData(event.target);
    const formData = Object.fromEntries(data.entries()) as unknown as BridgeFormData;
    
    try {
      if (formData.fromChain === 'SOL') {
        // Check if Phantom wallet is installed
        const provider = (window as any).solana;
        if (!provider?.isPhantom) {
          addLog('Phantom wallet not found. Please install Phantom wallet first.', 'error');
          alert('Please install Phantom wallet first.');
          return;
        }
        
        try {
          const resp = await provider.connect();
          addLog(`Connected to Phantom wallet: ${resp.publicKey.toString()}`, 'success');
        } catch (err) {
          addLog('Failed to connect to Phantom wallet', 'error');
          throw err;
        }
      } else {
        // Original MetaMask connection logic
        if (typeof (window as any).ethereum === 'undefined') {
          addLog('MetaMask not found. Please install MetaMask first.', 'error');
          alert('Please install MetaMask first.');
          return;
        }

        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });
        addLog('Connected to wallet', 'success');
      }

      setStep(1);
      setTxHash('');
      setLoading(true);
      setLogs([]); // Clear previous logs

      addLog('Creating cross-chain transaction request...', 'pending');
      const requestBody: any = {
        ...formData,
        partner: formData.partner || undefined
      };

      delete requestBody.btcTestnet;

      let apiBase = 'https://bridge-api.wanchain.org/api/createTx2';
      // Add testnet parameter for BTC if checkbox is checked
      if (isBtcTestnet) {
        apiBase = 'https://bridge-api.wanchain.org/api/testnet/createTx2';
      }

      addLog('API endpoint:', 'info', apiBase);

      addLog('Request body:', 'info', requestBody);

      const response = await fetch(apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        addLog('Received API response:', 'success', result);

        if (formData.fromChain === 'BTC') {
          addLog('Sending BTC transaction...', 'pending');
          try {
            await (window as any).unisat.requestAccounts();
            await (window as any).unisat.switchNetwork(isBtcTestnet ? 'testnet' : 'livenet');

            const txData = result.data.tx;

            const tx = await (window as any).unisat.sendBitcoin(txData.toAccount, txData.value, {
              memo: txData.memo
            });
            addLog('Transaction sent:', 'success', { hash: tx });
            setTxHash(tx);
            setStep(2);
          } catch (error) {
            addLog('Failed to send transaction', 'error');
            console.error(error);
            throw error;
          }
        } else if (formData.fromChain === 'SOL') {
          addLog('Sending Solana transaction...', 'pending');
          try {
            const provider = (window as any).solana;
            // Deserialize the transaction using VersionedTransaction
            console.log('Original tx data:', result.data.tx);
            const buffer = Buffer.from(result.data.tx, 'base64');
            console.log('Decoded buffer:', buffer);
            const tx = VersionedTransaction.deserialize(new Uint8Array(buffer));
            console.log('Deserialized transaction:', tx);
            // Sign and send transaction
            const signature = await provider.signAndSendTransaction(tx);
            addLog('Transaction sent successfully', 'success');
            const signatureStr = typeof signature === 'object' ? signature.signature?.toString() : signature.toString();
            addLog('Transaction signature:', 'info', signatureStr);
            setTxHash(signatureStr);
            setStep(2);
          } catch (error) {
            addLog('Failed to send transaction', 'error');
            console.error(error);
            throw error;
          }
        } else {
          addLog('Switching wallet network...', 'pending');
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: result.data.chainId }],
          });
          addLog('Wallet network switched successfully', 'success');

          let provider = new ethers.BrowserProvider((window as any).ethereum);
          let signer = await provider.getSigner();
          
          if (result.data.approveCheck) {
            addLog('Checking allowance...', 'pending');
            let isApproved = await checkAllowance(result.data.approveCheck.token, result.data.approveCheck.to, signer, result.data.approveCheck.amount);
            
            if (!isApproved) {
              addLog('Approval required. Sending approve transaction...', 'pending');
              let isApproved = await approve(result.data.approveCheck.token, result.data.approveCheck.to, signer, ethers.MaxUint256);
              if (!isApproved) {
                addLog('Approve transaction failed', 'error');
                alert('Approve failed.');
                return;
              }
              addLog('Approve transaction successful', 'success');
            } else {
              addLog('Token already approved', 'success');
            }
          }

          addLog('Sending cross-chain transaction...', 'pending');
          let tx = await signer.sendTransaction({
            to: result.data.tx.to,
            data: result.data.tx.data,
            value: result.data.tx.value || '0x0',
          });
          addLog('Transaction sent:', 'success', { hash: tx.hash });
          setTxHash(tx.hash);
          await tx.wait();
          setStep(2);
          
          addLog('Checking cross-chain status...', 'pending');
          while(true) {
            let apiBase = 'https://bridge-api.wanchain.org/api/status';
            if (isBtcTestnet) {
              apiBase = 'https://bridge-api.wanchain.org/api/testnet/status';
            }
            let response = await fetch(`${apiBase}/${tx.hash}`);
            let status = await response.json();
            addLog('Status check result:', 'info', status);
            
            if (status.success && status.data.status === "Success") {
              addLog('Cross-chain transaction completed successfully! 🎉', 'success');
              alert('Success');
              break;
            } else {
              addLog('Transaction pending, checking again in 10 seconds...', 'pending');
              await new Promise(r => setTimeout(r, 10000));
            }
          }
        }
      } else {
        let message = await response.json();
        addLog('API Error:', 'error', message);
        alert(message.error);
      }
    } catch (error) {
      addLog('Transaction Error:', 'error', error);
      alert("Tx Error: " + error);
    }

    setLoading(false);
  }

  return (
    <div className="main-container">
      <div className="container">
        <h1>Wan Bridge API Demo UI</h1>
        <form id="bridgeForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fromChain">From Chain</label>
            <select 
              id="fromChain" 
              name="fromChain"
              onChange={(e) => setSelectedFromChain(e.target.value)}
              value={selectedFromChain}
            >
              {/* <option value="ADA">ADA</option> */}
              <option value="ARETH">ARETH</option>
              <option value="ASTR">ASTR</option>
              <option value="AVAX">AVAX</option>
              <option value="BASEETH">BASEETH</option>
              <option value="BNB">BNB</option>
              <option value="BROCK">BROCK</option>
              <option value="ETH">ETH</option>
              <option value="FTM">FTM</option>
              <option value="FX">FX</option>
              <option value="GLMR">GLMR</option>
              <option value="GTH">GTH</option>
              <option value="LINEAETH">LINEAETH</option>
              <option value="MATIC">MATIC</option>
              <option value="METIS">METIS</option>
              <option value="MOVR">MOVR</option>
              <option value="NRG">NRG</option>
              <option value="OETH">OETH</option>
              <option value="OKT">OKT</option>
              <option value="SGB">SGB</option>
              <option value="TLOS">TLOS</option>
              <option value="VC">VC</option>
              <option value="WAN">WAN</option>
              <option value="XDC">XDC</option>
              <option value="ZEN">ZEN</option>
              <option value="ZKETH">ZKETH</option>
              <option value="SOL">SOL</option>
              <option value="BTC">BTC</option>
            </select>
          </div>

          
          <div className="flex flex-row items-center">
            <input
              type="checkbox"
              id="btcTestnet"
              name="btcTestnet"
              checked={isBtcTestnet}
              onChange={async (e) => {
                setIsBtcTestnet(e.target.checked);
              }}
              className="mr-2 w-4"
            />
            <label htmlFor="btcTestnet">testnet</label>
          </div>

          <div className="form-group">
            <label htmlFor="toChain">To Chain</label>
            <select id="toChain" name="toChain">
              {/* <option value="ADA">ADA</option> */}
              <option value="ARETH">ARETH</option>
              <option value="ASTR">ASTR</option>
              <option value="AVAX">AVAX</option>
              <option value="BASEETH">BASEETH</option>
              <option value="BNB">BNB</option>
              <option value="BROCK">BROCK</option>
              <option value="ETH">ETH</option>
              <option value="FTM">FTM</option>
              <option value="FX">FX</option>
              <option value="GLMR">GLMR</option>
              <option value="GTH">GTH</option>
              <option value="LINEAETH">LINEAETH</option>
              <option value="MATIC">MATIC</option>
              <option value="METIS">METIS</option>
              <option value="MOVR">MOVR</option>
              <option value="NRG">NRG</option>
              <option value="OETH">OETH</option>
              <option value="OKT">OKT</option>
              <option value="SGB">SGB</option>
              <option value="TLOS">TLOS</option>
              <option value="VC">VC</option>
              <option value="WAN">WAN</option>
              <option value="XDC">XDC</option>
              <option value="ZEN">ZEN</option>
              <option value="ZKETH">ZKETH</option>
              <option value="SOL">SOL</option>
              <option value="BTC">BTC</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fromAccount">From Account</label>
            <input 
              type="text" 
              id="fromAccount" 
              name="fromAccount" 
              placeholder="Input from chain token address here" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="fromToken">From Token</label>
            <input 
              type="text" 
              id="fromToken" 
              name="fromToken" 
              placeholder="Input from chain token address here" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="toToken">To Token</label>
            <input 
              type="text" 
              id="toToken" 
              name="toToken" 
              placeholder="Input to chain token address here" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="toAccount">To Account</label>
            <input 
              type="text" 
              id="toAccount" 
              name="toAccount" 
              placeholder="Input the recipient address here" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input 
              type="text" 
              id="amount" 
              name="amount" 
              placeholder="e.g: 0.01" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="partner">
              Partner <span className="text-xs text-gray-400">(Optional)</span>
            </label>
            <input 
              type="text" 
              id="partner" 
              name="partner" 
              placeholder="Enter partner name" 
            />
          </div>

          {!loading && (
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
              Submit Transaction
            </button>
          )}
          
          {(loading || txHash) && (
            <div className="status-container">
              {loading && (
                <div className="loading">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing... (Step {step}/2)</span>
                </div>
              )}
              {txHash && (
                <div>
                  <div className="text-sm font-medium text-gray-600">Transaction Hash:</div>
                  <div className="tx-hash">{txHash}</div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
      
      <div className="log-container">
        <div className="log-title">Operation Logs</div>
        <div className="log-content">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <div className="timestamp">
                {log.timestamp.toLocaleTimeString()}
              </div>
              <div className="message">{log.message}</div>
              {log.json && (
                <pre className="json">
                  {JSON.stringify(log.json, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-400 text-sm">
              No logs yet. Start a transaction to see the process.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function checkAllowance(tokenAddress: string, spender: string, signer: any, amount: string) {
  let allowance = await getAllowance(tokenAddress, spender, signer);
  if (ethers.toBigInt(allowance) < ethers.toBigInt(amount)) {
    return false;
  }
  return true;
}

async function getAllowance(tokenAddress: string, spender: string, signer: any) {
  let contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  let allowance = await contract['allowance(address,address)'](signer.getAddress(), spender);
  return allowance;
}

async function approve(tokenAddress: string, spender: string, signer: any, amount: any) {
  let contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  let tx = await contract['approve(address,uint256)'](spender, amount);
  await tx.wait();
  return true;
}
