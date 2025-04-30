import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SweepstakesProvider, useSweepstakes } from '../../context/SweepstakesContext';
import { useWallet } from '../../context/WalletContext';
import { EntrantsForm } from './EntrantsForm/EntrantsForm';
import './SweepstakesHome.css';

// This component will be wrapped with SweepstakesProvider in the parent
const SweepstakesHomeContent = () => {
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const {
    isLoading,
    error,
    entrants,
    allSweepstakesIds,
    userSweepstakesIds,
    sweepstakesDetails,
    client,
    setEntrants,
    setSweepstakesDetails,
    registerSweepstakes,
    loadAllSweepstakes
  } = useSweepstakes();

  // Local state
  const [localError, setLocalError] = useState<string | null>(null);
  const [sweepstakesIdInput, setSweepstakesIdInput] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [showMalformedSweepstakes, setShowMalformedSweepstakes] = useState(false);
  
  // States for storing sweepstakes details and validity
  const [sweepstakesCache, setSweepstakesCache] = useState<{
    [id: string]: {
      name: string;
      description: string;
      prize: string;
      endDate: string;
      isValid: boolean;
      isLoaded: boolean;
    }
  }>({});
  
  // New state for form fields
  const [sweepstakesForm, setSweepstakesForm] = useState({
    name: '',
    description: '',
    prize: '',
    endDate: '',
    rules: '',
    maxEntrants: ''
  });

  // Load sweepstakes on component mount if wallet is connected
  useEffect(() => {
    if (isConnected) {
      loadAllSweepstakes();
    }
  }, [isConnected]);

  // Load sweepstakes details for all IDs
  useEffect(() => {
    const loadSweepstakesDetails = async () => {
      if (!client) return;
      
      // Combine all IDs to load
      const allIds = [...new Set([...allSweepstakesIds, ...userSweepstakesIds])];
      
      // Process in batches to avoid overloading
      for (const id of allIds) {
        // Skip already loaded sweepstakes
        if (sweepstakesCache[id]?.isLoaded) continue;
        
        try {
          const sweepstakes = await client.viewSweepstakes(id);
          
          // Default values if no details
          let name = 'Untitled';
          let description = 'No description';
          let prize = 'N/A';
          let endDate = 'N/A';
          let isValid = false;
          
          // Parse details if available
          if (sweepstakes && sweepstakes.Details) {
            try {
              const details = JSON.parse(sweepstakes.Details);
              
              name = details?.name?.trim() || 'Untitled';
              description = details?.description?.trim() || 'No description';
              prize = details?.prize?.trim() || 'N/A';
              
              if (details?.endDate) {
                try {
                  const date = new Date(details.endDate);
                  endDate = date.toLocaleDateString();
                } catch (e) {
                  endDate = details.endDate;
                }
              }
              
              // A sweepstakes is valid if it has both name and description
              isValid = !!(details?.name?.trim() && details?.description?.trim());
              
              console.log(`Sweepstakes ${id} validity:`, {
                name,
                description,
                isValid,
                rawDetails: sweepstakes.Details
              });
            } catch (e) {
              console.error(`Error parsing details for sweepstakes ${id}:`, e);
            }
          }
          
          // Cache the details
          setSweepstakesCache(prev => ({
            ...prev,
            [id]: {
              name,
              description: description.length > 100 ? `${description.substring(0, 97)}...` : description,
              prize,
              endDate,
              isValid,
              isLoaded: true
            }
          }));
        } catch (e) {
          console.error(`Error loading details for sweepstakes ${id}:`, e);
          // Cache the error state
          setSweepstakesCache(prev => ({
            ...prev,
            [id]: {
              name: 'Error',
              description: 'Failed to load details',
              prize: 'N/A',
              endDate: 'N/A',
              isValid: false,
              isLoaded: true
            }
          }));
        }
      }
    };
    
    loadSweepstakesDetails();
  }, [client, allSweepstakesIds, userSweepstakesIds]);

  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSweepstakesForm({
      ...sweepstakesForm,
      [name]: value
    });
  };

  // Handle entrants data from EntrantsForm
  const handleEntrantsChange = (entrants: string[]) => {
    setEntrants(entrants);
  };

  // Go to a specific sweepstakes
  const handleGoToSweepstakes = () => {
    if (sweepstakesIdInput.trim()) {
      navigate(`/sweepstakes/${sweepstakesIdInput.trim()}`);
    }
  };

  // Create a new sweepstakes
  const handleCreateSweepstakes = async () => {
    if (entrants.length === 0) {
      setLocalError('Please add at least one entrant');
      return;
    }
    
    // Validate required fields
    if (!sweepstakesForm.name.trim()) {
      setLocalError('Name is required');
      return;
    }
    
    if (!sweepstakesForm.description.trim()) {
      setLocalError('Description is required');
      return;
    }
    
    // Prepare the details as a JSON string
    const details = JSON.stringify({
      name: sweepstakesForm.name,
      description: sweepstakesForm.description,
      prize: sweepstakesForm.prize,
      endDate: sweepstakesForm.endDate,
      rules: sweepstakesForm.rules,
      maxEntrants: sweepstakesForm.maxEntrants ? parseInt(sweepstakesForm.maxEntrants) : undefined
    });
    
    // Update the sweepstakesDetails in the context
    setSweepstakesDetails(details);
    
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

  // Filter sweepstakes based on the showMalformedSweepstakes setting
  const filteredUserSweepstakesIds = useMemo(() => {
    return userSweepstakesIds.filter(id => 
      showMalformedSweepstakes || sweepstakesCache[id]?.isValid
    );
  }, [userSweepstakesIds, sweepstakesCache, showMalformedSweepstakes]);

  const filteredAllSweepstakesIds = useMemo(() => {
    return allSweepstakesIds.filter(id => 
      showMalformedSweepstakes || sweepstakesCache[id]?.isValid
    );
  }, [allSweepstakesIds, sweepstakesCache, showMalformedSweepstakes]);

  // Helper function to render a sweepstakes card
  const renderSweepstakesCard = (id: string) => {
    const details = sweepstakesCache[id] || {
      name: 'Loading...',
      description: '',
      prize: 'N/A',
      endDate: 'N/A',
      isValid: false,
      isLoaded: false
    };
    
    const isMalformed = !details.isValid;
    
    return (
      <Link 
        key={id} 
        to={`/sweepstakes/${id}`}
        className={`sweepstakes-card ${isMalformed ? 'malformed' : ''}`}
      >
        <div className="sweepstakes-card-header">
          <h3 className="sweepstakes-card-title">{details.name}</h3>
          {isMalformed && <span className="malformed-tag">Malformed</span>}
        </div>
        <div className="sweepstakes-card-description">{details.description}</div>
        <div className="sweepstakes-card-details">
          <div className="sweepstakes-card-detail">
            <span className="detail-label">Prize:</span>
            <span className="detail-value">{details.prize}</span>
          </div>
          <div className="sweepstakes-card-detail">
            <span className="detail-label">End Date:</span>
            <span className="detail-value">{details.endDate}</span>
          </div>
        </div>
        <div className="sweepstakes-card-footer">
          <div className="sweepstakes-card-id">{id.substring(0, 8)}...</div>
          <div className="sweepstakes-card-action">View Details →</div>
        </div>
      </Link>
    );
  };

  // Helper function to render a sweepstakes grid
  const renderSweepstakesGrid = (ids: string[], emptyMessage: string) => {
    if (ids.length === 0) {
      return (
        <div className="no-sweepstakes">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="sweepstakes-grid">
        {ids.map(renderSweepstakesCard)}
      </div>
    );
  };

  return (
    <div className="sweepstakes-home">
      <div className="sweepstakes-home-header">
        <h1>AO Sweepstakes</h1>
        <p className="description">
          View, create, and manage your sweepstakes
        </p>
      </div>
      
      {/* Filter options DO NOT REMOVE */}
      {/* <div className="filter-options">
        <label className="checkbox-label">
          <input 
            type="checkbox" 
            checked={showMalformedSweepstakes} 
            onChange={e => setShowMalformedSweepstakes(e.target.checked)}
          />
          Show Malformed Sweepstakes
        </label>
        <p className="filter-description">
          {showMalformedSweepstakes 
            ? 'Showing all sweepstakes, including those without name or description.' 
            : 'Hiding sweepstakes that are missing name or description.'}
        </p>
      </div> */}

      {/* User's Sweepstakes section */}
      {isConnected && (
        <div className="sweepstakes-section">
          <h2>Your Sweepstakes</h2>
          <div className="sweepstakes-list">
            {isLoading ? (
              <div className="loading">Loading your sweepstakes...</div>
            ) : (
              renderSweepstakesGrid(
                filteredUserSweepstakesIds, 
                userSweepstakesIds.length > 0 && filteredUserSweepstakesIds.length === 0
                  ? 'All your sweepstakes are malformed. Enable "Show Malformed Sweepstakes" to view them.'
                  : "You don't have any sweepstakes yet. Create a new one below."
              )
            )}
          </div>
        </div>
      )}

      {/* All Sweepstakes section */}
      <div className="sweepstakes-section">
        <h2>All Sweepstakes</h2>
        <div className="sweepstakes-list">
          {isLoading ? (
            <div className="loading">Loading sweepstakes...</div>
          ) : (
            renderSweepstakesGrid(
              filteredAllSweepstakesIds, 
              allSweepstakesIds.length > 0 && filteredAllSweepstakesIds.length === 0
                ? 'All sweepstakes are malformed. Enable "Show Malformed Sweepstakes" to view them.'
                : "There are no sweepstakes available yet."
            )
          )}
        </div>
      </div>

      {/* Find sweepstakes section DO NOT REMOVE */}
      {/* <div className="sweepstakes-section">
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
      </div> */}
      
      {/* Create sweepstakes section */}
      <div className="sweepstakes-section">
        <h2>Create New Sweepstakes</h2>
        <p>Create a new sweepstakes by providing a list of entrants and optional details.</p>
        
        {!isConnected ? (
          <div className="connect-wallet-notice">
            Please connect your wallet to create a sweepstakes.
          </div>
        ) : (
          <div className="create-container">
            {/* Use the EntrantsForm component for entrants input */}
            <EntrantsForm 
              mode="create"
              onEntrantsChange={handleEntrantsChange}
              onSubmit={handleCreateSweepstakes}
              title="Entrants List"
              buttonText="Create Sweepstakes"
            />
            
            <div className="form-group">
              <label>Sweepstakes Details:</label>
              <div className="form-fields">
                <div className="form-field required-field">
                  <label>Name:</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={sweepstakesForm.name} 
                    onChange={handleFormChange} 
                    className="form-input"
                    placeholder="Enter sweepstakes name"
                    required
                  />
                </div>
                <div className="form-field required-field">
                  <label>Description:</label>
                  <textarea 
                    name="description" 
                    value={sweepstakesForm.description} 
                    onChange={handleFormChange} 
                    className="form-input"
                    rows={4}
                    placeholder="Describe your sweepstakes"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Prize:</label>
                  <input 
                    type="text" 
                    name="prize" 
                    value={sweepstakesForm.prize} 
                    onChange={handleFormChange} 
                    className="form-input"
                    placeholder="What's the prize? (optional)"
                  />
                </div>
                <div className="form-field">
                  <label>End Date:</label>
                  <input 
                    type="date" 
                    name="endDate" 
                    value={sweepstakesForm.endDate} 
                    onChange={handleFormChange} 
                    className="form-input"
                  />
                </div>
                <div className="form-field">
                  <label>Rules:</label>
                  <textarea 
                    name="rules" 
                    value={sweepstakesForm.rules} 
                    onChange={handleFormChange} 
                    className="form-input"
                    rows={3}
                    placeholder="Rules for the sweepstakes (optional)"
                  />
                </div>
                <div className="form-field">
                  <label>Max Entrants:</label>
                  <input 
                    type="number" 
                    name="maxEntrants" 
                    value={sweepstakesForm.maxEntrants} 
                    onChange={handleFormChange} 
                    className="form-input"
                    placeholder="Maximum number of entrants (optional)"
                    min="1"
                  />
                </div>
              </div>
            </div>
            
            {localError && <div className="error-message">{localError}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

// The parent component that wraps the content with the SweepstakesProvider
const SweepstakesHome = () => {
  return (
    <SweepstakesProvider>
      <SweepstakesHomeContent />
    </SweepstakesProvider>
  );
};

export default SweepstakesHome;
