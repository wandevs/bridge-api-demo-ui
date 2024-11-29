'use client';
import { ethers } from 'ethers';
import { useState } from 'react';
import { ERC20_ABI } from '../constants/erc20';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    // check metamask
    if (typeof (window as any).ethereum === 'undefined') {
      alert('Please install MetaMask first.');
      return;
    }

    setStep(1);
    setTxHash('');
    setLoading(true);
    
    const data = new FormData(event.target);
    const formData = Object.fromEntries(data.entries());
    console.log(formData);

    const accounts = await (window as any).ethereum.request({
      method: 'eth_requestAccounts'
    });

    let response;
    try {
      response = await fetch('https://bridge-api.wanchain.org/api/createTx2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromAccount: accounts[0],
          ...formData,
          partner: formData.partner || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('result', result);
        // switch wallet network to result.data.chainId
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: result.data.chainId }],
        });

        // you should switch wallet network to from chain before send transaction

        let provider = new ethers.BrowserProvider((window as any).ethereum);
        let signer = await provider.getSigner();
        if (result.data.approveCheck) {
          console.log('checking approve...');
          let isApproved = await checkAllowance(result.data.approveCheck.token, result.data.approveCheck.to, signer, result.data.approveCheck.amount);
          if (!isApproved) {
            console.log('sending approve...');
            let isApproved = await approve(result.data.approveCheck.token, result.data.approveCheck.to, signer, ethers.MaxUint256);
            if (!isApproved) {
              alert('Approve failed.');
              return;
            }
          }
        }

        console.log('sending cross tx...');
        let tx = await signer.sendTransaction({
          ...result.data.tx,
        });
        console.log('tx', tx.hash);
        setTxHash(tx.hash);
        await tx.wait();
        setStep(2);
        // fetch status from https://bridge-api.wanchain.org/api/status/{txHash}
        // while (true) loop to check status
        while(true) {
          let response = await fetch(`https://bridge-api.wanchain.org/api/status/${tx.hash}`);
          let status = await response.json();
          console.log('status', status);
          if (status.success && status.data.status === "Success") {
            alert('Success');
            break;
          } else {
            console.log('pending...');
            await new Promise(r => setTimeout(r, 10000));
          }
        }
      } else {
        let message = await response.json();
        alert(message.error);
        console.error('Error 1:', message);
      }
    } catch (error) {
      console.error('Error 2:', error);
      alert("Tx Error: " + error);
    }

    setLoading(false);
  }
  return (
    <div className="container">
      <h1>Wan Bridge API Demo UI</h1>
      <form id="bridgeForm" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fromChain">From Chain</label>
          <select id="fromChain" name="fromChain">
            <option value="ETH">ETH</option>
            <option value="XDC">XDC</option>
            <option value="OETH">OETH</option>
            <option value="BNB">BNB</option>
            <option value="ASTR">ASTR</option>
            <option value="MATIC">MATIC</option>
            <option value="TLOS">TLOS</option>
            <option value="OKT">OKT</option>
            <option value="FTM">FTM</option>
            <option value="ADA">ADA</option>
            <option value="AVAX">AVAX</option>
            <option value="NRG">NRG</option>
            <option value="WAN">WAN</option>
            <option value="BROCK">BROCK</option>
            <option value="MOVR">MOVR</option>
            <option value="ARETH">ARETH</option>
            <option value="GLMR">GLMR</option>
            <option value="FX">FX</option>
            <option value="GTH">GTH</option>
            <option value="METIS">METIS</option>
            <option value="SGB">SGB</option>
            <option value="ZKETH">ZKETH</option>
            <option value="ZEN">ZEN</option>
            <option value="VC">VC</option>
            <option value="BASEETH">BASEETH</option>
            <option value="LINEAETH">LINEAETH</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="toChain">To Chain</label>
          <select id="toChain" name="toChain">
            <option value="ETH">ETH</option>
            <option value="XDC">XDC</option>
            <option value="OETH">OETH</option>
            <option value="BNB">BNB</option>
            <option value="ASTR">ASTR</option>
            <option value="MATIC">MATIC</option>
            <option value="TLOS">TLOS</option>
            <option value="OKT">OKT</option>
            <option value="FTM">FTM</option>
            <option value="ADA">ADA</option>
            <option value="AVAX">AVAX</option>
            <option value="NRG">NRG</option>
            <option value="WAN">WAN</option>
            <option value="BROCK">BROCK</option>
            <option value="MOVR">MOVR</option>
            <option value="ARETH">ARETH</option>
            <option value="GLMR">GLMR</option>
            <option value="FX">FX</option>
            <option value="GTH">GTH</option>
            <option value="METIS">METIS</option>
            <option value="SGB">SGB</option>
            <option value="ZKETH">ZKETH</option>
            <option value="ZEN">ZEN</option>
            <option value="VC">VC</option>
            <option value="BASEETH">BASEETH</option>
            <option value="LINEAETH">LINEAETH</option>
          </select>
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
