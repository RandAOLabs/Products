import { useState } from 'react';
import { useSweepstakes } from '../../../context/SweepstakesContext';
import './SweepstakesControls.css';

export const SweepstakesControls = () => {
  const { isPaid, isLoading, error, entrants, registerSweepstakes, pullWinner } = useSweepstakes();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRegister = async () => {
    setLocalError(null);
    if (entrants.length === 0) {
      setLocalError('You need to add entrants before registering');
      return;
    }
    
    try {
      await registerSweepstakes();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to register sweepstakes');
    }
  };

  const handlePull = async () => {
    setLocalError(null);
    if (!isPaid) {
      setLocalError('You need to register with payment first');
      return;
    }
    
    if (entrants.length === 0) {
      setLocalError('No entrants available for drawing');
      return;
    }
    
    try {
      await pullWinner();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to pull winner');
    }
  };

  return (
    <div className="sweepstakes-controls">
      <h2>Sweepstakes Controls</h2>
      
      <div className="status-indicator">
        <span className="status-label">Status:</span>
        <span className={`status-value ${isPaid ? 'paid' : 'unpaid'}`}>
          {isPaid ? 'Paid ✓' : 'Not Paid ✗'}
        </span>
      </div>
      
      <div className="controls-buttons">
        {!isPaid && (
          <button 
            onClick={handleRegister} 
            disabled={isLoading || entrants.length === 0}
            className="register-button"
          >
            {isLoading ? 'Processing...' : 'Register & Pay'}
          </button>
        )}
        
        <button 
          onClick={handlePull} 
          disabled={isLoading || !isPaid || entrants.length === 0}
          className="pull-button"
        >
          {isLoading ? 'Pulling...' : 'Pull Winner'}
        </button>
      </div>
      
      {(error || localError) && (
        <div className="error-message">
          {error || localError}
        </div>
      )}
      
      <div className="payment-info">
        {!isPaid && (
          <p>
            Registration requires a one-time payment. 
            After paying, you can pull winners from your entrants list.
          </p>
        )}
      </div>
    </div>
  );
};
