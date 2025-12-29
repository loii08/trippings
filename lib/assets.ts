// Theme-aware asset utility
export const getThemeAsset = (lightAsset: string, darkAsset: string) => {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? darkAsset : lightAsset;
};

// Logo assets
export const getLogo = () => getThemeAsset('/assets/logo_l.png', '/assets/logo_d.png');

// Loading animations
export const getLoadingAnimation = () => getThemeAsset('/assets/loading_l.png', '/assets/loading_d.png');

// Favicon management
export const updateFavicon = () => {
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement || 
                  document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  
  if (favicon) {
    favicon.href = getLogo();
  }
};

// PWA icon management
export const updatePWAIcons = () => {
  const logo = getLogo();
  
  // Update various icon sizes if they exist
  const iconSizes = [192, 512];
  iconSizes.forEach(size => {
    const icon = document.querySelector(`link[rel="icon"][sizes="${size}x${size}"]`) as HTMLLinkElement;
    if (icon) {
      icon.href = logo;
    }
  });
};
