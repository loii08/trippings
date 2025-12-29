import React, { useEffect, useState } from 'react';
import { getLogo, getLoadingAnimation } from '../lib/assets';

const SplashScreen: React.FC = () => {
  const [logoSrc, setLogoSrc] = useState('/assets/logo_l.png');
  const [loadingSrc, setLoadingSrc] = useState('/assets/loading_l.png');

  useEffect(() => {
    const updateAssets = () => {
      setLogoSrc(getLogo());
      setLoadingSrc(getLoadingAnimation());
    };

    // Initial update
    updateAssets();

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      updateAssets();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
      <img 
        src={logoSrc} 
        alt="Trippings Logo" 
        className="w-24 h-24 mb-8 object-contain rounded-full"
      />
      <img 
        src={loadingSrc} 
        alt="Loading..." 
        className="w-16 h-16 animate-pulse rounded-full"
      />
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Plan & Track</p>
    </div>
  );
};

export default SplashScreen;
