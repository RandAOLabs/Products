import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SweepstakesClient, SweepstakesClientConfig, SweepstakesPull } from 'ao-process-clients';
import { useWallet } from './WalletContext';

// Types for our context
interface SweepstakesContextType {
  client: SweepstakesClient | null;
  isPaid: boolean;
  isLoading: boolean;
  error: string | null;
  entrants: string[];
  pulls: SweepstakesPull[];
  setEntrants: (entrants: string[]) => void;
  registerSweepstakes: () => Promise<boolean>;
  updateEntrants: () => Promise<boolean>;
  pullWinner: () => Promise<boolean>;
  refreshPulls: () => Promise<void>;
  loadEntrants: () => Promise<void>;
}

// Default context values
const defaultContextValue: SweepstakesContextType = {
  client: null,
  isPaid: false,
  isLoading: false,
  error: null,
  entrants: [],
  pulls: [],
  setEntrants: () => {},
  registerSweepstakes: async () => false,
  updateEntrants: async () => false,
  pullWinner: async () => false,
  refreshPulls: async () => {},
  loadEntrants: async () => {},
};

// Create the context
export const SweepstakesContext = createContext<SweepstakesContextType>(defaultContextValue);

// Hook to use the context
export const useSweepstakes = () => useContext(SweepstakesContext);

// Context provider component
interface SweepstakesProviderProps {
  children: ReactNode;
  config?: SweepstakesClientConfig;
}

export const SweepstakesProvider = ({ children, config }: SweepstakesProviderProps) => {
  const { address, isConnected } = useWallet();
  const [client, setClient] = useState<SweepstakesClient | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [entrants, setEntrants] = useState<string[]>([]);
  const [pulls, setPulls] = useState<SweepstakesPull[]>([]);
  const [userId, setUserId] = useState<string>('');

  // Initialize or reinitialize client when wallet connection changes
  useEffect(() => {
    const initClient = async () => {
      // Clear state if wallet disconnected
      if (!isConnected || !address) {
        setClient(null);
        setIsPaid(false);
        setUserId('');
        setPulls([]);
        setEntrants([]);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // If config is provided, use it; otherwise, use auto-configuration
        const sweepstakesClient = config 
          ? new SweepstakesClient(config)
          : await SweepstakesClient.autoConfiguration();
        
        setClient(sweepstakesClient);
        
        // Get user ID from the wallet address or client
        const walletAddress = address || await sweepstakesClient.getCallingWalletAddress();
        setUserId(walletAddress);
        
        // Check ownership status
        await checkOwnershipStatus(sweepstakesClient, walletAddress);
        await loadUserEntrants(sweepstakesClient, walletAddress);
        await loadUserPulls(sweepstakesClient, walletAddress);
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize sweepstakes client');
        setIsLoading(false);
      }
    };

    initClient();
  }, [config, isConnected, address]);

  const checkOwnershipStatus = async (sweepstakesClient: SweepstakesClient, id: string) => {
    try {
      const ownersResponse = await sweepstakesClient.viewSweepstakesOwners();
      // Adjust this to match the actual response structure
      const isPaidUser = Array.isArray(ownersResponse) 
        ? ownersResponse.includes(id)
        : false;
      setIsPaid(isPaidUser);
    } catch (err) {
      console.error('Failed to check ownership status:', err);
      // Don't set error here to prevent blocking other operations
    }
  };

  const loadUserEntrants = async (sweepstakesClient: SweepstakesClient, id: string) => {
    try {
      const response = await sweepstakesClient.viewSweepstakesEntrants(id);
      // Adjust this to match the actual response structure
      if (response && Array.isArray(response)) {
        setEntrants(response);
      }
    } catch (err) {
      console.error('Failed to load entrants:', err);
      // Don't set error here as the user might not have entrants yet
    }
  };

  const loadUserPulls = async (sweepstakesClient: SweepstakesClient, id: string) => {
    try {
      const response = await sweepstakesClient.viewUserSweepstakesPulls(id);
      if (response && response.pulls) {
        setPulls(response.pulls);
      } else {
        // If no pulls found or unexpected response format, set empty array
        setPulls([]);
      }
    } catch (err) {
      console.error('Failed to load pulls:', err);
      // Don't set error here as the user might not have pulls yet
      setPulls([]);
    }
  };

  // Context methods
  const registerSweepstakes = async (): Promise<boolean> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return false;
    }

    if (entrants.length === 0) {
      setError('No entrants to register');
      return false;
    }

    try {
      setIsLoading(true);
      const result = await client.registerSweepstakes(entrants);
      if (result) {
        setIsPaid(true);
        await refreshPulls();
      }
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register sweepstakes');
      setIsLoading(false);
      return false;
    }
  };

  const updateEntrants = async (): Promise<boolean> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return false;
    }

    if (entrants.length === 0) {
      setError('No entrants to update');
      return false;
    }

    try {
      setIsLoading(true);
      const result = await client.setSweepstakesEntrants(entrants);
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entrants');
      setIsLoading(false);
      return false;
    }
  };

  const pullWinner = async (): Promise<boolean> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return false;
    }

    if (!isPaid) {
      setError('You must register with payment first');
      return false;
    }

    try {
      setIsLoading(true);
      const result = await client.pullSweepstakes();
      if (result) {
        await refreshPulls();
      }
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull winner');
      setIsLoading(false);
      return false;
    }
  };

  const refreshPulls = async (): Promise<void> => {
    if (!client || !userId) return;

    try {
      setIsLoading(true);
      const response = await client.viewUserSweepstakesPulls(userId);
      if (response && response.pulls) {
        setPulls(response.pulls);
      } else {
        // If no pulls found or unexpected response format, set empty array
        setPulls([]);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh pulls:', err);
      setPulls([]);
      setIsLoading(false);
    }
  };

  const loadEntrants = async (): Promise<void> => {
    if (!client || !userId) return;

    try {
      setIsLoading(true);
      const response = await client.viewSweepstakesEntrants(userId);
      // Adjust this to match the actual response structure
      if (response && Array.isArray(response)) {
        setEntrants(response);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load entrants:', err);
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    client,
    isPaid,
    isLoading,
    error,
    entrants,
    pulls,
    setEntrants,
    registerSweepstakes,
    updateEntrants,
    pullWinner,
    refreshPulls,
    loadEntrants,
  };

  return (
    <SweepstakesContext.Provider value={value}>
      {children}
    </SweepstakesContext.Provider>
  );
};
