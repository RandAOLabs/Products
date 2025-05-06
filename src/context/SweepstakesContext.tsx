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
  registerSweepstakes: (detailsOverride?: string) => Promise<string | null>;
  updateEntrants: (entrantsList?: string[]) => Promise<boolean>;
  pullWinner: (details?: string) => Promise<boolean>;
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
  registerSweepstakes: async (detailsOverride?: string) => null,
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
      
      // Get sweepstakes to access its entries
      const sweepstakesData = await sweepstakesClient.viewSweepstakes(currentSweepstakesId);
      console.log('Entrants from sweepstakes data:', sweepstakesData);
      
      if (sweepstakesData && sweepstakesData.Entries && Array.isArray(sweepstakesData.Entries)) {
        setEntrants(sweepstakesData.Entries);
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
        console.log('⚠️ No currentSweepstakesId available for loading pulls');
        setPulls([]);
        return;
      }
      
      console.log('🔍 PULL LOADING - Starting process for sweepstakes:', currentSweepstakesId);
      
      // APPROACH 1: Use sweepstakesData from state if available
      if (sweepstakesData && sweepstakesData.Pulls && sweepstakesData.Pulls.length > 0) {
        console.log('🎯 PULL LOADING - Found pulls directly in sweepstakesData:', sweepstakesData.Pulls);
        
        // Transform to ensure proper format
        const formattedPulls = sweepstakesData.Pulls.map((pull, index) => ({
          ...pull,
          Id: pull.Id || index.toString(),
          Winner: pull.Winner || 'Unknown'
        }));
        
        console.log('✅ PULL LOADING - Setting pulls from sweepstakesData:', formattedPulls);
        setPulls(formattedPulls);
        return;
      }
      
      // APPROACH 2: Fetch from viewAllSweepstakes
      console.log('🔄 PULL LOADING - Attempting to get pulls from viewAllSweepstakes');
      const allSweepstakesResponse = await sweepstakesClient.viewAllSweepstakes();
      const sweepstakesDataFromApi = allSweepstakesResponse?.[currentSweepstakesId];
      
      console.log('📦 PULL LOADING - Sweepstakes data from API:', sweepstakesDataFromApi);
      
      // Check if Pulls are directly available in the response
      if (sweepstakesDataFromApi && sweepstakesDataFromApi.Pulls && 
          Array.isArray(sweepstakesDataFromApi.Pulls) && 
          sweepstakesDataFromApi.Pulls.length > 0) {
        
        console.log('🎯 PULL LOADING - Found pulls in API response:', sweepstakesDataFromApi.Pulls);
        
        // Transform to ensure proper format
        const formattedPulls = sweepstakesDataFromApi.Pulls.map((pull, index) => ({
          ...pull,
          Id: pull.Id || index.toString(),
          Winner: pull.Winner || 'Unknown'
        }));
        
        console.log('✅ PULL LOADING - Setting pulls from API data:', formattedPulls);
        setPulls(formattedPulls);
        return;
      }
      
      // APPROACH 3: Get individual pulls based on PullCount
      const pullCount = sweepstakesDataFromApi?.PullCount || sweepstakesData?.PullCount || 0;
      
      console.log(`🔢 PULL LOADING - PullCount detected: ${pullCount}`);
      
      if (pullCount <= 0) {
        console.log('⚠️ PULL LOADING - No pulls found based on PullCount');
        setPulls([]);
        return;
      }
      
      // Get individual pulls based on PullCount
      console.log(`🔄 PULL LOADING - Attempting to fetch ${pullCount} individual pulls`);
      const pullsArray: SweepstakesPull[] = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < pullCount; i++) {
        try {
          const pullId = i.toString();
          console.log(`🔹 PULL LOADING - Fetching pull ${pullId} for sweepstakes ${currentSweepstakesId}`);
          
          const pullResponse = await sweepstakesClient.viewSweepstakesPull(currentSweepstakesId, pullId);
          
          if (pullResponse) {
            console.log(`✓ PULL LOADING - Successfully fetched pull ${pullId}:`, pullResponse);
            pullsArray.push({
              ...pullResponse,
              Id: pullResponse.Id || pullId,
              Winner: pullResponse.Winner || 'Unknown'
            });
            successCount++;
          } else {
            console.warn(`⚠️ PULL LOADING - Received empty response for pull ${pullId}`);
            errorCount++;
          }
        } catch (pullErr) {
          console.error(`❌ PULL LOADING - Error fetching pull ${i}:`, pullErr);
          errorCount++;
        }
      }
      
      console.log(`📊 PULL LOADING - Fetch results: ${successCount} successes, ${errorCount} errors`);
      
      if (pullsArray.length > 0) {
        console.log('✅ PULL LOADING - Setting pulls from individual fetches:', pullsArray);
        setPulls(pullsArray);
      } else {
        console.warn('⚠️ PULL LOADING - No pulls could be fetched individually despite PullCount > 0');
        setPulls([]);
      }
      
    } catch (err) {
      console.error('❌ PULL LOADING - Failed to load pulls:', err);
      setPulls([]);
    }
  };

  const registerSweepstakes = async (detailsOverride?: string): Promise<string | null> => {
    console.log('X-RegisterSweepstakes START', {
      entrants: entrants,
      entrantsLength: entrants.length,
      sweepstakesDetails: sweepstakesDetails,
      detailsOverride: detailsOverride
    });
    
    if (!client) {
      console.log('X-Error: Client not initialized');
      setError('Client not initialized or wallet not connected');
      return null;
    }

    if (entrants.length === 0) {
      console.log('X-Error: No entrants to register');
      setError('No entrants to register');
      return null;
    }

    try {
      setIsLoading(true);
      
      // Use passed details if provided, otherwise fall back to context state or empty object
      let details = detailsOverride !== undefined ? detailsOverride : (sweepstakesDetails || '{}');
      console.log('X-Entrants', JSON.stringify(entrants));
      console.log('X-Details', details);
      console.log('X-Using details from:', detailsOverride !== undefined ? 'direct parameter' : 'context state');
      
      // Validate that details is a valid JSON string
      try {
        JSON.parse(details);
      } catch (e) {
        console.error('X-Error: Invalid JSON details:', details);
        console.log('X-Attempting to fix invalid JSON by using empty object');
        details = '{}';
      }
      
      // Call the modified registerSweepstakes with both entrants and details parameters
      console.log('X-Calling client.registerSweepstakes with:', { entrants: entrants.length, details });
      const response = await client.registerSweepstakes(entrants, details);
      console.log('X-Client response:', response);

      if (response === true) {
        console.log('X-Success: Sweepstakes registered successfully');
        
        // Wait a moment for blockchain confirmation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update our local lists to get the new ID
        console.log('X-Loading all sweepstakes to get new ID');
        await loadAllSweepstakes();
        
        // Get the most recently added sweepstakes ID
        // This is a workaround since the modified function returns a boolean instead of an ID
        console.log('X-Current allSweepstakesIds:', allSweepstakesIds);
        if (allSweepstakesIds.length > 0) {
          const newId = allSweepstakesIds[allSweepstakesIds.length - 1];
          console.log('X-New sweepstakes ID identified:', newId);
          setCurrentSweepstakesId(newId);
          setIsLoading(false);
          return newId;
        } else {
          console.log('X-Error: No sweepstakes IDs found after registration');
          setError('Sweepstakes registered but ID not found in updated list');
          setIsLoading(false);
          return null;
        }
      } else {
        console.log('X-Error: Registration unsuccessful');
        setError('Failed to register sweepstakes - registration unsuccessful');
        setIsLoading(false);
        return null;
      }
    } catch (err) {
      console.error('X-Registration error:', err);
      
      // Check if this is a wallet rejection error
      const errorStr = String(err);
      if (errorStr.includes('TokenClient Error') || 
          errorStr.includes('WriteReadAOClient Error') || 
          errorStr.includes('User rejected') || 
          errorStr.includes('Transaction rejected') ||
          errorStr.includes('user denied') ||
          errorStr.includes('User denied')) {
        
        console.log('X-Detected wallet transaction rejection');
        setError('Transaction canceled: User rejected wallet request');
      } else {
        // General error handling
        setError(err instanceof Error ? err.message : 'Failed to register sweepstakes');
      }
      
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

  const pullWinner = async (detailsParam?: string): Promise<boolean> => {
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

      // Use the provided details parameter if available, otherwise fall back to state
      const details = detailsParam !== undefined ? detailsParam.trim() : (pullDetails ? pullDetails.trim() : '');
      console.log('Pull details to be sent:', { details });

      // Perform the pull for the current sweepstakes with the details
      await client.pullSweepstakes(currentSweepstakesId, details);
      
      // Refresh the pulls list
      await loadSweepstakesPulls(client);
      
      // Clear the pull details
      setPullDetails('');
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to pull winner:', err);
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
      
      // Update the sweepstakes entrants - include the sweepstakes ID
      await client.setSweepstakesEntrants(updatedEntrants, currentSweepstakesId);

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
