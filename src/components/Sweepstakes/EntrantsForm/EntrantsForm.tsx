import { useState, useEffect } from 'react';
import { useSweepstakes } from '../../../context/SweepstakesContext';
import './EntrantsForm.css';

export const EntrantsForm = () => {
  const { entrants, setEntrants, updateEntrants, error, isLoading } = useSweepstakes();
  const [inputText, setInputText] = useState('');
  const [parsedEntrants, setParsedEntrants] = useState<string[]>([]);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info' | null}>({
    message: '',
    type: null
  });

  // Update input text when entrants change
  useEffect(() => {
    if (entrants.length > 0) {
      setInputText(entrants.join('\n'));
      setParsedEntrants(entrants);
    }
  }, [entrants]);

  // Parse input text to get entrants list
  const parseInput = (text: string): string[] => {
    // First split by new lines
    const lines = text.split('\n');
    
    // Process each line and handle comma-separated values
    const results: string[] = [];
    
    lines.forEach(line => {
      // Check if the line contains commas
      if (line.includes(',')) {
        // Split by comma and add each non-empty item
        line.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0)
          .forEach(item => results.push(item));
      } else {
        // If no commas, add the line if it's not empty
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          results.push(trimmed);
        }
      }
    });
    
    // Remove duplicates
    return [...new Set(results)];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    setParsedEntrants(parseInput(newText));
  };

  const handleUpdate = async () => {
    // Get the parsed entrants
    const newEntrants = parsedEntrants;
    
    // Update notification state
    setNotification({ message: '', type: null });
    
    // Update context state
    setEntrants(newEntrants);
    
    // Send updates to the server and provide feedback
    if (newEntrants.length > 0) {
      try {
        await updateEntrants();
        setNotification({ 
          message: `Successfully updated ${newEntrants.length} entrants`, 
          type: 'success' 
        });
      } catch (err) {
        setNotification({ 
          message: 'Failed to update entrants', 
          type: 'error' 
        });
      }
    } else {
      setNotification({ 
        message: 'No entrants to update', 
        type: 'info' 
      });
    }
    
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNotification({ message: '', type: null });
    }, 5000);
  };

  return (
    <div className="entrants-form">
      <h2>Entrants List</h2>
      <p className="form-info">Enter names (one per line or separated by commas)</p>
      
      <div className="input-container">
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="Enter names (one per line or comma-separated)"
          rows={10}
          disabled={isLoading}
        />
        
        {parsedEntrants.length > 0 && (
          <div className="parsed-preview">
            <h3>Preview ({parsedEntrants.length} entrants)</h3>
            <div className="entrants-chips">
              {parsedEntrants.map((entrant, index) => (
                <span key={index} className="entrant-chip">
                  {entrant}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="form-actions">
        <div className="entrants-count">
          Total entries: {parsedEntrants.length}
        </div>
        
        <button 
          onClick={handleUpdate} 
          disabled={isLoading || parsedEntrants.length === 0}
          className="update-button"
        >
          {isLoading ? 'Updating...' : 'Update List'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {notification.type && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};
