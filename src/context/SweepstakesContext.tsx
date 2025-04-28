import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RaffleClient as SweepstakesClient, RafflePull as SweepstakesPull, RaffleClientConfig as SweepstakesClientConfig } from 'ao-process-clients';
import { useWallet } from './WalletContext';

// Types for sweepstakes data
export interface SweepstakesData {
  id: string;
  Creator: string;
  Details?: string;
  locked?: boolean;
}

// Types for our context
interface SweepstakesContextType {
  client: SweepstakesClient | null;
  isPaid: boolean;
  isLoading: boolean;
  isListLocked: boolean;
  error: string | null;
  entrants: string[];
  pulls: SweepstakesPull[];
  newEntrantText: string;
  pullDetails: string;
  allSweepstakesIds: string[];
  currentSweepstakesId: string;
  sweepstakesData: SweepstakesData | null;
  sweepstakesDetails: string;
  setEntrants: (entrants: string[]) => void;
  setNewEntrantText: (text: string) => void;
  setPullDetails: (details: string) => void;
  setSweepstakesDetails: (details: string) => void;
  registerSweepstakes: () => Promise<string | null>;
  updateEntrants: (entrantsList?: string[]) => Promise<boolean>;
  pullWinner: () => Promise<boolean>;
  addEntrant: (entrant: string) => Promise<boolean>;
  refreshPulls: () => Promise<void>;
  loadEntrants: () => Promise<void>;
  loadAllSweepstakes: () => Promise<void>;
  getSweepstakesById: (id: string) => Promise<boolean>;
}

