import React, { useEffect, useState } from 'react';
import { getLoadingAnimation } from '../lib/assets';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ size = 'medium', className = '' }) => {
  const [loadingSrc, setLoadingSrc] = useState('/assets/loading_l.png');

  useEffect(() => {
    const updateLoadingImage = () => {
      setLoadingSrc(getLoadingAnimation());
    };

    // Initial update
    updateLoadingImage();

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      updateLoadingImage();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={loadingSrc} 
        alt="Loading..." 
        className={`${sizeClasses[size]} animate-pulse rounded-full`}
      />
    </div>
  );
};

export default Loading;
