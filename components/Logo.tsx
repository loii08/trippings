import React, { useEffect, useState } from 'react';
import { getLogo } from '../lib/assets';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', className = '', showText = true }) => {
  const [logoSrc, setLogoSrc] = useState('/assets/logo_l.png');

  useEffect(() => {
    const updateLogo = () => {
      setLogoSrc(getLogo());
    };

    // Initial update
    updateLogo();

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      updateLogo();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoSrc} 
        alt="Trippings Logo" 
        className={`${sizeClasses[size]} object-contain rounded-full`}
      />
      {showText && (
        <span className={`font-bold ${textSizes[size]} text-slate-900 dark:text-slate-100`}>
          Trippings
        </span>
      )}
    </div>
  );
};

export default Logo;