// Default context values
const defaultContextValue: SweepstakesContextType = {
  client: null,
  isPaid: false,
  isLoading: false,
  isListLocked: false,
  error: null,
  entrants: [],
  pulls: [],
  newEntrantText: '',
  pullDetails: '',
  allSweepstakesIds: [],
  currentSweepstakesId: '',
  sweepstakesData: null,
  sweepstakesDetails: '',
  setEntrants: () => {},
  setNewEntrantText: () => {},
  setPullDetails: () => {},
  setSweepstakesDetails: () => {},
  registerSweepstakes: async () => null,
  updateEntrants: async () => false,
  pullWinner: async () => false,
  addEntrant: async () => false,
  refreshPulls: async () => {},
  loadEntrants: async () => {},
  loadAllSweepstakes: async () => {},
  getSweepstakesById: async () => false,
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
  const [isListLocked, setIsListLocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [entrants, setEntrants] = useState<string[]>([]);
  const [pulls, setPulls] = useState<SweepstakesPull[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [newEntrantText, setNewEntrantText] = useState<string>('');
  const [pullDetails, setPullDetails] = useState<string>('');
  const [allSweepstakesIds, setAllSweepstakesIds] = useState<string[]>([]);
  const [currentSweepstakesId, setCurrentSweepstakesId] = useState<string>('');
  const [sweepstakesData, setSweepstakesData] = useState<SweepstakesData | null>(null);
  const [sweepstakesDetails, setSweepstakesDetails] = useState<string>('');

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
        
        // Load all available sweepstakes IDs
        await loadAllSweepstakesIdsInternal(sweepstakesClient);
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize sweepstakes client');
        setIsLoading(false);
      }
    };

    initClient();
  }, [config, isConnected, address]);

  // Load all sweepstakes IDs accessible to the user
  const loadAllSweepstakesIdsInternal = async (sweepstakesClient: SweepstakesClient) => {
    try {
      // For now, we'll use a mock implementation to simulate multiple sweepstakes
      // In a real implementation, the backend would provide a method to get all sweepstakes
      // This will be replaced when the backend is updated
      
      // Mock data for development - in production this would come from the API
      // We're simulating what viewUserSweepstakes might return
      const mockIdsResponse = ["sweepstakes1", "sweepstakes2", "sweepstakes3"];
      setAllSweepstakesIds(mockIdsResponse);
    } catch (err) {
      console.error('Failed to load all sweepstakes IDs:', err);
      setAllSweepstakesIds([]);
    }
  };

  const loadAllSweepstakes = async (): Promise<void> => {
    if (!client || !userId) return;
    
    try {
      setIsLoading(true);
      await loadAllSweepstakesIdsInternal(client);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load all sweepstakes:', err);
      setIsLoading(false);
    }
  };

  const getSweepstakesById = async (id: string): Promise<boolean> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Check ownership status for this specific sweepstakes
      const isOwner = await checkOwnershipStatus(client);
      setIsPaid(isOwner);
      
      // Load sweepstakes data details - this is a mock implementation
      // In the future, this would call a specific API method
      const mockSweepstakesDetails = {
        Creator: userId,
        Details: '{"name": "Sample Sweepstakes", "prize": "$100"}',
        locked: false
      };
      
      setSweepstakesData({
        id,
        Creator: mockSweepstakesDetails.Creator,
        Details: mockSweepstakesDetails.Details,
        locked: mockSweepstakesDetails.locked
      });
      
      setIsListLocked(!!mockSweepstakesDetails.locked);
      setCurrentSweepstakesId(id);
      
      // Load the entrants and pulls for this sweepstakes
      await loadSweepstakesEntrants(client);
      await loadSweepstakesPulls(client);
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load sweepstakes with ID: ${id}`);
      setIsLoading(false);
      return false;
    }
  };

  const checkOwnershipStatus = async (sweepstakesClient: SweepstakesClient): Promise<boolean> => {
    try {
      const ownersResponse = await sweepstakesClient.viewRaffleOwners();
      // Convert to booleans
      const isPaidUser = Array.isArray(ownersResponse) 
        ? ownersResponse.includes(userId)
        : false;
      return isPaidUser;
    } catch (err) {
      console.error('Failed to check ownership status:', err);
      return false;
    }
  };

  const loadSweepstakesEntrants = async (sweepstakesClient: SweepstakesClient) => {
    try {
      const response = await sweepstakesClient.viewEntrants(currentSweepstakesId || userId);
      if (response && Array.isArray(response)) {
        setEntrants(response);
      } else {
        setEntrants([]);
      }
    } catch (err) {
      console.error('Failed to load entrants:', err);
      setEntrants([]);
    }
  };

  const loadSweepstakesPulls = async (sweepstakesClient: SweepstakesClient) => {
    try {
      const response = await sweepstakesClient.viewUserPulls(currentSweepstakesId || userId);
      if (response && response.pulls) {
        setPulls(response.pulls);
      } else {
        setPulls([]);
      }
    } catch (err) {
      console.error('Failed to load pulls:', err);
      setPulls([]);
    }
  };

  // Context methods
  const registerSweepstakes = async (): Promise<string | null> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return null;
    }

    if (entrants.length === 0) {
      setError('No entrants to register');
      return null;
    }

    try {
      setIsLoading(true);
      
      // In the real implementation, we would pass details as a parameter
      // For now, we'll just set the entrants and assume the backend generates an ID
      const result = await client.setRaffleEntrants(entrants);
      
      if (result) {
        // Generate a mock sweepstakes ID - in production this would come from the API
        const mockSweepstakesId = `sw-${Math.random().toString(36).substr(2, 9)}`;
        
        // Update the local state with the new sweepstakes
        setCurrentSweepstakesId(mockSweepstakesId);
        setSweepstakesData({
          id: mockSweepstakesId,
          Creator: userId,
          Details: sweepstakesDetails
        });
        setIsPaid(true);
        
        // Reload all sweepstakes
        await loadAllSweepstakesIdsInternal(client);
        
        setIsLoading(false);
        return mockSweepstakesId;
      }
      
      setError('Failed to register sweepstakes');
      setIsLoading(false);
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register sweepstakes');
      setIsLoading(false);
      return null;
    }
  };

  const updateEntrants = async (entrantsList?: string[]): Promise<boolean> => {
    if (!client) {
      setError('Client not initialized or wallet not connected');
      return false;
    }

    if (!currentSweepstakesId) {
      setError('No sweepstakes selected');
      return false;
    }

    // Use provided entrants list if available, otherwise use context state
    const entriesToUpdate = entrantsList || entrants;
    console.log('updateEntrants function called with:', entrantsList ? 'provided list' : 'context state');
    console.log('Entries to update:', entriesToUpdate);

    if (entriesToUpdate.length === 0) {
      setError('No entrants to update');
      return false;
    }

    try {
      setIsLoading(true);
      // Using the existing setRaffleEntrants method - in future we'd pass sweepstakesId too
      const result = await client.setRaffleEntrants(entriesToUpdate);
      
      // Update the context state if we used a provided list
      if (entrantsList) {
        console.log('Updating context state with provided list');
        setEntrants(entrantsList);
      }
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entrants');
      setIsLoading(false);
      return false;
    }
  };

  const addEntrant = async (entrant: string): Promise<boolean> => {
    if (!client || !currentSweepstakesId) {
      setError('Client not initialized or no sweepstakes selected');
      return false;
    }
    
    if (!entrant.trim()) {
      setError('Entrant name cannot be empty');
      return false;
    }
    
    try {
      setIsLoading(true);
      
      // Add to the current list
      const updatedEntrants = [...entrants, entrant.trim()];
      
      // Update the sweepstakes entrants
      const result = await client.setRaffleEntrants(updatedEntrants);
      
      if (result) {
        setEntrants(updatedEntrants);
      }
      
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entrant');
      setIsLoading(false);
      return false;
    }
  };

  const pullWinner = async (): Promise<boolean> => {
    if (!client || !currentSweepstakesId) {
      setError('Client not initialized or no sweepstakes selected');
      return false;
    }

    if (!isPaid) {
      setError('You must register with payment first');
      return false;
    }

    try {
      setIsLoading(true);
      
      // In the real implementation, we would pass id and details
      // For now, we'll just call pullRaffle without parameters
      const result = await client.pullRaffle();
      
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
    if (!client || !currentSweepstakesId) return;

    try {
      setIsLoading(true);
      await loadSweepstakesPulls(client);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh pulls:', err);
      setIsLoading(false);
    }
  };

  const loadEntrants = async (): Promise<void> => {
    if (!client || !currentSweepstakesId) return;

    try {
      setIsLoading(true);
      await loadSweepstakesEntrants(client);
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
    isListLocked,
    error,
    entrants,
    pulls,
    newEntrantText,
    pullDetails,
    allSweepstakesIds,
    currentSweepstakesId,
    sweepstakesData,
    sweepstakesDetails,
    setEntrants,
    setNewEntrantText,
    setPullDetails,
    setSweepstakesDetails,
    registerSweepstakes,
    updateEntrants,
    pullWinner,
    addEntrant,
    refreshPulls,
    loadEntrants,
    loadAllSweepstakes,
    getSweepstakesById,
  };

  return (
    <SweepstakesContext.Provider value={value}>
      {children}
    </SweepstakesContext.Provider>
  );
};
