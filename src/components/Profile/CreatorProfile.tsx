import React, { useEffect, useState } from 'react';
import { useSweepstakes } from '../../context/SweepstakesContext';
import './CreatorProfile.css';

// Define a custom interface to match the structure returned by the ProfilesService
interface BazarProfileInfo {
  id?: string;
  processId?: string;
  walletAddress?: string;
  handle?: string; 
  bio?: string;
  pfp?: string; // Profile picture
  name?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
    [key: string]: string | undefined;
  };
}

interface CreatorProfileProps {
  address: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
}

/**
 * Displays a creator's profile information with optional name and avatar
 */
export const CreatorProfile: React.FC<CreatorProfileProps> = ({ 
  address, 
  size = 'medium',
  showName = true 
}) => {
  const { getCreatorProfile } = useSweepstakes();
  const [profile, setProfile] = useState<BazarProfileInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const profileData = await getCreatorProfile(address);
        // Cast the profile data to our expected format
        const bazarProfile = profileData as unknown as BazarProfileInfo;
        setProfile(bazarProfile);
        console.log("Profile data:", profileData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile");
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address, getCreatorProfile]);

  // Get the size class based on prop
  const sizeClass = `creator-profile-${size}`;
  
  // Determine what to display for the name
  const displayName = profile?.name || profile?.handle || formatAddress(address);
  
  // Format the Arweave address to make it shorter and more readable
  function formatAddress(addr: string): string {
    if (!addr) return 'Unknown';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  // Resolve profile image URL - convert Arweave ID to full URL if needed
  const getProfileImageUrl = (profileImage: string | undefined): string => {
    if (!profileImage) return '/default-avatar.png'; // Default avatar
    
    if (profileImage.startsWith('http')) {
      return profileImage;
    }
    
    // Assume it's an Arweave ID and form a URL
    return `https://arweave.net/${profileImage}`;
  };

  return (
    <div className={`creator-profile ${sizeClass}`}>
      <div className="creator-avatar">
        {isLoading ? (
          <div className="loading-avatar" />
        ) : (
          <img 
            src={getProfileImageUrl(profile?.pfp)} 
            alt={displayName}
            onError={(e) => {
              // If image fails to load, set a default
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />
        )}
      </div>
      
      {showName && (
        <div className="creator-name" title={address}>
          {isLoading ? 'Loading...' : displayName}
        </div>
      )}
      
      {error && <div className="creator-error">{error}</div>}
    </div>
  );
};
