import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="h-16 w-16 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
          <span className="text-white font-bold text-xl">RT</span>
        </div>
        
        {/* Loading text */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading</h2>
        <p className="text-sm text-gray-500 mb-6">Please wait a moment...</p>
        
        {/* Loading spinner */}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
        
        {/* Loading dots */}
        <div className="loading-dots mt-4 text-blue-600">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
