import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const ConnectionDiagnostic = ({ url, authMethod, onRetry, onBack }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runApiTest = async () => {
    setTestingApi(true);
    setTestResults(null);
    
    try {
      // Format URL correctly
      let testUrl = url;
      if (!testUrl.startsWith('http')) {
        testUrl = `https://${testUrl}`;
      }
      
      // Remove trailing slash if present
      testUrl = testUrl.replace(/\/$/, '');
      
      // Test 1: Check if site is reachable at all
      const checkSite = await fetch(testUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // This will always "succeed" but tells us if network is working
      }).catch(e => ({ ok: false, error: e }));
      
      // All our tests
      const results = {
        siteReachable: checkSite !== null,
        restApiEnabled: false,
        woocommerceApiEnabled: false,
        woocommerceVersion: null,
        suggestions: []
      };
      
      // Add suggestions based on auth method
      if (authMethod === 'woocommerce') {
        results.suggestions = [
          "Make sure your API key has Read/Write permissions in WooCommerce → Settings → Advanced → REST API",
          "Verify your Consumer Key and Secret are entered correctly (without extra spaces)",
          "Try using Application Password authentication instead",
          "Check if you have any security plugins that might be blocking API access"
        ];
      } else {
        results.suggestions = [
          "Verify your username is correct (this is your WordPress login username)",
          "Make sure the Application Password was generated correctly in WordPress Admin → Users → Profile",
          "Try creating a new Application Password specifically for Karoosync",
          "Check if you have any security plugins that might be blocking REST API access"
        ];
      }
      
      // Add common suggestions
      results.suggestions.push(
        "Confirm that your store has products added in WooCommerce",
        "Verify that WooCommerce REST API is enabled in your WordPress settings"
      );
      
      setTestResults(results);
    } catch (error) {
      console.error("Diagnostic test error:", error);
      setTestResults({
        error: error.message,
        suggestions: [
          "Check your network connection",
          "Verify the store URL is correct",
          "Make sure the WordPress site is online"
        ]
      });
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-red-800">Connection Failed</h2>
          </div>
        </div>
        
        <div className="px-6 py-5">
          <p className="text-gray-700 mb-4">
            No products could be found in your store, or your API credentials don't have permission 
            to access them. This typically happens due to:
          </p>
          
          <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-6">
            <li>
              <span className="font-medium">API permissions issue</span> - Your API key or Application 
              Password doesn't have sufficient access rights
            </li>
            <li>
              <span className="font-medium">WooCommerce configuration</span> - The REST API might be 
              disabled or restricted
            </li>
            <li>
              <span className="font-medium">Empty store</span> - Your store might not have any 
              products (unlikely)
            </li>
          </ul>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
            
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Connection Details
            </button>
            
            <button
              onClick={runApiTest}
              disabled={testingApi}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center ml-auto"
            >
              {testingApi ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Diagnostic'
              )}
            </button>
          </div>
          
          {testResults && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Diagnostic Results</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center">
                  {testResults.siteReachable ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                  )}
                  <span className="text-gray-700">
                    Site Reachable: {testResults.siteReachable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              
              <h4 className="font-medium text-gray-700 mb-2">Recommended Solutions:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                {testResults.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
              {showDetails ? (
                <ChevronUp className="w-4 h-4 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-1" />
              )}
            </button>
            
            {showDetails && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm">
                <h3 className="font-semibold text-gray-800 mb-3">WooCommerce API Requirements</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      WooCommerce API Authentication:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>API keys must have <strong>Read/Write</strong> permissions</li>
                      <li>Keys are set in WooCommerce → Settings → Advanced → REST API</li>
                      <li>Consumer Key starts with <code className="bg-gray-200 px-1 py-0.5 rounded">ck_</code></li>
                      <li>Consumer Secret starts with <code className="bg-gray-200 px-1 py-0.5 rounded">cs_</code></li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      Application Password Authentication:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>Generated in WordPress Admin → Users → Profile</li>
                      <li>Requires WordPress 5.6 or higher</li>
                      <li>Username must be your WordPress admin username</li>
                      <li>Format: series of lowercase letters and numbers with spaces</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">
                      Common Issues:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                      <li>REST API might be disabled by security plugins</li>
                      <li>Incorrect URL format (missing https:// or has extra path)</li>
                      <li>Site using basic authentication or WAF blocking requests</li>
                      <li>Large stores might time out during initial sync</li>
                    </ul>
                  </div>
                  
                  <a 
                    href="https://woocommerce.com/document/woocommerce-rest-api/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    WooCommerce API Documentation
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDiagnostic;