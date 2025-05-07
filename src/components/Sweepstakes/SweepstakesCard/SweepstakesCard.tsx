import React from 'react';
import { Link } from 'react-router-dom';
import './SweepstakesCard.css';

interface SweepstakesCardDetails {
  name: string;
  description: string;
  prize: string;
  endDate: string;
  isValid: boolean;
  isLoaded: boolean;
}

interface SweepstakesCardProps {
  id: string;
  details: SweepstakesCardDetails;
}

export const SweepstakesCard: React.FC<SweepstakesCardProps> = ({ id, details }) => {
  const isMalformed = !details.isValid;
  
  return (
    <Link 
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
