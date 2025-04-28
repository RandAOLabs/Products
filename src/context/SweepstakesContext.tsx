import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SweepstakesClient, SweepstakesClientConfig } from 'ao-process-clients';
import { useWallet } from './WalletContext';

// Define our own SweepstakesPull interface to match the actual API data structure
interface SweepstakesPull {
  Id?: string | number;
  Winner?: string;
  Details?: string;
  [key: string]: any; // Allow for other properties
}

// Types for sweepstakes data
export interface SweepstakesData {
  id: string;
  Creator: string;
  Details?: string;
  Locked?: boolean;
  EntryCount?: number;
  PullCount?: number;
  Entries?: string[];
  Pulls?: SweepstakesPull[];
}

// Add type for the API response format
interface SweepstakesResponse {
  Creator?: string;
  Details?: string;
  Locked?: boolean;
  EntryCount?: number;
  PullCount?: number;
  Entries?: string[];
  Pulls?: SweepstakesPull[];
  [key: string]: any; // Allow for other properties
}

// Types for our context
interface SweepstakesContextType {
  client: SweepstakesClient | null;
  isClientReady: boolean;
  isPaid: boolean;
  isLoading: boolean;
  isListLocked: boolean;
  error: string | null;
  entrants: string[];
  pulls: SweepstakesPull[];
  newEntrantText: string;
  pullDetails: string;
  allSweepstakesIds: string[];
  userSweepstakesIds: string[];
  currentSweepstakesId: string;
  sweepstakesData: SweepstakesData | null;
  sweepstakesDetails: string;
  userId: string;
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
  isClientReady: false,
  isPaid: false,
  isLoading: false,
  isListLocked: false,
  error: null,
  entrants: [],
  pulls: [],
  newEntrantText: '',
  pullDetails: '',
  allSweepstakesIds: [],
  userSweepstakesIds: [],
  currentSweepstakesId: '',
  sweepstakesData: null,
  sweepstakesDetails: '',
  userId: '',
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
  const [isClientReady, setIsClientReady] = useState<boolean>(false);
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
  const [userSweepstakesIds, setUserSweepstakesIds] = useState<string[]>([]);
  const [currentSweepstakesId, setCurrentSweepstakesId] = useState<string>('');
  const [sweepstakesData, setSweepstakesData] = useState<SweepstakesData | null>(null);
  const [sweepstakesDetails, setSweepstakesDetails] = useState<string>('');

  // Create a robust ownership checker function
  const isOwnerOfSweepstakes = (sweepstakesCreator: string, currentWalletAddress: string): boolean => {
    // Early return if either value is empty
    if (!sweepstakesCreator || !currentWalletAddress) {
      return false;
    }
    
    // Normalize both addresses for consistent comparison
    const normalizedCreator = sweepstakesCreator.toLowerCase().trim();
    const normalizedWallet = currentWalletAddress.toLowerCase().trim();
    
    // Check for exact match
    if (normalizedCreator === normalizedWallet) {
      return true;
    }
    
    // Check if one contains the other (for partial matching)
    if (normalizedCreator.includes(normalizedWallet) || normalizedWallet.includes(normalizedCreator)) {
      return true;
    }
    
    // No match found
    return false;
  };

  // Initialize the client when wallet is connected
  useEffect(() => {
    const initClient = async () => {
      // Log the wallet address from the wallet context
      console.log('Wallet status check:', {
        isConnected,
        address,
        currentUserId: userId
      });
      
      // Clear state if wallet disconnected
      if (!isConnected || !address) {
        setClient(null);
        setIsClientReady(false);
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
        
        // Important: Set the userId first so it's available for the sweepstakes loading
        console.log('Setting user ID from wallet address:', address);
        setUserId(address);
        
        // If config is provided, use it; otherwise, use auto-configuration
        // Note: We're restoring the original approach that was working
        console.log('Initializing SweepstakesClient with original method');
        
        // If config is provided, use it; otherwise, use auto-configuration
        const sweepstakesClient = config 
          ? new SweepstakesClient(config)
          : await SweepstakesClient.autoConfiguration();
        
        // Set client
        setClient(sweepstakesClient);
        console.log('SweepstakesClient initialized successfully');
        
        // Mark client as ready immediately since this approach was working before
        setIsClientReady(true);

        // Add a small delay to ensure userId is set before loading sweepstakes
        setTimeout(async () => {
          // Re-check the userId to make sure it's set
          console.log('User ID before loading sweepstakes:', userId);
          
          // Load all available sweepstakes IDs
          await loadAllSweepstakesIdsInternal(sweepstakesClient);
        }, 100);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize SweepstakesClient:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize sweepstakes client');
        setIsLoading(false);
      }
    };

    initClient();
  }, [config, isConnected, address]);

