import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
}

// Create the context with default values
const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: () => {},
  disconnect: () => {}
});

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

// Check if ArConnect is available in the window object
const hasArConnect = (): boolean => {
  return typeof window !== 'undefined' && 'arweaveWallet' in window;
};

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (hasArConnect()) {
        try {
          const addr = await window.arweaveWallet.getActiveAddress();
          if (addr) {
            setAddress(addr);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Listen for wallet events
  useEffect(() => {
    if (hasArConnect()) {
      window.addEventListener('walletSwitch', handleWalletSwitch);
      window.addEventListener('arweaveWalletLoaded', handleWalletLoaded);
    }

    return () => {
      if (hasArConnect()) {
        window.removeEventListener('walletSwitch', handleWalletSwitch);
        window.removeEventListener('arweaveWalletLoaded', handleWalletLoaded);
      }
    };
  }, []);

  const handleWalletSwitch = async (e: any) => {
    try {
      setAddress(e.detail.address);
    } catch (error) {
      console.error('Error in wallet switch:', error);
    }
  };

  const handleWalletLoaded = async () => {
    try {
      if (hasArConnect()) {
        const addr = await window.arweaveWallet.getActiveAddress();
        if (addr) {
          setAddress(addr);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error in wallet loaded:', error);
    }
  };

  const connect = async () => {
    if (!hasArConnect()) {
      console.error('ArConnect not available');
      return;
    }

    setIsConnecting(true);
    try {
      const addr = await window.arweaveWallet.getActiveAddress();
      setAddress(addr);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Add type definitions for the window object to include arweaveWallet
declare global {
  interface Window {
    arweaveWallet: {
      connect: (permissions: string[]) => Promise<void>;
      disconnect: () => Promise<void>;
      getActiveAddress: () => Promise<string>;
      getAllAddresses: () => Promise<string[]>;
      getPermissions: () => Promise<string[]>;
    };
  }
}
