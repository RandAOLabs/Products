import { SweepstakesProvider } from '../../context/SweepstakesContext';
import { EntrantsForm } from './EntrantsForm';
import { PullsHistory } from './PullsHistory';
import { SweepstakesControls } from './SweepstakesControls';
import './Sweepstakes.css';

export const Sweepstakes = () => {
  return (
    <SweepstakesProvider>
      <div className="sweepstakes-container">
        <div className="sweepstakes-header">
          <h1>Sweepstakes</h1>
          <p className="description">
            Enter a list of names, register with payment, and pull winners randomly.
          </p>
        </div>
        
        <div className="sweepstakes-content">
          <div className="left-column">
            <EntrantsForm />
            <SweepstakesControls />
          </div>
          
          <div className="right-column">
            <PullsHistory />
          </div>
        </div>
      </div>
    </SweepstakesProvider>
  );
};
