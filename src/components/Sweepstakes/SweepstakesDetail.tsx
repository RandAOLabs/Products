import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SweepstakesProvider, useSweepstakes } from '../../context/SweepstakesContext';
import { EntrantsForm } from './EntrantsForm';
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
    pullWinner
  } = useSweepstakes();
  
  const { sweepstakesId } = useParams<{ sweepstakesId: string }>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDetailsJsonValid, setIsDetailsJsonValid] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  // Load sweepstakes data when component mounts
  useEffect(() => {
    if (sweepstakesId && sweepstakesId !== currentSweepstakesId) {
      getSweepstakesById(sweepstakesId);
    }
  }, [sweepstakesId, currentSweepstakesId, getSweepstakesById]);

  // Determine if the current user is the owner of this sweepstakes
  useEffect(() => {
    if (sweepstakesData) {
      // Compare user ID with the creator ID from sweepstakesData
      // This would be a real check in production code
      setIsOwner(isPaid);
    }
  }, [sweepstakesData, isPaid]);

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

  // Format JSON for display
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
              <pre className="details-json">{formatJson(sweepstakesData?.Details)}</pre>
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
            ) : (
              isOwner && !isListLocked && (
                <div className="add-entrant-form">
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Enter a name"
                      value={newEntrantText}
                      onChange={(e) => setNewEntrantText(e.target.value)}
                      className="entrant-input"
                    />
                    <button 
                      onClick={handleAddEntrant}
                      disabled={isLoading || !newEntrantText.trim()}
                      className="add-button"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )
            )}
            
            <div className="entrants-list">
              {entrants.length === 0 ? (
                <div className="no-entrants">No entrants available</div>
              ) : (
                <div className="entrants-container">
                  {entrants.map((entrant, index) => (
                    <div key={index} className="entrant-item">
                      {entrant}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                      <div className="pull-id">ID: {pull.Id}</div>
                    </div>
                    {/* RafflePull doesn't have a Details property directly,
                        so we display other available information */}
                    <div className="pull-details">
                      <div>User: {pull.User}</div>
                      <div>Callback ID: {pull.CallbackId}</div>
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
