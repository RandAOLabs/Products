import { useState, useEffect } from 'react';
import { useSweepstakes } from '../../../context/SweepstakesContext';
import './EntrantsForm.css';

interface EntrantsFormProps {
  mode: 'create' | 'update';
  onEntrantsChange?: (entrants: string[]) => void;
  onSubmit?: () => void;
  initialEntrants?: string[];
  title?: string;
  buttonText?: string;
}

export const EntrantsForm = ({
  mode = 'update',
  onEntrantsChange,
  onSubmit,
  initialEntrants = [],
  title = 'Entrants List',
  buttonText = mode === 'create' ? 'Create Sweepstakes' : 'Update List'
}: EntrantsFormProps) => {
  const { 
    entrants, 
    setEntrants, 
    updateEntrants, 
    loadEntrants, 
    error, 
    isLoading 
  } = useSweepstakes();
  
  const [inputText, setInputText] = useState('');
  const [parsedEntrants, setParsedEntrants] = useState<string[]>([]);
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error' | 'info' | null}>({
    message: '',
    type: null
  });

  // Initialize form based on initialEntrants or context entrants
  useEffect(() => {
    // For create mode, prioritize initialEntrants passed as props
    // For update mode, prioritize context entrants if no initialEntrants provided
    if (mode === 'create' && initialEntrants.length > 0) {
      setInputText(initialEntrants.join('\n'));
      setParsedEntrants(initialEntrants);
    } else if (mode === 'update' && entrants.length > 0) {
      setInputText(entrants.join('\n'));
      setParsedEntrants(entrants);
    }
  }, [mode, initialEntrants, entrants]);

  // Parse input text to get entrants list
  const parseInput = (text: string): string[] => {
    // First, handle single-line entries with multiple formats
    // Try to parse intelligently based on what seems to be the separator
    let lines: string[] = [];
    
    // If single line with commas, split by commas
    if (!text.includes('\n') && text.includes(',')) {
      lines = text.split(',');
    } 
    // If single line with semicolons, split by semicolons
    else if (!text.includes('\n') && text.includes(';')) {
      lines = text.split(';');
    }
    // If single line with spaces (and no commas/semicolons), split by spaces
    else if (!text.includes('\n') && !text.includes(',') && !text.includes(';')) {
      // Split by one or more spaces
      lines = text.split(/\s+/);
    }
    // Otherwise, split by new lines
    else {
      lines = text.split('\n');
      
      // Process each line and handle comma/semicolon/space-separated values within lines
      const expandedLines: string[] = [];
      
      lines.forEach(line => {
        // Check if the line contains commas or semicolons
        if (line.includes(',')) {
          // Split by comma and add each non-empty item
          line.split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .forEach(item => expandedLines.push(item));
        } else if (line.includes(';')) {
          // Split by semicolon and add each non-empty item
          line.split(';')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .forEach(item => expandedLines.push(item));
        } else if (line.trim().includes(' ')) {
          // Split by spaces and add each non-empty item
          line.split(/\s+/)
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .forEach(item => expandedLines.push(item));
        } else {
          // If no separators, add the line if it's not empty
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            expandedLines.push(trimmed);
          }
        }
      });
      
      lines = expandedLines;
    }
    
    // Clean up all entries
    const cleanedEntries = lines
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    // Remove duplicates
    return [...new Set(cleanedEntries)];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    const newEntrants = parseInput(newText);
    setParsedEntrants(newEntrants);
    
    // If in create mode or an onChange handler is provided, call it
    if (onEntrantsChange) {
      onEntrantsChange(newEntrants);
    }
  };

  const handleSubmit = async () => {
    // Get the parsed entrants from the form
    const newEntrants = parsedEntrants;
    console.log(`${mode === 'create' ? 'Create' : 'Update'} button clicked with parsed entrants:`, newEntrants);
    
    // Update notification state
    setNotification({ message: '', type: null });
    
    // If no entrants, show info notification
    if (newEntrants.length === 0) {
      setNotification({ 
        message: 'No entrants to process', 
        type: 'info' 
      });
      return;
    }
    
    // If in create mode and an onSubmit handler is provided, call it
    if (mode === 'create' && onSubmit) {
      // For create mode, we'll just pass the entrants to the parent
      // which will handle creating the sweepstakes
      onSubmit();
      return;
    }
    
    // For update mode, proceed with updating entrants
    if (mode === 'update') {
      try {
        console.log('Before update operation:', { 
          parsedEntrants: newEntrants,
          contextEntrants: entrants
        });
        
        // Pass the parsed entrants directly to the updateEntrants function
        await updateEntrants(newEntrants);
        console.log('After updateEntrants call with direct list');
        
        // After successful update, reload the entrants from the server
        await loadEntrants();
        console.log('After loadEntrants call, current entrants:', entrants);
        
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
    }
    
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNotification({ message: '', type: null });
    }, 5000);
  };

  return (
    <div className="entrants-form">
      <h2>{title}</h2>
      <p className="form-info">
        Enter names separated by commas, spaces, semicolons, or new lines.
      </p>
      
      <div className="input-container">
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="Enter names (separated by commas, spaces, semicolons, or new lines)"
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
          onClick={handleSubmit} 
          disabled={isLoading || parsedEntrants.length === 0}
          className="update-button"
        >
          {isLoading ? (mode === 'create' ? 'Creating...' : 'Updating...') : buttonText}
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