  // Add an effect to keep userId in sync with wallet address
  useEffect(() => {
    if (address && address !== userId) {
      console.log('Updating userId from wallet address change:', { 
        oldUserId: userId, 
        newUserId: address 
      });
      setUserId(address);
    }
  }, [address, userId]);

  // Load all sweepstakes IDs accessible to the user
  const loadAllSweepstakesIdsInternal = async (sweepstakesClient: SweepstakesClient) => {
    try {
      // Make sure we have the current wallet address directly from context
      const currentWalletAddress = address || userId;
      console.log("💼 Current wallet address for sweepstakes lookup:", currentWalletAddress);
      
      // Get all sweepstakes
      const allSweepstakesResponse = await sweepstakesClient.viewAllSweepstakes();
      console.log("📋 All sweepstakes response:", allSweepstakesResponse);
      
      if (!allSweepstakesResponse) {
        console.log("❌ No sweepstakes found");
        setAllSweepstakesIds([]);
        setUserSweepstakesIds([]);
        return;
      }
      
      // Convert the object to an array of sweepstakes with their IDs
      const sweepstakesArray = Object.entries(allSweepstakesResponse).map(([id, data]) => ({
        id,
        creator: data.Creator || '',
        details: data.Details || '{}'
      }));
      
      console.log("🔄 Processed sweepstakes array:", sweepstakesArray);
      
      // Set all sweepstakes IDs
      const allIds = sweepstakesArray.map(item => item.id);
      console.log("📊 All sweepstakes IDs:", allIds);
      setAllSweepstakesIds(allIds);
      
      // Use the ownership checker function
      console.log("👤 Checking ownership with wallet address:", currentWalletAddress);
      
      // Filter to get only the user's sweepstakes
      const userOwnedSweepstakes = sweepstakesArray
        .filter(item => {
          // Use our robust ownership checker
          const isOwned = isOwnerOfSweepstakes(item.creator, currentWalletAddress);
          
          // Detailed logging
          console.log(`🏆 Sweepstakes ${item.id} ownership check:`, {
            creator: item.creator,
            walletAddress: currentWalletAddress,
            isOwned
          });
          
          return isOwned;
        });
      
      const userIds = userOwnedSweepstakes.map(item => item.id);
      console.log("🔑 User's sweepstakes IDs:", userIds);
      setUserSweepstakesIds(userIds);
    } catch (err) {
      console.error('❌ Failed to load all sweepstakes IDs:', err);
      setError('Failed to load sweepstakes');
    }
  };

  const loadAllSweepstakes = async (): Promise<void> => {
    if (!client || !userId) return;
    
    try {
      setIsLoading(true);
      console.log("Starting to load all sweepstakes...");
      await loadAllSweepstakesIdsInternal(client);
      console.log("Completed loading all sweepstakes:");
      console.log("- All Sweepstakes IDs:", allSweepstakesIds);
      console.log("- User Sweepstakes IDs:", userSweepstakesIds);
      console.log("- User ID:", userId);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load all sweepstakes:', err);
      setIsLoading(false);
    }
  };

