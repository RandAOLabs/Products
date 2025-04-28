import { Link } from 'react-router-dom';
import './HomePage.css';

export const HomePage = () => {
  return (
    <div className="home-page">
      <div className="hero-section">
        <h1>Welcome to Sweepstakes</h1>
        <p>Create, manage, and participate in sweepstakes on the AO network.</p>
        <Link to="/sweepstakes" className="action-button">
          Enter Sweepstakes
        </Link>
      </div>
    </div>
  );
};
