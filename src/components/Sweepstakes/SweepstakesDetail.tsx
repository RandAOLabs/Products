import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SweepstakesProvider, useSweepstakes } from '../../context/SweepstakesContext';
import { EntrantsForm } from './EntrantsForm/EntrantsForm';
import { PullsHistory } from './PullsHistory';
import './SweepstakesDetail.css';

// Utility function to format dates for pull history with relative time
const formatDate = (timestamp: number): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Show 'Just now' for timestamps less than 1 minute old
  if (diffMin < 1) {
    return 'Just now';
  }
  
  // Show relative time (minutes/hours/days ago) for recent timestamps
  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  }
  
  if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  }
  
  // Fall back to standard date format for older timestamps
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Collapsible component for the Update Entrants section
const Collapsible = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const toggleCollapsible = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="collapsible">
      <div className="collapsible-header" onClick={toggleCollapsible}>
        <h2>{title}</h2>
        <span className={`collapsible-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      <div className={`collapsible-content ${isOpen ? 'open' : ''}`}>
        <div className="collapsible-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

const SweepstakesDetailContent = () => {
  const { 
    currentSweepstakesId, 
    sweepstakesData, 
    getSweepstakesById,
    isLoading, 
    isPaid,
    isListLocked,
    error,
    addEntrant,
    entrants,
    pulls: contextPulls, // Rename to avoid conflicting with local state
    newEntrantText,
    setNewEntrantText,
    pullDetails,
    setPullDetails,
    pullWinner,
    refreshPulls,
    client,
    isClientReady
  } = useSweepstakes();
  
  // Create local state for pulls that can be updated independently
  // Initialize with pulls from context
  const [pulls, setPulls] = useState(contextPulls);
  
  // Local loading states to avoid full page reloads
  const [isPullingWinner, setIsPullingWinner] = useState(false);
  const [isAddingEntrant, setIsAddingEntrant] = useState(false);
  const [isUpdatingEntrants, setIsUpdatingEntrants] = useState(false);
  
  // Keep local pulls in sync with context pulls when they change
  useEffect(() => {
    if (contextPulls && contextPulls.length > 0) {
      setPulls(contextPulls);
    }
  }, [contextPulls]);
  
  const { sweepstakesId } = useParams<{ sweepstakesId: string }>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [pullReward, setPullReward] = useState<string>('');
  const [pullRank, setPullRank] = useState<string>('');
  const [rankError, setRankError] = useState<string>('');
  const [pullDescription, setPullDescription] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isLoadingEntrants, setIsLoadingEntrants] = useState(false);
  const [isLoadingPulls, setIsLoadingPulls] = useState(false);
  
  // Loading states that track whether data is being refreshed
  const [isRefreshingEntrants, setIsRefreshingEntrants] = useState(false);
  const [isRefreshingPulls, setIsRefreshingPulls] = useState(false);
  
  // Cache for data to prevent UI flashing while loading
  const [cachedEntrants, setCachedEntrants] = useState<string[]>([]);
  const [cachedPulls, setCachedPulls] = useState<any[]>([]);
  const didInitialRefresh = useRef<boolean>(false); // Track if we've done the initial refresh
  // Progress bar state removed - using inline loading spinners for each pull instead
  
  // Reference to store the current interval ID for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we just did a pull to stop auto-refresh after one cycle
  const justPulledRef = useRef<boolean>(false);
  
  // Update caches when data loads
  useEffect(() => {
    if (entrants.length > 0) {
      setCachedEntrants(entrants);
    }
  }, [entrants]);
  
  useEffect(() => {
    if (pulls.length > 0) {
      setCachedPulls(pulls);
    }
  }, [pulls]);
  
  // Function to seamlessly fetch the latest pull data without disrupting UI
  const fetchLatestPullData = useCallback(async () => {
    if (!currentSweepstakesId || !client || !isClientReady) return;
    
    try {
      console.log('🔍 Fetching latest pull data...');
      
      // Get the latest data
      const sweepstakesResponse = await client.viewSweepstakes(currentSweepstakesId);
      
      if (!sweepstakesResponse) {
        console.log('❌ No data returned from fetch');
        return;
      }
      
      let newPulls = [];
      
      // Check if we have pull data
      if (sweepstakesResponse.Pulls && Array.isArray(sweepstakesResponse.Pulls)) {
        console.log('✅ Got new pull data:', sweepstakesResponse.Pulls);
        
        // Format new pulls for consistency
        newPulls = sweepstakesResponse.Pulls.map((pull, index) => ({
          ...pull,
          Id: pull.Id || index.toString(),
          // Ensure Winner is ALWAYS either a non-empty string or an empty string (never 'Unknown')
          Winner: (pull.Winner && pull.Winner !== 'Unknown') ? pull.Winner : ''
        }));
      } else if (typeof sweepstakesResponse.PullCount === 'number' && sweepstakesResponse.PullCount > 0) {
        // Fetch each pull individually if we have a count but no array
        console.log(`🔄 Fetching ${sweepstakesResponse.PullCount} individual pulls`);
        
        for (let i = 0; i < sweepstakesResponse.PullCount; i++) {
          try {
            const pullResponse = await client.viewSweepstakesPull(currentSweepstakesId, i.toString());
            
            if (pullResponse) {
              newPulls.push({
                Id: i.toString(),
                // Ensure Winner is ALWAYS either a non-empty string or an empty string (never 'Unknown')
                Winner: (pullResponse.Winner && pullResponse.Winner !== 'Unknown') ? pullResponse.Winner : '',
                Details: pullResponse.Details || ''
              });
            }
          } catch (err) {
            console.error(`Error fetching pull ${i}:`, err);
          }
        }
      }
      
      // Only update if we have data
      if (newPulls.length > 0) {
        // Create a map of current pulls for quick lookup
        const currentPullsMap: Record<string, any> = {};
        pulls.forEach(pull => {
          if (pull.Id) {
            currentPullsMap[pull.Id] = pull;
          }
        });
        
        // Create an optimistic pull map to identify optimistic updates
        const optimisticPulls = pulls.filter(pull => pull.isOptimistic).reduce((acc: Record<string, boolean>, pull) => {
          if (pull.Id) {
            acc[pull.Id] = true;
          }
          return acc;
        }, {});
        
        // Create merged pulls array that preserves existing data until new data arrives
        const mergedPulls = newPulls.map(newPull => {
          const pullId = newPull.Id?.toString() || '';
          const existingPull = currentPullsMap[pullId];
          
          // If this is an optimistic pull that's being updated with real data
          if (existingPull && optimisticPulls[pullId] && newPull.Winner) {
            return {
              ...newPull,
              isOptimistic: false, // No longer optimistic once we have the winner
              transitioningWinner: true, // Add a flag to animate the transition if needed
            };
          }
          
          // If this pull exists and the new pull doesn't have meaningful updates, preserve existing data
          if (existingPull && (!newPull.Winner || newPull.Winner === existingPull.Winner)) {
            return existingPull;
          }
          
          // For normal pulls with new data, update while preserving any UI state properties
          return {
            ...newPull,
            // Preserve any UI state flags from existing pull
            ...(existingPull ? { 
              isExpanded: existingPull.isExpanded,
              isHighlighted: existingPull.isHighlighted
            } : {})
          };
        });
        
        console.log('✅ Setting merged pulls data:', mergedPulls);
        setPulls(mergedPulls);
        
        // Check if all pulls have winners now
        const hasPendingPulls = mergedPulls.some(pull => !pull.Winner);
        
        // If we just performed a pull and there are no pending pulls, stop refreshing
        if (justPulledRef.current && !hasPendingPulls) {
          console.log('✅ Pull completed with winner, stopping refresh');
          justPulledRef.current = false;
          
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
            refreshIntervalRef.current = null;
          }
        }
        // If we have no pending pulls at all, stop refreshing
        else if (!hasPendingPulls && refreshIntervalRef.current) {
          console.log('✅ All pulls resolved, stopping auto-refresh');
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error fetching latest pull data:', err);
    }
  }, [currentSweepstakesId, client, isClientReady, pulls]);
  
  // Calculate which pulls are pending (don't have a winner yet)
  const pendingPullIds = useMemo(() => {
    const pendingIds = {};
    
    // Check pulls from context
    pulls.forEach((pull, index) => {
      if (!pull.Winner) {
        const pullId = pull.Id?.toString() || index.toString();
        pendingIds[pullId] = true;
      }
    });
    
    // Also check pulls from sweepstakesData if available
    if (sweepstakesData?.Pulls) {
      sweepstakesData.Pulls.forEach((pull, index) => {
        if (!pull.Winner) {
          const pullId = pull.Id?.toString() || index.toString();
          pendingIds[pullId] = true;
        }
      });
    }
    
    return pendingIds;
  }, [pulls, sweepstakesData?.Pulls]);
  
  // Start/stop auto-refresh based on pending pulls
  useEffect(() => {
    const hasPendingPulls = Object.keys(pendingPullIds).length > 0;
    
    // If we have pending pulls but no interval is running, start one
    if (hasPendingPulls && !refreshIntervalRef.current) {
      console.log('🔄 Starting auto-refresh for pending pulls:', pendingPullIds);
      refreshIntervalRef.current = setInterval(fetchLatestPullData, 1000);
    } 
    // If we have no pending pulls but an interval is running, stop it
    else if (!hasPendingPulls && refreshIntervalRef.current) {
      console.log('✅ No more pending pulls, stopping auto-refresh');
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [pendingPullIds, fetchLatestPullData]);
  
  // Memoized pulls display logic - moved to top level to comply with Rules of Hooks
  const pullsDisplayContent = useMemo(() => {
    // Use pulls from local state first which maintains data during refreshes
    let availablePulls = pulls || [];
    
    // If no pulls in local state but they exist in sweepstakesData, use those as fallback
    if (availablePulls.length === 0 && sweepstakesData?.Pulls && sweepstakesData.Pulls.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Using pulls from sweepstakesData directly for display');
      }
      availablePulls = sweepstakesData.Pulls;
    }
    
    if (availablePulls.length === 0) {
      return <div className="no-pulls">No pulls have been made yet</div>;
    }
    
    // Sort pulls - newest first, but ensure optimistic pulls stay at the top
    const sortedPulls = [...availablePulls].sort((a, b) => {
      // Always show optimistic/pending pulls first
      if (a.isOptimistic && !b.isOptimistic) return -1;
      if (!a.isOptimistic && b.isOptimistic) return 1;
      
      // If both are optimistic or both are not, sort by timestamp or ID
      if (a.timestamp && b.timestamp) {
        return b.timestamp - a.timestamp; // Newest first
      }
      
      // Fallback to ID-based sorting
      const aId = parseInt(a.Id?.toString() || '0', 10);
      const bId = parseInt(b.Id?.toString() || '0', 10);
      return aId - bId; // Usually newest pulls have higher IDs
    });
    
    return (
      <div className="pulls-container">
        {sortedPulls.map((pull, index) => {
          // Try to parse details if they exist
          let parsedDetails = null;
          try {
            if (pull.Details) {
              parsedDetails = JSON.parse(pull.Details);
            }
          } catch (e) {
            // Keep parsedDetails as null if parsing fails
          }
          
          // Get pull ID consistently for checking pending status
          const pullId = pull.Id?.toString() || index.toString();
          const isPending = !pull.Winner || pendingPullIds[pullId];
          const isOptimistic = !!pull.isOptimistic;
          const isTransitioning = !!pull.transitioningWinner;
          
          // Determine appropriate CSS classes for the pull item
          const pullItemClasses = [
            'pull-item',
            isOptimistic ? 'optimistic' : '',
            isPending ? 'pending' : '',
            isTransitioning ? 'transitioning' : ''
          ].filter(Boolean).join(' ');
          
          return (
            <div key={`${pullId}-${index}`} className={pullItemClasses}>
              {/* Rank Badge - Only shown if rank is present and valid */}
              {parsedDetails?.rank && /^[1-5]$/.test(parsedDetails.rank) && (
                <div className={`rank-badge rank-${parsedDetails.rank}`}>
                  {parsedDetails.rank}
                </div>
              )}
              
              <div className="pull-header">
                <div className="pull-winner-container">
                  {!pull.Winner || pull.Winner === '' || pull.Winner === 'Unknown' ? (
                    <div className="pull-winner pending">
                      <div className="spinner-small"></div>
                      <span className="loading-text">Pulling winner...</span>
                    </div>
                  ) : (
                    <div className={`pull-winner ${isTransitioning ? 'winner-transition' : ''}`}>
                      {pull.Winner}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Only show details section if there are details to show */}
              {parsedDetails && (parsedDetails.reward || parsedDetails.description) && (
                <div className="pull-details">
                  {parsedDetails.reward && (
                    <div className="pull-detail-item">
                      <span className="pull-detail-label">Reward</span>
                      <span className="pull-detail-value pull-reward">{parsedDetails.reward}</span>
                    </div>
                  )}
                  
                  {parsedDetails.description && (
                    <div className="pull-detail-item">
                      <span className="pull-detail-label">Info</span>
                      <span className="pull-detail-value pull-description">{parsedDetails.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [pulls, sweepstakesData?.Pulls, pendingPullIds]); // Include pendingPulls in dependencies
  
  // Load sweepstakes data when component mounts
  useEffect(() => {
    // Add very detailed logging about the URL parameter (only once during initial mount)
    console.log("🔍 SweepstakesDetail - URL Parameter Analysis:", {
      sweepstakesIdFromURL: sweepstakesId,
      currentSweepstakesIdInContext: currentSweepstakesId,
      isSameId: sweepstakesId === currentSweepstakesId,
      typeOfSweepstakesId: typeof sweepstakesId,
      sweepstakesIdLength: sweepstakesId ? sweepstakesId.length : 0,
      hasPossibleSpecialChars: sweepstakesId ? /[^\w-]/.test(sweepstakesId) : false,
      urlPath: window.location.pathname,
      clientInitialized: !!client,
      isClientReady // Log the client ready state
    });
    
    // Initialize a retry counter for client initialization
    let retryCount = 0;
    const maxRetries = 10;  
    const retryDelay = 1000;  
    
    // Create a function to load sweepstakes with retry logic
    const attemptLoadSweepstakes = () => {
      if (!sweepstakesId) {
        console.error("❌ No sweepstakes ID found in URL parameters");
        return;
      }
      
      // Safely trim any potential whitespace
      const cleanId = sweepstakesId.trim();
      
      // Check if client is initialized AND ready
      if (!client || !isClientReady) {
        if (retryCount < maxRetries) {
          console.log(`⏳ Client not ready yet. Retrying... (Attempt ${retryCount + 1}/${maxRetries})`, {
            hasClient: !!client,
            isClientReady
          });
          
          retryCount++;
          setTimeout(attemptLoadSweepstakes, retryDelay); 
          return;
        } else {
          console.error("❌ Client failed to initialize after multiple attempts");
          return;
        }
      }
      
      console.log(`🔄 Client initialized and ready. Loading sweepstakes with ID: ${cleanId}`);
      
      // Check for ID mismatch and then load
      if (cleanId !== currentSweepstakesId) {
        console.log(`📥 Fetching sweepstakes details for ID: ${cleanId}`);
        getSweepstakesById(cleanId);
      } else {
        console.log(`⏭️ Skipping fetch - ID ${cleanId} already loaded`);
        // Only refresh pulls on initial load, not on every render
        if (!didInitialRefresh.current) {
          console.log('🔄 Performing initial pulls refresh');
          refreshPulls();
          didInitialRefresh.current = true;
        }
      }
    };
    
    // Start the loading process with a small delay to ensure React Router has processed the URL
    const loadTimeout = setTimeout(attemptLoadSweepstakes, 100);
    
    // Clean up timeout if component unmounts
    return () => clearTimeout(loadTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweepstakesId, currentSweepstakesId, client, isClientReady]);  // Remove dependencies that cause re-renders

  // Determine if the current user is the owner of this sweepstakes
  useEffect(() => {
    if (sweepstakesData) {
      // Compare user ID with the creator ID from sweepstakesData
      // This would be a real check in production code
      setIsOwner(isPaid);
      
      // Check if we have pulls in the data and log it
      const hasDataPulls = !!(sweepstakesData.Pulls && sweepstakesData.Pulls.length > 0);
      console.log("📊 Pulls analysis:", {
        pullsInContextState: pulls.length,
        pullsInSweepstakesData: sweepstakesData.Pulls?.length || 0,
        pullCountValue: sweepstakesData.PullCount || 0,
        hasDataPulls
      });
      
      // Log detailed information about the sweepstakes for debugging
      console.log("Sweepstakes detail component data:", {
        sweepstakesId,
        currentSweepstakesId,
        sweepstakesData,
        isOwner: isPaid,
        entrantsCount: entrants.length,
        pullsCount: sweepstakesData.PullCount || pulls.length,
        isListLocked
      });
    }
  }, [sweepstakesData, isPaid, sweepstakesId, currentSweepstakesId, entrants.length, pulls.length, isListLocked]);

  const handleAddEntrant = async () => {
    if (!newEntrantText.trim()) {
      setLocalError('Please enter a name');
      return;
    }
    
    setLocalError(null);
    setIsAddingEntrant(true); // Set local loading state
    
    try {
      // Track the current entrant being added for optimistic update
      const entrantToAdd = newEntrantText.trim();
      
      // Optimistically update UI
      const updatedEntrants = [...entrants, entrantToAdd];
      
      // Clear input early for better UX
      setNewEntrantText('');
      
      // Make API call in background
      await addEntrant(entrantToAdd);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to add entrant');
    } finally {
      setIsAddingEntrant(false);
    }
  };

  // Handle changes for individual pull form fields
  const handlePullRewardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPullReward(e.target.value);
  };
  
  const handlePullRankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric values for rank
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setPullRank(value);
    }
  };
  
  const handlePullDescriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPullDescription(e.target.value);
  };

  // Progress bar function removed - now using inline loading spinners for each pull
  
  // Create a ref for the pull button to safely access it
  const pullButtonRef = useRef<HTMLButtonElement | null>(null);
  
  // State to track if a pull is in progress
  const [isPulling, setIsPulling] = useState(false);
  
  // Handler for pull winner button
  const handlePullWinner = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission and page refresh
    setLocalError(null);
    
    // Validate rank is selected (required)
    if (!pullRank) {
      setRankError('Please select a rank (required)');
      return;
    }
    
    // Record the button reference to avoid null errors when updating disabled state
    pullButtonRef.current = e.currentTarget;
    
    // Use both component-wide and local state trackers
    setIsPulling(true);
    setIsPullingWinner(true); // Set local state for pull operation
    e.currentTarget.disabled = true;
    
    console.log('🎲 Pull Winner button clicked');
    
    // Construct JSON object from individual fields
    const detailsObj: Record<string, any> = {};
    
    if (pullReward.trim()) {
      detailsObj.reward = pullReward.trim();
    }
    
    if (pullRank.trim()) {
      detailsObj.rank = parseInt(pullRank.trim(), 10);
    }
    
    if (pullDescription.trim()) {
      detailsObj.description = pullDescription.trim();
    }
    
    // Convert object to JSON string
    const detailsJson = Object.keys(detailsObj).length > 0 ? JSON.stringify(detailsObj) : '';
    console.log('📝 Constructed pull details JSON:', detailsJson);
    
    try {
      // Generate a unique ID for this optimistic pull
      const newPullId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create an optimistic pull with a pending state
      const optimisticPull = {
        Id: newPullId,
        Details: detailsJson,
        Winner: '', // Empty winner triggers the spinner
        isOptimistic: true, // Mark this as an optimistic update
        isPending: true, // Track pending state explicitly
        timestamp: Date.now() // Add timestamp for sorting/tracking
      };
      
      // Add optimistic pull to the UI immediately at the top
      setPulls(prevPulls => [optimisticPull, ...prevPulls]);
      
      // Clear form fields immediately for better UX
      setPullReward('');
      setPullRank('');
      setPullDescription('');
      
      // Submit the pull request to the API in the background
      console.log('🔄 Calling pullWinner function with details:', detailsJson);
      await pullWinner(detailsJson);
      console.log('✅ Pull winner request sent successfully');
      
      // Mark that we just did a pull so we can handle refresh state appropriately
      justPulledRef.current = true;
      
      // Set a brief timeout to allow UI to update before refreshing
      console.log('⏱️ Waiting briefly before refreshing pull data...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Do a single refresh to get updated data - this will maintain current UI state
      console.log('🔄 Performing refresh to get real winner data...');
      await fetchLatestPullData();
      
      // Start auto-refresh if there are still pulls without winners
      if (!refreshIntervalRef.current) {
        console.log('🔄 Starting auto-refresh for pending pulls');
        refreshIntervalRef.current = setInterval(fetchLatestPullData, 1000);
      }
      
      // Optional: Scroll smoothly to the top pull after a moment
      setTimeout(() => {
        const firstPullElement = document.querySelector('.pull-item');
        if (firstPullElement) {
          firstPullElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 500);
    } catch (err) {
      console.error('❌ Pull winner error:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to pull winner');
      
      // Remove optimistic pull on error
      setPulls(prevPulls => prevPulls.filter(pull => !pull.isOptimistic));
    } finally {
      // Always reset the pull states when done
      setIsPulling(false);
      setIsPullingWinner(false);
      
      // Re-enable the button if it exists
      if (pullButtonRef.current) {
        pullButtonRef.current.disabled = false;
      }
    }
  }, [pullReward, pullRank, pullDescription, pullWinner, pulls, fetchLatestPullData]);

  // Parse details JSON into object
  const parseDetails = (jsonString: string | null | undefined) => {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  };

  // Format JSON for display (fallback for legacy)
  const formatJson = (jsonString: string | null | undefined) => {
    if (!jsonString) return '{}';
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  // Only show full page loading on initial load, not on updates
  if (isLoading && (!sweepstakesData || Object.keys(sweepstakesData).length === 0)) {
    return <div className="loading-container">Loading sweepstakes...</div>;
  }

  if (!sweepstakesData && !isLoading) {
    return (
      <div className="not-found-container">
        <div className="not-found-message">
          <h2>Sweepstakes Not Found</h2>
          <p>The sweepstakes you're looking for could not be found.</p>
          <Link to="/sweepstakes" className="back-button">
            Back to All Sweepstakes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sweepstakes-detail">
      <div className="sweepstakes-detail-header">
        <h1>
          Sweepstakes: {parseDetails(sweepstakesData?.Details)?.name || 'Unnamed'}
          <span 
            className="id-badge" 
            onClick={() => {
              navigator.clipboard.writeText(sweepstakesId);
              // Show a temporary tooltip
              const badge = document.querySelector('.id-badge');
              if (badge) {
                badge.classList.add('copied');
                setTimeout(() => badge.classList.remove('copied'), 2000);
              }
            }}
            title="Click to copy ID"
          >
            #{sweepstakesId.substring(0, 8)}...
            <span className="tooltip">Copied!</span>
          </span>
        </h1>
        <div className="controls-section">
          <Link to="/sweepstakes" className="back-button">
            ← Back to All Sweepstakes
          </Link>
        </div>
      </div>

      {/* Sweepstakes info will be displayed in the left column below */}
      
      <div className="content-container">
        {/* Left Column - Details and Pull a Winner */}
        <div className="left-column">
          {/* Sweepstakes Details Section (with proper styling) */}
          <div className="details-section sweepstakes-info">
            <h2>Sweepstakes Details</h2>
            <div className="detail-row">
              <span className="label">ID:</span>
              <span className="value">
                <span className="copy-id" onClick={() => {
                  navigator.clipboard.writeText(currentSweepstakesId);
                  const copyEl = document.querySelector('.copy-id');
                  if (copyEl) {
                    copyEl.classList.add('copied');
                    setTimeout(() => copyEl.classList.remove('copied'), 2000);
                  }
                }}>
                  {currentSweepstakesId}
                  <span className="copy-tooltip">Click to copy</span>
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Creator:</span>
              <span className="value creator-address">{sweepstakesData?.Creator || 'Unknown'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value">
                <span className={`status ${isListLocked ? 'locked' : 'unlocked'}`}>
                  {isListLocked ? 'Locked' : 'Unlocked'}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Ownership:</span>
              <span className="value">
                <span className={`ownership ${isOwner ? 'owner' : 'visitor'}`}>
                  {isOwner ? 'Owner' : 'Visitor'}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Stats:</span>
              <span className="value">
                <span className="stat-value">{entrants?.length || 0} Entrants</span>
                <span className="separator">•</span>
                <span className="stat-value">{pulls?.length || 0} Pulls</span>
              </span>
            </div>
            
            {/* Parsed details display */}
            {sweepstakesData?.Details && parseDetails(sweepstakesData.Details) && (
              <div className="detail-row">
                <span className="label">About:</span>
                <span className="value">
                  {parseDetails(sweepstakesData.Details)?.description || 'No description available'}
                </span>
              </div>
            )}
            
            {/* Entrants compact list */}
            {entrants && entrants.length > 0 && (
              <div className="detail-row">
                <span className="label">Entrants:</span>
                <div className="value">
                  <div className="compact-entrants">
                    {entrants.map((entrant, index) => (
                      <span key={index} className="compact-entrant" title={entrant}>
                        {entrant}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pull a Winner Section */}
          {isOwner && !isListLocked && entrants && entrants.length > 0 && (
            <div className="pull-section">
              <div className="pull-section-header">
                <h2>Pull a Winner</h2>
                <button 
                  type="button" 
                  className="pull-button" 
                  onClick={handlePullWinner}
                  disabled={isPullingWinner}
                >
                  {isPullingWinner ? 'Pulling...' : 'Pull Now'}
                  {isPullingWinner && <span className="spinner-inline"></span>}
                </button>
              </div>
              
              <form className="pull-form" onSubmit={(e) => e.preventDefault()}>
                {/* Rank selection - first element under the header */}
                <div className="rank-selection">
                  <div className="rank-selection-label">
                    Select Rank <span className="required">*</span>
                  </div>
                  
                  <div className="rank-options">
                    {[1, 2, 3, 4, 5].map((rank) => (
                      <label key={rank} className="rank-option">
                        <input
                          type="radio"
                          name="pullRank"
                          value={rank}
                          checked={pullRank === rank.toString()}
                          onChange={handlePullRankChange}
                          className="rank-radio"
                        />
                        <div className="rank-bubble">{rank}</div>
                      </label>
                    ))}
                  </div>
                  
                  <div className="rank-options-labels">
                    <span>Gold</span>
                    <span>Silver</span>
                    <span>Bronze</span>
                    <span>4th</span>
                    <span>5th</span>
                  </div>
                  
                  <div className="rank-validation">{rankError}</div>
                </div>

                {/* Reward and Description side by side */}
                <div className="reward-description-row">
                  {/* Reward field */}
                  <div className="form-group">
                    <label htmlFor="pullReward">Reward (optional)</label>
                    <input
                      id="pullReward"
                      type="text"
                      value={pullReward}
                      onChange={handlePullRewardChange}
                      className="form-input"
                      placeholder="e.g. $50 Gift Card"
                    />
                  </div>

                  {/* Description field */}
                  <div className="form-group">
                    <label htmlFor="pullDescription">Description (optional)</label>
                    <input
                      id="pullDescription"
                      type="text"
                      value={pullDescription}
                      onChange={handlePullDescriptionChange}
                      className="form-input"
                      placeholder="Additional info about this pull"
                    />
                  </div>
                </div>
              </form>
              
              {localError && <div className="error-message">{localError}</div>}
            </div>
          )}
          
          {/* Non-owner view of entrants list */}
          {(!isOwner || isListLocked) && (
            <div className="entrants-section">
              <h2>Entrants List {isListLocked && '(Locked)'}</h2>
              {isLoadingEntrants ? (
                <div className="loading-spinner"><div></div><div></div><div></div><div></div></div>
              ) : (
                <>
                  <div className="entrants-count">
                    Total entries: {(isRefreshingEntrants ? cachedEntrants : entrants).length}
                  </div>
                  {(isRefreshingEntrants ? cachedEntrants : entrants).length > 0 ? (
                    <div className="entrants-list">
                      <div className="entrants-container">
                        {(isRefreshingEntrants ? cachedEntrants : entrants).map((entrant, index) => (
                          <span key={index} className="entrant-item">{entrant}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="no-entrants">No entrants available</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Right Column - Update Entrants and Pull History */}
        <div className="right-column">
          {/* Update Entrants Form for owners - only show if there are ZERO pulls in history */}
          {isOwner && !isListLocked && pulls.length === 0 && (
            <Collapsible title="Update Entrants" defaultOpen={false}>
              <EntrantsForm 
                mode="update"
                initialEntrants={isRefreshingEntrants ? cachedEntrants : entrants} 
                onEntrantsChange={(newEntrants) => {
                  // For consistency with create form but we don't need to update
                  // the context immediately - it will happen on submit
                  console.log('Entrants changed in form:', newEntrants.length);
                }}
                title=""
                buttonText="Update Entrants List"
              />
            </Collapsible>
          )}

          {/* Locked message for owners */}
          {isOwner && isListLocked && (
            <div className="locked-message">
              <p>
                <span className="warning-icon">⚠️</span> 
                Entrants list is locked because winners have been pulled
              </p>
            </div>
          )}
          
          {/* Pull History Section */}
          <div className="pulls-history-section">
            <h2>Pull History</h2>
            {isLoadingPulls ? (
              <div className="loading-spinner"><div></div><div></div><div></div><div></div></div>
            ) : (
              <div className="pulls-container">
                {/* Use the cached pulls during refresh to prevent UI flashing */}
                {pullsDisplayContent}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {(error || localError) && (
        <div className="error-message">
          {error || localError}
        </div>
      )}
    </div>
  );
};

export const SweepstakesDetail = () => {
  return (
    <SweepstakesProvider>
      <SweepstakesDetailContent />
    </SweepstakesProvider>
  );
};
