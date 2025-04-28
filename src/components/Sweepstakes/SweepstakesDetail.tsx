import { useState, useEffect } from 'react';
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
    client,
    isClientReady // Use the new client ready state
  } = useSweepstakes();
  
  const { sweepstakesId } = useParams<{ sweepstakesId: string }>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDetailsJsonValid, setIsDetailsJsonValid] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  // Load sweepstakes data when component mounts
  useEffect(() => {
    // Add very detailed logging about the URL parameter
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
      }
    };
    
    // Start the loading process with a small delay to ensure React Router has processed the URL
    const loadTimeout = setTimeout(attemptLoadSweepstakes, 100);
    
    // Clean up timeout if component unmounts
    return () => clearTimeout(loadTimeout);
  }, [sweepstakesId, currentSweepstakesId, client, isClientReady]);

  // Determine if the current user is the owner of this sweepstakes
  useEffect(() => {
    if (sweepstakesData) {
      // Compare user ID with the creator ID from sweepstakesData
      // This would be a real check in production code
      setIsOwner(isPaid);
      
      // Log detailed information about the sweepstakes for debugging
      console.log("Sweepstakes detail component data:", {
        sweepstakesId,
        currentSweepstakesId,
        sweepstakesData,
        isOwner: isPaid,
        entrantsCount: entrants.length,
        pullsCount: pulls.length,
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

  const handlePullDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPullDetails(e.target.value);
    
    // Validate JSON as user types
    if (!e.target.value.trim()) {
      // Empty is valid
      setIsDetailsJsonValid(true);
      return;
    }
    
    try {
      JSON.parse(e.target.value);
      setIsDetailsJsonValid(true);
    } catch (err) {
      setIsDetailsJsonValid(false);
    }
  };

  const handlePullWinner = async () => {
    setLocalError(null);
    
    // Validate details if provided
    if (pullDetails && !isDetailsJsonValid) {
      setLocalError('Please provide valid JSON for pull details');
      return;
    }
    
    try {
      await pullWinner();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to pull winner');
    }
  };

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
              <div className="form-group">
                <label htmlFor="pullDetails">Details JSON (optional):</label>
                <textarea
                  id="pullDetails"
                  value={pullDetails}
                  onChange={handlePullDetailsChange}
                  placeholder={'Enter details as JSON object, e.g. {"place": "1st", "prize": "$100"}'}
                  className={`json-input ${!isDetailsJsonValid && pullDetails ? 'invalid' : ''}`}
                  rows={4}
                />
                {!isDetailsJsonValid && pullDetails && (
                  <div className="validation-error">Please enter valid JSON</div>
                )}
              </div>
              <button 
                onClick={handlePullWinner}
                disabled={isLoading || (pullDetails && !isDetailsJsonValid)}
                className="pull-button"
              >
                Pull Winner
              </button>
            </div>
          )}
        </div>
        
        <div className="right-column">
          <div className="pulls-history-section">
            <h2>Pull History</h2>
            {pulls.length === 0 ? (
              <div className="no-pulls">No pulls have been made yet</div>
            ) : (
              <div className="pulls-container">
                {pulls.map((pull, index) => (
                  <div key={index} className="pull-item">
                    <div className="pull-header">
                      <div className="pull-winner">{pull.Winner || 'Unknown Winner'}</div>
                      <div className="pull-id">Pull #{index + 1}</div>
                    </div>
                    {/* Display available information from the pull */}
                    <div className="pull-details">
                      <div>Details: {pull.Details || 'No details available'}</div>
                    </div>
                  </div>
                ))}
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