  const getSweepstakesById = async (id: string): Promise<boolean> => {
    if (!client) {
      console.error('Failed to get sweepstakes: Client not initialized');
      setError('Client not initialized or wallet not connected');
      return false;
    }

    // Debug log for the sweepstakes ID
    console.log(`getSweepstakesById called with ID: "${id}" (${typeof id}, length: ${id.length})`);
    
    // Clean up the ID - remove any whitespace, quotes, etc
    const cleanId = id.trim();
    console.log(`Clean ID: "${cleanId}"`);

    try {
      setIsLoading(true);
      setError(null);
      
      // First approach: Try all sweepstakes and look for matching ID
      console.log("👉 ATTEMPT 1: Getting all sweepstakes to find ID");
      const allSweepsResponse = await client.viewAllSweepstakes();
      const sweepsKeys = Object.keys(allSweepsResponse || {});
      console.log("All sweepstakes keys:", sweepsKeys);
      
      let foundSweepstakes = null;
      
      // Check if the exact ID exists
      if (allSweepsResponse && allSweepsResponse[cleanId]) {
        console.log(`✅ Found exact match for ID "${cleanId}" in all sweepstakes`);
        foundSweepstakes = allSweepsResponse[cleanId];
        foundSweepstakes.id = cleanId; // Ensure ID is set
      } 
      // Check for case-insensitive match
      else if (allSweepsResponse) {
        console.log("🔍 Looking for case-insensitive match");
        const lowerCaseId = cleanId.toLowerCase();
        
        for (const key of sweepsKeys) {
          if (key.toLowerCase() === lowerCaseId) {
            console.log(`✅ Found case-insensitive match: "${key}"`);
            foundSweepstakes = allSweepsResponse[key];
            foundSweepstakes.id = key; // Use the actual key from response
            break;
          }
        }
      }
      
      // Second approach: Try direct viewSweepstakes call
      if (!foundSweepstakes) {
        console.log(`👉 ATTEMPT 2: Direct viewSweepstakes call for ID: "${cleanId}"`);
        try {
          const directResponse = await client.viewSweepstakes(cleanId);
          
          if (directResponse) {
            console.log("✅ Direct viewSweepstakes call succeeded");
            foundSweepstakes = directResponse;
            foundSweepstakes.id = cleanId;
          } else {
            console.log("❌ Direct viewSweepstakes call returned null/undefined");
          }
        } catch (directErr) {
          console.error("❌ Error in direct viewSweepstakes call:", directErr);
        }
      }
      
      // Final check - if still not found, report error
      if (!foundSweepstakes) {
        console.error(`❌ Sweepstakes with ID "${cleanId}" not found after all attempts`);
        setError(`Sweepstakes with ID ${cleanId} not found`);
        setIsLoading(false);
        return false;
      }
      
      // Process the found sweepstakes
      console.log("✅ Found sweepstakes:", foundSweepstakes);
      
      // Check ownership status for this specific sweepstakes
      const isOwner = isOwnerOfSweepstakes(foundSweepstakes.Creator, userId);
      console.log("Ownership check:", {
        sweepstakesCreator: foundSweepstakes.Creator,
        userId,
        isOwner
      });
      setIsPaid(isOwner);
      
      // Create our normalized sweepstakes data object
      const sweepstakesDataObj: SweepstakesData = {
        id: foundSweepstakes.id || cleanId,
        Creator: foundSweepstakes.Creator || '',
        Details: foundSweepstakes.Details || '{}',
        Locked: foundSweepstakes.Locked || false,
        EntryCount: foundSweepstakes.EntryCount || 0,
        PullCount: foundSweepstakes.PullCount || 0,
        Entries: foundSweepstakes.Entries || [],
        Pulls: foundSweepstakes.Pulls || []
      };
      
      // Log the sweepstakes data for debugging
      console.log("Sweepstakes data loaded:", sweepstakesDataObj);
      
      setSweepstakesData(sweepstakesDataObj);
      
      // Set the lock status, making sure to handle undefined values safely
      const isLocked = typeof foundSweepstakes.Locked === 'boolean' 
        ? foundSweepstakes.Locked 
        : false;
      setIsListLocked(isLocked);
      
      setCurrentSweepstakesId(cleanId);
      
      // Load the entrants and pulls for this sweepstakes
      if (foundSweepstakes.Entries && Array.isArray(foundSweepstakes.Entries)) {
        setEntrants(foundSweepstakes.Entries);
      } else {
        // Fallback to empty array
        setEntrants([]);
      }
      
      // Load pulls individually if we have a PullCount
      if (typeof foundSweepstakes.PullCount === 'number' && foundSweepstakes.PullCount > 0) {
        const pullsArray: SweepstakesPull[] = [];
        
        for (let i = 0; i < foundSweepstakes.PullCount; i++) {
          try {
            console.log(`Fetching pull ${i} for sweepstakes ${cleanId}`);
            const pullResponse = await client.viewSweepstakesPull(cleanId, i.toString());
            
            if (pullResponse) {
              console.log(`Pull ${i} data:`, pullResponse);
              pullsArray.push({
                Id: i.toString(),
                Winner: pullResponse.Winner || 'Unknown',
                Details: pullResponse.Details || ''
              });
            }
          } catch (pullErr) {
            console.error(`Error fetching pull ${i}:`, pullErr);
          }
        }
        
        console.log('All pulls loaded:', pullsArray);
        setPulls(pullsArray);
      } else if (foundSweepstakes.Pulls && Array.isArray(foundSweepstakes.Pulls)) {
        // Use Pulls from response if available
        setPulls(foundSweepstakes.Pulls);
      } else {
        // Fallback to empty array
        setPulls([]);
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error(`Failed to load sweepstakes with ID: ${cleanId}`, err);
      setError(err instanceof Error ? err.message : `Failed to load sweepstakes with ID: ${cleanId}`);
      setIsLoading(false);
      return false;
    }
  };

  const checkOwnershipStatus = async (sweepstakesClient: SweepstakesClient, sweepstakesId?: string): Promise<boolean> => {
    try {
      // If we have a specific sweepstakes ID, check if the user is the creator of that sweepstakes
      if (sweepstakesId) {
        const sweepstakesData = await sweepstakesClient.viewSweepstakes(sweepstakesId);
        console.log("Checking ownership for sweepstakes:", sweepstakesId);
        console.log("Sweepstakes creator:", sweepstakesData?.Creator);
        console.log("Current user wallet address:", userId);
        
        return isOwnerOfSweepstakes(sweepstakesData.Creator, userId);
      }
      
      // Otherwise, try to fetch all sweepstakes and check if any are owned by the user
      const allSweepstakesResponse = await sweepstakesClient.viewAllSweepstakes();
      console.log("All sweepstakes for ownership check:", allSweepstakesResponse);
      
      // Check if any sweepstakes has the user as creator
      if (allSweepstakesResponse) {
        const sweepstakesArray = Object.values(allSweepstakesResponse);
        console.log("Checking if any sweepstakes has creator matching user ID:", userId);
        
        const hasOwnedSweepstakes = sweepstakesArray.some(sw => isOwnerOfSweepstakes(sw.Creator, userId));
        console.log("User has owned sweepstakes:", hasOwnedSweepstakes);
        
        return hasOwnedSweepstakes;
      }
      
      return false;
    } catch (err) {
      console.error('Failed to check ownership status:', err);
      return false;
    }
  };

  const loadSweepstakesEntrants = async (sweepstakesClient: SweepstakesClient) => {
    try {
      if (!currentSweepstakesId) {
        setEntrants([]);
        return;
      }
      
      const response = await sweepstakesClient.viewSweepstakesEntrants(currentSweepstakesId);
      console.log('Entrants response:', response);
      
      if (response && Array.isArray(response)) {
        setEntrants(response);
      } else if (response && response.Entries && Array.isArray(response.Entries)) {
        // Handle case where response might have an Entries property
        setEntrants(response.Entries);
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
      if (!currentSweepstakesId) {
        setPulls([]);
        return;
      }
      
      // First, get sweepstakes data to check PullCount
      const allSweepstakesResponse = await sweepstakesClient.viewAllSweepstakes();
      const sweepstakesData = allSweepstakesResponse?.[currentSweepstakesId];
      
      console.log('Loading pulls for sweepstakes:', currentSweepstakesId);
      console.log('Sweepstakes data for pulls:', sweepstakesData);
      
      if (!sweepstakesData || typeof sweepstakesData.PullCount !== 'number' || sweepstakesData.PullCount === 0) {
        console.log('No pulls found for this sweepstakes');
        setPulls([]);
        return;
      }
      
      // Get individual pulls based on PullCount
      const pullsArray: SweepstakesPull[] = [];
      for (let i = 0; i < sweepstakesData.PullCount; i++) {
        try {
          console.log(`Fetching pull ${i} for sweepstakes ${currentSweepstakesId}`);
          const pullResponse = await sweepstakesClient.viewSweepstakesPull(currentSweepstakesId, i.toString());
          
          if (pullResponse) {
            console.log(`Pull ${i} data:`, pullResponse);
            pullsArray.push({
              ...pullResponse,
              Id: i.toString(), // Ensure we have an ID for rendering
              Winner: pullResponse.Winner || 'Unknown'
            });
          }
        } catch (pullErr) {
          console.error(`Error fetching pull ${i}:`, pullErr);
        }
      }
      
      console.log('All pulls loaded:', pullsArray);
      setPulls(pullsArray);
    } catch (err) {
      console.error('Failed to load pulls:', err);
      setPulls([]);
    }
  };

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
      
      // Get details from the sweepstakesDetails state or use empty object
      const details = sweepstakesDetails || '{}';
      console.log('Registering sweepstakes with details:', details);
      
      // Call the modified registerSweepstakes with both entrants and details parameters
      const response = await client.registerSweepstakes(entrants, details);

      if (response === true) {
        console.log('Sweepstakes registered successfully, waiting for confirmation...');
        
        // Wait a moment for blockchain confirmation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update our local lists to get the new ID
        await loadAllSweepstakes();
        
        // Get the most recently added sweepstakes ID
        // This is a workaround since the modified function returns a boolean instead of an ID
        if (allSweepstakesIds.length > 0) {
          const newId = allSweepstakesIds[allSweepstakesIds.length - 1];
          setCurrentSweepstakesId(newId);
          setIsLoading(false);
          return newId;
        } else {
          setError('Sweepstakes registered but ID not found in updated list');
          setIsLoading(false);
          return null;
        }
      } else {
        setError('Failed to register sweepstakes - registration unsuccessful');
        setIsLoading(false);
        return null;
      }
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

    // Use provided list or current state
    const updatedEntrants = entrantsList || entrants;

    if (updatedEntrants.length === 0) {
      setError('No entrants to update');
      return false;
    }

    if (!currentSweepstakesId) {
      setError('No sweepstakes ID specified');
      return false;
    }

    try {
      setIsLoading(true);

      console.log('Updating entrants for sweepstakes:', {
        sweepstakesId: currentSweepstakesId,
        entrants: updatedEntrants
      });

      // Call the modified setSweepstakesEntrants with both entrants and sweepstakesId parameters
      await client.setSweepstakesEntrants(updatedEntrants, currentSweepstakesId);
      
      // Refresh the entrants list
      await loadSweepstakesEntrants(client);
      
      setIsLoading(false);
      return true;
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

    if (!currentSweepstakesId) {
      setError('No sweepstakes ID specified');
      return false;
    }

    try {
      setIsLoading(true);

      // Perform the pull for the current sweepstakes
      await client.pullSweepstakes(currentSweepstakesId);
      
      // Refresh the pulls list
      await loadSweepstakesPulls(client);
      
      // Clear the pull details
      setPullDetails('');
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull winner');
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
      setError('Entrant cannot be empty');
      return false;
    }
    
    try {
      setIsLoading(true);
      
      // Add the new entrant to the existing list
      const updatedEntrants = [...entrants, entrant.trim()];
      
      // Update the sweepstakes entrants
      await client.setSweepstakesEntrants(updatedEntrants);

      // Update the local state
      setEntrants(updatedEntrants);
      setNewEntrantText('');
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entrant');
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
    isClientReady,
    isPaid,
    isLoading,
    isListLocked,
    error,
    entrants,
    pulls,
    newEntrantText,
    pullDetails,
    allSweepstakesIds,
    userSweepstakesIds,
    currentSweepstakesId,
    sweepstakesData,
    sweepstakesDetails,
    userId: address || '',
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
