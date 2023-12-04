'use client';
import { ethers } from 'ethers';

export default function Home() {
  const handleSubmit = async (event: any) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const formData = Object.fromEntries(data.entries());
    console.log(formData);

    // check metamask
    if (typeof (window as any).ethereum === 'undefined') {
      alert('Please install MetaMask first.');
      return;
    }

    let response;
    try {
      response = await fetch('https://bridge-api.wanchain.org/api/createTx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('result', result);
        // request account 
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });

        // you should switch wallet network to from chain before send transaction

        let provider = new ethers.BrowserProvider((window as any).ethereum);
        let signer = await provider.getSigner();
        let tx = await signer.sendTransaction({
          from: accounts[0],
          ...result.data.tx,
        });
        console.log('tx', tx);

      } else {
        let message = await response.json();
        alert(message.error);
        console.error('Error 1:', message);
      }
    } catch (error) {
      console.error('Error 2:', error);
    }
  }
  return (
    <div className="container">
    <h1>Wan Bridge API Demo UI</h1>
    <form id="bridgeForm" onSubmit={handleSubmit} >
      <div>
        <label htmlFor="fromChain">From Chain:</label>
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

      <div>
        <label htmlFor="toChain">To Chain:</label>
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

      <div>
        <label htmlFor="fromToken">From Token:</label>
        <input type="text" id="fromToken" name="fromToken" placeholder='Input from chain token address here' />
      </div>

      <div>
        <label htmlFor="toToken">To Token:</label>
        <input type="text" id="toToken" name="toToken" placeholder='Input to chain token address here' />
      </div>

      <div>
        <label htmlFor="toToken">To Account:</label>
        <input type="text" id="toAccount" name="toAccount" placeholder='Input the recepient address here' />
      </div>

      <div>
        <label htmlFor="amount">Amount:</label>
        <input type="text" id="amount" name="amount" placeholder='e.g: 0.01' />
      </div>

      <button type="submit" className='bg-blue-500'>Submit</button>
    </form>
  </div>
  )
}
