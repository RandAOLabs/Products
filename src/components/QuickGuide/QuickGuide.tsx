import { useState } from 'react';
import './QuickGuide.css';

export const QuickGuide = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleGuide = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`quick-guide ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="guide-header" onClick={toggleGuide}>
        <h2>How It Works</h2>
        <button className="toggle-button" aria-label={isExpanded ? 'Collapse guide' : 'Expand guide'}>
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          )}
        </button>
      </div>
      
      <div className="guide-content">
        <div className="guide-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Enter Participants</h3>
              <p>Add names to the entrants list. You can enter one name per line or separate multiple names with commas.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Register & Pay</h3>
              <p>Connect your wallet and click the "Register & Pay" button to set up the sweepstakes. This is a one-time payment.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Pull Winners</h3>
              <p>Once registered, click "Pull Winner" to randomly select a winner from your list of entrants.</p>
            </div>
          </div>
          
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>View Results</h3>
              <p>See all winners and their details in the Pull History section. You can pull multiple winners over time.</p>
            </div>
          </div>
        </div>
        
        <div className="guide-tips">
          <h3>Tips:</h3>
          <ul>
            <li>You can update your entrants list at any time by editing the names and clicking "Update List".</li>
            <li>Each draw is recorded on the blockchain for transparency and verification.</li>
            <li>Winners are selected using cryptographically secure randomness.</li>
            <li>The same person can win multiple times if they remain in the entrants list for subsequent draws.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
