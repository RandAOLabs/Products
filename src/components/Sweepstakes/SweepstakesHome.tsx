import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SweepstakesProvider, useSweepstakes } from '../../context/SweepstakesContext';
import './SweepstakesHome.css';

// This component will be wrapped with SweepstakesProvider in the parent
const SweepstakesHomeContent = () => {
  const { 
    allSweepstakesIds, 
    loadAllSweepstakes, 
    isLoading, 
    getSweepstakesById,
    sweepstakesDetails,
    setSweepstakesDetails,
    entrants, 
    setEntrants,
    registerSweepstakes,
    error
  } = useSweepstakes();

  const navigate = useNavigate();
  const [sweepstakesIdInput, setSweepstakesIdInput] = useState('');
  const [entrantsJson, setEntrantsJson] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [isEntrantsJsonValid, setIsEntrantsJsonValid] = useState(true);
  
  // Load all sweepstakes on component mount
  useEffect(() => {
    loadAllSweepstakes();
  }, []); // Empty dependency array to run only on mount

  // Navigate to the specified sweepstakes
  const handleGoToSweepstakes = () => {
    if (!sweepstakesIdInput.trim()) {
      setLocalError('Please enter a valid Sweepstakes ID');
      return;
    }

    setLocalError(null);
    navigate(`/sweepstakes/${sweepstakesIdInput.trim()}`);
  };

  // Handle changes to the details JSON
  const handleDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSweepstakesDetails(e.target.value);
    
    // Validate JSON as user types
    if (!e.target.value.trim()) {
      // Empty is valid (we'll use default empty object)
      setIsJsonValid(true);
      return;
    }
    
    try {
      JSON.parse(e.target.value);
      setIsJsonValid(true);
    } catch (err) {
      setIsJsonValid(false);
    }
  };

  // Handle changes to the entrants JSON
  const handleEntrantsJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntrantsJson(e.target.value);
    
    if (!e.target.value.trim()) {
      setIsEntrantsJsonValid(false);
      return;
    }
    
    try {
      const parsed = JSON.parse(e.target.value);
      // Check if it's an array
      if (Array.isArray(parsed)) {
        setIsEntrantsJsonValid(true);
        // Update entrants in context
        setEntrants(parsed);
      } else {
        setIsEntrantsJsonValid(false);
      }
    } catch (err) {
      setIsEntrantsJsonValid(false);
    }
  };

  // Handle creation of new sweepstakes
  const handleCreateSweepstakes = async () => {
    setLocalError(null);
    
    // Validate entrants
    if (!entrantsJson.trim() || !isEntrantsJsonValid) {
      setLocalError('Please provide a valid JSON array of entrants');
      return;
    }
    
    // Validate details if provided
    if (sweepstakesDetails.trim() && !isJsonValid) {
      setLocalError('Please provide valid JSON for details');
      return;
    }
    
    try {
      const sweepstakesId = await registerSweepstakes();
      if (sweepstakesId) {
        navigate(`/sweepstakes/${sweepstakesId}`);
      } else {
        setLocalError('Failed to create sweepstakes. Please try again.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create sweepstakes');
    }
  };

  return (
    <div className="sweepstakes-home">
      <div className="sweepstakes-home-header">
        <h1>AO Sweepstakes</h1>
        <p className="description">
          View, create, and manage your sweepstakes
        </p>
      </div>

      {/* User's Sweepstakes section */}
      <div className="sweepstakes-section">
        <h2>Your Sweepstakes</h2>
        <div className="sweepstakes-list">
          {isLoading ? (
            <div className="loading">Loading sweepstakes...</div>
          ) : allSweepstakesIds.length === 0 ? (
            <div className="no-sweepstakes">
              You don't have any sweepstakes yet. Create a new one below or
              enter a specific sweepstakes ID to view someone else's sweepstakes.
            </div>
          ) : (
            <div className="sweepstakes-grid">
              {allSweepstakesIds.map((id) => (
                <Link 
                  key={id} 
                  to={`/sweepstakes/${id}`}
                  className="sweepstakes-card"
                >
                  <div className="sweepstakes-card-id">{id}</div>
                  <div className="sweepstakes-card-action">View Details →</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Find sweepstakes section */}
      <div className="sweepstakes-section">
        <h2>Find a Sweepstakes</h2>
        <p>Enter a sweepstakes ID to view or participate in someone else's sweepstakes.</p>
        <div className="search-container">
          <input
            type="text"
            placeholder="Enter Sweepstakes ID"
            value={sweepstakesIdInput}
            onChange={(e) => setSweepstakesIdInput(e.target.value)}
            className="sweepstakes-id-input"
          />
          <button 
            onClick={handleGoToSweepstakes}
            disabled={isLoading || !sweepstakesIdInput.trim()}
            className="search-button"
          >
            {isLoading ? 'Loading...' : 'Go to Sweepstakes'}
          </button>
        </div>
      </div>
      
      {/* Create sweepstakes section */}
      <div className="sweepstakes-section">
        <h2>Create New Sweepstakes</h2>
        <p>Create a new sweepstakes by providing a list of entrants and optional details.</p>
        <div className="create-container">
          <div className="form-group">
            <label htmlFor="entrantsJson">Entrants JSON Array:</label>
            <textarea
              id="entrantsJson"
              value={entrantsJson}
              onChange={handleEntrantsJsonChange}
              placeholder={'Enter JSON array of entrants, e.g. ["John", "Jane", "Alex"]'}
              className={`json-input ${!isEntrantsJsonValid && entrantsJson ? 'invalid' : ''}`}
              rows={6}
            />
            {!isEntrantsJsonValid && entrantsJson && (
              <div className="validation-error">Please enter a valid JSON array</div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="detailsJson">Details JSON (optional):</label>
            <textarea
              id="detailsJson"
              value={sweepstakesDetails}
              onChange={handleDetailsChange}
              placeholder={'Enter details as JSON object, e.g. {"name": "Monthly Drawing", "prize": "$100"}'}
              className={`json-input ${!isJsonValid && sweepstakesDetails ? 'invalid' : ''}`}
              rows={6}
            />
            {!isJsonValid && sweepstakesDetails && (
              <div className="validation-error">Please enter valid JSON</div>
            )}
          </div>
          
          <button 
            onClick={handleCreateSweepstakes}
            disabled={isLoading || !isEntrantsJsonValid || (sweepstakesDetails && !isJsonValid)}
            className="create-button"
          >
            {isLoading ? 'Creating...' : 'Create New Sweepstakes'}
          </button>
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

export const SweepstakesHome = () => {
  return (
    <SweepstakesProvider>
      <SweepstakesHomeContent />
    </SweepstakesProvider>
  );
};
