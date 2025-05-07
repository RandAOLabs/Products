import { useState, useEffect } from 'react';
import { useSweepstakes } from '../../context/SweepstakesContext';
import { Link } from 'react-router-dom';
import { SweepstakesCard } from './SweepstakesCard';
import './SweepstakesAdmin.css';

export const SweepstakesAdmin = () => {
  const {
    isLoading,
    client,
    allSweepstakesIds,
    loadAllSweepstakes
  } = useSweepstakes();

  // Local state
  const [selectedSweepstakes, setSelectedSweepstakes] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Load sweepstakes on component mount
  useEffect(() => {
    loadAllSweepstakes();
  }, []);

  // Load sweepstakes details for all IDs
  useEffect(() => {
    const loadSweepstakesDetails = async () => {
      if (!client) return;
      
      // Process in batches to avoid overloading
      for (const id of allSweepstakesIds) {
        // Skip already loaded sweepstakes
        if (sweepstakesCache[id]?.isLoaded) continue;
        
        try {
          const sweepstakes = await client.viewSweepstakes(id);
          
          // Default values if no details
          let name = 'Untitled';
          let description = 'No description';
          let prize = 'N/A';
          let endDate = 'N/A';
          let isValid = true; // Always show all sweepstakes in admin view
          
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
              isValid: true,
              isLoaded: true
            }
          }));
        }
      }
    };
    
    loadSweepstakesDetails();
  }, [client, allSweepstakesIds]);

  // Handle sweepstakes selection
  const toggleSelection = (id: string) => {
    setSelectedSweepstakes(prev => 
      prev.includes(id)
        ? prev.filter(sweepId => sweepId !== id)
        : [...prev, id]
    );
  };

  // Handle sweepstakes deletion
  const handleDeleteSelected = async () => {
    if (!client || selectedSweepstakes.length === 0) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedSweepstakes) {
        try {
          // Call the deleteSweepstakesData function from the client
          await client.deleteSweepstakesData(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete sweepstakes ${id}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`Successfully deleted ${successCount} sweepstakes.`);
        setSelectedSweepstakes([]);
        loadAllSweepstakes(); // Refresh the list
      }

      if (failCount > 0) {
        setError(`Failed to delete ${failCount} sweepstakes.`);
      }
    } catch (err) {
      setError(`An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Render a selectable sweepstakes card
  const renderSelectableSweepstakesCard = (id: string) => {
    const details = sweepstakesCache[id] || {
      name: 'Loading...',
      description: '',
      prize: 'N/A',
      endDate: 'N/A',
      isValid: true,
      isLoaded: false
    };
    
    const isSelected = selectedSweepstakes.includes(id);
    
    return (
      <div key={id} className="selectable-card-container">
        <div 
          className={`selection-overlay ${isSelected ? 'selected' : ''}`}
          onClick={() => toggleSelection(id)}
        >
          <div className="selection-checkbox">
            {isSelected && <span className="checkmark">✓</span>}
          </div>
        </div>
        <SweepstakesCard id={id} details={details} />
      </div>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Sweepstakes Admin</h1>
        <p className="description">
          Manage all sweepstakes entries
        </p>
      </div>

      <div className="admin-actions">
        <button 
          className="delete-button"
          disabled={selectedSweepstakes.length === 0 || isDeleting}
          onClick={handleDeleteSelected}
        >
          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedSweepstakes.length})`}
        </button>
        <Link to="/sweepstakes" className="back-button">
          Back to Sweepstakes
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-content">
        <h2>All Sweepstakes</h2>
        <div className="sweepstakes-list">
          {isLoading ? (
            <div className="loading">Loading sweepstakes...</div>
          ) : allSweepstakesIds.length === 0 ? (
            <div className="no-sweepstakes">
              No sweepstakes available.
            </div>
          ) : (
            <div className="sweepstakes-grid">
              {allSweepstakesIds.map(renderSelectableSweepstakesCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
