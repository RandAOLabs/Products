import { useSweepstakes } from '../../../context/SweepstakesContext';
import { SweepstakesPull } from 'ao-process-clients';
import './PullsHistory.css';

// Helper function to safely access object properties
const getProperty = (obj: any, key: string, fallback: any = 'Unknown') => {
  if (!obj) return fallback;
  // Try different casing conventions
  const possibleKeys = [
    key, // As is
    key.toLowerCase(), // lowercase
    key.toUpperCase(), // UPPERCASE
    key.charAt(0).toUpperCase() + key.slice(1), // PascalCase
    key.charAt(0).toLowerCase() + key.slice(1), // camelCase
  ];
  
  for (const possibleKey of possibleKeys) {
    if (possibleKey in obj) {
      return obj[possibleKey];
    }
  }
  
  return fallback;
};

export const PullsHistory = () => {
  const { pulls, isLoading, refreshPulls } = useSweepstakes();

  // Format date for display
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown date';
    return new Date(timestamp).toLocaleString();
  };

  const handleRefresh = async () => {
    await refreshPulls();
  };

  // Ensure pulls is an array before using map
  const pullsArray = Array.isArray(pulls) ? pulls : [];

  return (
    <div className="pulls-history">
      <div className="header">
        <h2>Pull History</h2>
        <button onClick={handleRefresh} disabled={isLoading} className="refresh-button">
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {pullsArray.length === 0 ? (
        <div className="no-pulls-message">
          No pulls have been made yet. Register and pull a winner to see results here.
        </div>
      ) : (
        <div className="pulls-list">
          {pullsArray.map((pull, index) => {
            // Safely extract properties
            const pullId = getProperty(pull, 'pullId');
            const timestamp = getProperty(pull, 'timestamp');
            const winner = getProperty(pull, 'winner');
            const entrantsCount = getProperty(pull, 'entrantsCount');
            
            return (
              <div key={pullId !== 'Unknown' ? pullId : index} className="pull-item">
                <div className="pull-header">
                  <span className="pull-number">Pull #{pullsArray.length - index}</span>
                  <span className="pull-date">
                    {timestamp !== 'Unknown' ? formatDate(timestamp as number) : 'Unknown date'}
                  </span>
                </div>
                <div className="pull-winner">
                  <span className="label">Winner:</span>
                  <span className="winner-name">{winner}</span>
                </div>
                <div className="pull-details">
                  <div className="entrants-count">
                    <span className="label">Entrants:</span>
                    <span>{entrantsCount}</span>
                  </div>
                  <div className="pull-id">
                    <span className="label">ID:</span>
                    <span className="id">{pullId}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
