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
    pulls,
    newEntrantText,
    setNewEntrantText,
    pullDetails,
    setPullDetails,
    pullWinner,
    refreshPulls, // Add the refreshPulls function
    client,
    isClientReady // Use the new client ready state
  } = useSweepstakes();
  
  const { sweepstakesId } = useParams<{ sweepstakesId: string }>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [pullReward, setPullReward] = useState<string>('');
  const [pullRank, setPullRank] = useState<string>('');
  const [pullDescription, setPullDescription] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const didInitialRefresh = useRef<boolean>(false); // Track if we've done the initial refresh
  const [progress, setProgress] = useState<number>(0); // For progress bar
  const [showProgress, setShowProgress] = useState<boolean>(false); // Toggle progress bar visibility
  
  // Memoized pulls display logic - moved to top level to comply with Rules of Hooks
  const pullsDisplayContent = useMemo(() => {
    // Use pulls from context state first
    let availablePulls = pulls || [];
    
    // If no pulls in context but they exist in sweepstakesData, use those
    if (availablePulls.length === 0 && sweepstakesData?.Pulls && sweepstakesData.Pulls.length > 0) {
      // Only log this once when the component renders, not on every input change
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Using pulls from sweepstakesData directly for display');
      }
      availablePulls = sweepstakesData.Pulls;
    }
    
    if (availablePulls.length === 0) {
      return <div className="no-pulls">No pulls have been made yet</div>;
    }
    
    return (
      <div className="pulls-container">
        {availablePulls.map((pull, index) => {
          // Try to parse details if they exist
          let parsedDetails = null;
          try {
            if (pull.Details) {
              parsedDetails = JSON.parse(pull.Details);
            }
          } catch (e) {
            // Keep parsedDetails as null if parsing fails
          }
                                  
          return (
            <div key={index} className="pull-item">
              <div className="pull-header">
                <div className="pull-winner">{pull.Winner || 'Unknown Winner'}</div>
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
  }, [pulls, sweepstakesData?.Pulls]); // Only re-render when pulls or sweepstakesData.Pulls change
  
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

  // Function to run progress bar for data refresh
  const runProgressBar = useCallback(async (callback: () => Promise<void>) => {
    setShowProgress(true);
    setProgress(0);
    
    // Start progress bar animation
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (elapsed < duration) {
        requestAnimationFrame(updateProgress);
      } else {
        // When progress bar completes, call the callback function
        callback().then(() => {
          console.log('✅ Data refresh completed');
          setShowProgress(false);
        }).catch(error => {
          console.error('❌ Error during data refresh:', error);
          setShowProgress(false);
        });
      }
    };
    
    requestAnimationFrame(updateProgress);
  }, []);
  
  // Handler for pull winner button
  const handlePullWinner = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent form submission and page refresh
    setLocalError(null);
    
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
    
    // Convert object to JSON string and set pull details
    const detailsJson = Object.keys(detailsObj).length > 0 ? JSON.stringify(detailsObj) : '';
    console.log('📝 Constructed pull details JSON:', detailsJson);
    
    // Set the JSON string to context before calling pullWinner
    setPullDetails(detailsJson);
    
    try {
      console.log('🔄 Calling pullWinner function');
      await pullWinner();
      console.log('✅ Pull winner completed successfully');
      
      // Clear form fields after successful pull
      setPullReward('');
      setPullRank('');
      setPullDescription('');
      
      // Start the progress bar for data refresh
      runProgressBar(async () => {
        console.log('🔄 Refreshing pulls data after pull winner...');
        await refreshPulls();
      });
    } catch (err) {
      console.error('❌ Pull winner error:', err);
      setLocalError(err instanceof Error ? err.message : 'Failed to pull winner');
    }
  }, [pullReward, pullRank, pullDescription, pullWinner, refreshPulls, runProgressBar]);

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
            {/* Render progress bar when visible */}
            {showProgress && (
              <div className="progress-bar-container">
                <div className="progress-bar-label">Refreshing data...</div>
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
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
