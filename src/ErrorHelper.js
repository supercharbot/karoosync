import React, { useState } from 'react';
import { AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

const ErrorHelper = ({ errorMessage, type = 'error', details = null, suggestions = [], onClose = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Error types
  const types = {
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      icon: <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
    }
  };
  
  const style = types[type] || types.error;
  
  return (
    <div className={`${style.bgColor} border ${style.borderColor} rounded-xl p-4 my-4 animate-fadeIn`}>
      <div className="flex items-start">
        {style.icon}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className={`${style.textColor} font-medium`}>{errorMessage}</p>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 ml-2"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {(details || suggestions.length > 0) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center mt-1 text-sm ${style.textColor} opacity-80 hover:opacity-100`}
            >
              {isExpanded ? 'Hide details' : 'Show details'}
              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </button>
          )}
          
          {isExpanded && (
            <div className="mt-3 space-y-3 text-sm">
              {details && (
                <div className={`p-3 bg-white bg-opacity-50 rounded border ${style.borderColor} ${style.textColor} font-mono text-xs overflow-x-auto`}>
                  {details}
                </div>
              )}
              
              {suggestions.length > 0 && (
                <div>
                  <p className={`font-medium ${style.textColor}`}>Suggestions:</p>
                  <ul className={`list-disc pl-5 mt-1 ${style.textColor} space-y-1`}>
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorHelper;