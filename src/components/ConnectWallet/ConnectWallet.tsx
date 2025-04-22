import { useWallet } from '../../context/WalletContext';
import './ConnectWallet.css';

export const ConnectWallet = () => {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  const handleConnect = async () => {
    try {
      if (!window.arweaveWallet) {
        alert('Please install ArConnect to continue');
        window.open('https://arconnect.io', '_blank');
        return;
      }

      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'SIGN_TRANSACTION',
        'DISPATCH'
      ]);
      
      connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.arweaveWallet.disconnect();
      disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-container">
      <button 
        className="connect-wallet" 
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 
         isConnected ? formatAddress(address) : 
         'Connect Wallet'}
      </button>
    </div>
  );
};
