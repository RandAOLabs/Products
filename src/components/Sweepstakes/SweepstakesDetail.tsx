import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SweepstakesProvider, useSweepstakes } from '../../context/SweepstakesContext';
import { EntrantsForm } from './EntrantsForm/EntrantsForm';
import { PullsHistory } from './PullsHistory';
import './SweepstakesDetail.css';

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
  const [pullDescription, setPullDescription] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const didInitialRefresh = useRef<boolean>(false); // Track if we've done the initial refresh
  // Progress bar state removed - using inline loading spinners for each pull instead
  
  // Reference to store the current interval ID for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we just did a pull to stop auto-refresh after one cycle
  const justPulledRef = useRef<boolean>(false);
  
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
              <div className="pull-header">
                {!pull.Winner || pull.Winner === '' || pull.Winner === 'Unknown' ? (
                  <div className="pull-winner pending">
                    <span className="loading-spinner"></span>
                    <span className="loading-text">Selecting winner...</span>
                  </div>
                ) : (
                  <div className={`pull-winner ${isTransitioning ? 'winner-transition' : ''}`}>
                    {pull.Winner}
                  </div>
                )}
                <div className="pull-id">Pull #{index + 1}</div>
              </div>
              {/* Display available information from the pull */}
              <div className="pull-details">
                {parsedDetails ? (
                  <div className="structured-pull-details">
                    {parsedDetails.reward && (
                      <div className="detail-item">
                        <span className="detail-label">Reward:</span>
                        <span className="detail-value">{parsedDetails.reward}</span>
                      </div>
                    )}
                    {parsedDetails.rank !== undefined && (
                      <div className="detail-item">
                        <span className="detail-label">Rank:</span>
                        <span className="detail-value">{parsedDetails.rank}</span>
                      </div>
                    )}
                    {parsedDetails.description && (
                      <div className="detail-item">
                        <span className="detail-label">Description:</span>
                        <span className="detail-value">{parsedDetails.description}</span>
                      </div>
                    )}
                    {/* Show other fields that might exist but weren't in our standard form */}
                    {Object.entries(parsedDetails)
                      .filter(([key]) => !['reward', 'rank', 'description'].includes(key))
                      .map(([key, value]) => (
                        <div className="detail-item" key={key}>
                          <span className="detail-label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                          <span className="detail-value">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div>Details: {pull.Details || 'No details available'}</div>
                )}
              </div>
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
    try {
      await addEntrant(newEntrantText);
      setNewEntrantText(''); // Clear the input after successful addition
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to add entrant');
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
    
    // Record the button reference to avoid null errors when updating disabled state
    pullButtonRef.current = e.currentTarget;
    
    // Disable the button and track that we're in the process of pulling
    setIsPulling(true);
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
      
      // Submit the pull request to the API
      console.log('🔄 Calling pullWinner function with details:', detailsJson);
      await pullWinner(detailsJson);
      console.log('✅ Pull winner request sent successfully');
      
      // Clear form fields after successful pull
      setPullReward('');
      setPullRank('');
      setPullDescription('');
      
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
      // Always reset the pull state when done
      setIsPulling(false);
      
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

  if (isLoading) {
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
        <h1>Sweepstakes #{sweepstakesId}</h1>
        <div className="controls-section">
          <Link to="/sweepstakes" className="back-button">
            ← Back to All Sweepstakes
          </Link>
        </div>
      </div>

      <div className="sweepstakes-info">
        <div className="info-section">
          <h2>Sweepstakes Info</h2>
          <div className="detail-row">
            <span className="label">ID:</span>
            <span className="value">{currentSweepstakesId}</span>
          </div>
          <div className="detail-row">
            <span className="label">Creator:</span>
            <span className="value creator-address">{sweepstakesData?.Creator || 'Unknown'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`value status ${isListLocked ? 'locked' : 'unlocked'}`}>
              {isListLocked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">Ownership:</span>
            <span className={`value ownership ${isOwner ? 'owner' : 'visitor'}`}>
              {isOwner ? 'You own this sweepstakes' : 'You are viewing someone else\'s sweepstakes'}
            </span>
          </div>
          {sweepstakesData?.Details && (
            <div className="details-section">
              <h3>Details</h3>
              {(() => {
                const details = parseDetails(sweepstakesData?.Details);
                if (!details) {
                  // Fallback to raw JSON if cannot parse
                  return <pre className="details-json">{formatJson(sweepstakesData?.Details)}</pre>;
                }
                
                return (
                  <div className="structured-details">
                    {details.name && (
                      <div className="detail-row">
                        <span className="label">Name:</span>
                        <span className="value highlight">{details.name}</span>
                      </div>
                    )}
                    
                    {details.description && (
                      <div className="detail-row description">
                        <span className="label">Description:</span>
                        <div className="value description-text">{details.description}</div>
                      </div>
                    )}
                    
                    {details.prize && (
                      <div className="detail-row">
                        <span className="label">Prize:</span>
                        <span className="value prize">{details.prize}</span>
                      </div>
                    )}
                    
                    {details.endDate && (
                      <div className="detail-row">
                        <span className="label">End Date:</span>
                        <span className="value">{details.endDate}</span>
                      </div>
                    )}
                    
                    {details.rules && (
                      <div className="detail-row rules">
                        <span className="label">Rules:</span>
                        <div className="value rules-text">{details.rules}</div>
                      </div>
                    )}
                    
                    {details.maxEntrants && (
                      <div className="detail-row">
                        <span className="label">Max Entrants:</span>
                        <span className="value">{details.maxEntrants}</span>
                      </div>
                    )}
                    
                    {/* Show other fields that might exist but weren't in our form */}
                    {Object.entries(details)
                      .filter(([key]) => !['name', 'description', 'prize', 'endDate', 'rules', 'maxEntrants'].includes(key))
                      .map(([key, value]) => (
                        <div className="detail-row" key={key}>
                          <span className="label">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                          <span className="value">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      
      <div className="content-container">
        <div className="left-column">
          <div className="entrants-section">
            <h2>Entrants</h2>
            {isListLocked ? (
              <div className="locked-notice">
                This sweepstakes is locked and entrants cannot be modified.
              </div>
            ) : null}
            
            {/* Replace the existing entrants form with our enhanced EntrantsForm */}
            {isOwner && !isListLocked ? (
              <EntrantsForm 
                mode="update"
                title="Update Entrants"
                buttonText="Update Entrants List"
              />
            ) : (
              <div className="entrants-list">
                {entrants.length === 0 ? (
                  <div className="no-entrants">No entrants available</div>
                ) : (
                  <div className="entrants-container">
                    {entrants.map((entrant, index) => (
                      <span key={index} className="entrant-item">{entrant}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {isOwner && !isListLocked && (
            <div className="pull-section">
              <h2>Pull a Winner</h2>
              <form className="structured-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="pullReward">Reward (optional):</label>
                  <input
                    id="pullReward"
                    type="text"
                    value={pullReward}
                    onChange={handlePullRewardChange}
                    placeholder="e.g. $100 Gift Card"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="pullRank">Rank (optional):</label>
                  <input
                    id="pullRank"
                    type="text"
                    value={pullRank}
                    onChange={handlePullRankChange}
                    placeholder="e.g. 1 (for 1st place)"
                    className="form-input"
                  />
                  <div className="help-text">
                    <small>Enter a number value (e.g. 1 for 1st place)</small>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="pullDescription">Description (optional):</label>
                  <textarea
                    id="pullDescription"
                    value={pullDescription}
                    onChange={handlePullDescriptionChange}
                    placeholder="e.g. First Place Prize"
                    className="form-input"
                    rows={2}
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={handlePullWinner}
                  disabled={isLoading}
                  className="pull-button"
                >
                  Pull Winner
                </button>
              </form>
            </div>
          )}
        </div>
        
        <div className="right-column">
          <div className="pulls-history-section">
            <h2>Pull History</h2>
            {/* Progress bar removed - now using inline spinner for each pending pull */}
            
            {/* Render the memoized pulls display content */}
            {pullsDisplayContent}
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
