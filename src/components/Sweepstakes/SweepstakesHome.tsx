import { useState, useEffect } from 'react';
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
    setEntrants,
    setSweepstakesDetails,
    registerSweepstakes,
    loadAllSweepstakes
  } = useSweepstakes();

  // Local state
  const [localError, setLocalError] = useState<string | null>(null);
  const [sweepstakesIdInput, setSweepstakesIdInput] = useState('');
  const [isJsonValid, setIsJsonValid] = useState(true);
  
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

  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSweepstakesForm({
      ...sweepstakesForm,
      [name]: value
    });
    
    // Convert form to JSON and update context
    const detailsJson = JSON.stringify({
      name: sweepstakesForm.name,
      description: sweepstakesForm.description,
      prize: sweepstakesForm.prize,
      endDate: sweepstakesForm.endDate,
      rules: sweepstakesForm.rules,
      maxEntrants: sweepstakesForm.maxEntrants ? parseInt(sweepstakesForm.maxEntrants) : undefined
    });
    
    setSweepstakesDetails(detailsJson);
    setIsJsonValid(true); // Form input should always generate valid JSON
  };

  // Handle entrants list change from the EntrantsForm component
  const handleEntrantsChange = (entrantsList: string[]) => {
    setEntrants(entrantsList);
  };

  // Handle "Go to Sweepstakes" button click
  const handleGoToSweepstakes = () => {
    if (sweepstakesIdInput.trim()) {
      navigate(`/sweepstakes/${sweepstakesIdInput.trim()}`);
    }
  };

  // Handle creation of new sweepstakes
  const handleCreateSweepstakes = async () => {
    setLocalError(null);
    
    // Validate entrants
    if (entrants.length === 0) {
      setLocalError('Please provide at least one entrant');
      return;
    }
    
    // Validate required fields
    if (!sweepstakesForm.name.trim()) {
      setLocalError('Please provide a name for your sweepstakes');
      return;
    }
    
    if (!sweepstakesForm.description.trim()) {
      setLocalError('Please provide a description for your sweepstakes');
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
        {ids.map((id) => (
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

      {/* User's Sweepstakes section */}
      {isConnected && (
        <div className="sweepstakes-section">
          <h2>Your Sweepstakes</h2>
          <div className="sweepstakes-list">
            {isLoading ? (
              <div className="loading">Loading your sweepstakes...</div>
            ) : (
              renderSweepstakesGrid(
                userSweepstakesIds, 
                "You don't have any sweepstakes yet. Create a new one below."
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
              allSweepstakesIds, 
              "There are no sweepstakes available yet."
            )
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
                    rows={4}
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
                  />
                </div>
              </div>
            </div>
            
            {localError && <div className="error-message">{localError}</div>}
            {error && <div className="error-message">{error}</div>}
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
