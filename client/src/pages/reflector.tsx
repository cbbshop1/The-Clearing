import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import EthicsReflectionBar from '../components/EthicsReflectionBar';
import { useWebSocket } from '../hooks/useWebSocket';

interface Message {
  id: number;
  content: string;
  type: string;
  aiModel?: string;
  metadata?: {
    elp?: any;
  };
  createdAt: string;
}

interface EthicsData {
  sessionId: number;
  totalMessages: number;
  ethicsReports: Array<{
    messageId: number;
    timestamp: string;
    speaker: string;
    type: string;
    elpReport: any;
  }>;
  analytics: {
    overallRRI: number;
    trendsAlert: boolean;
    recommendedActions: string[];
  };
}

const ReflectorPage: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [latestMessages, setLatestMessages] = useState<Message[]>([]);
  
  // Get current session from URL params or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('session');
    const sessionFromStorage = localStorage.getItem('currentSessionId');
    
    const sessionId = sessionFromUrl ? parseInt(sessionFromUrl) : 
                     sessionFromStorage ? parseInt(sessionFromStorage) : null;
    
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }

    // Prevent window from losing focus
    const handleBlur = () => {
      setTimeout(() => window.focus(), 100);
    };
    
    window.addEventListener('blur', handleBlur);
    
    // Cleanup
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // WebSocket connection for real-time updates
  useWebSocket((message: any) => {
    if (message.type === 'new_message' && message.message) {
      console.log('New message received in Ethics Monitor:', message.message);
      setLatestMessages(prev => [...prev.slice(-9), message.message]); // Keep last 10 messages
      // Trigger a fresh data fetch when we get a new message
      refetch();
    }
  });

  // Fetch ethics data for current session
  const { data: ethicsData, refetch, isLoading } = useQuery<EthicsData>({
    queryKey: ['/api/sessions', currentSessionId, 'ethics'],
    enabled: !!currentSessionId,
    refetchInterval: false, // Disable automatic refetch to prevent flickering
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Log ethics data when it changes
  useEffect(() => {
    if (ethicsData) {
      console.log('Ethics data updated:', {
        totalMessages: ethicsData.totalMessages,
        reportsCount: ethicsData.ethicsReports?.length,
        sessionId: ethicsData.sessionId
      });
    }
  }, [ethicsData]);

  if (!currentSessionId) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Ethics Monitor</h2>
          <p className="text-gray-600">No active session detected.</p>
          <p className="text-sm text-gray-500 mt-2">
            Open this monitor from a chat session to see live ethics analysis.
          </p>
          <button 
            onClick={() => window.close()} 
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Ethics Monitor</h2>
          <p className="text-gray-600">Loading ethics data for session {currentSessionId}...</p>
        </div>
      </div>
    );
  }

  const recentEthicsReports = ethicsData?.ethicsReports.slice(-5) || []; // Show last 5 reports

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Ethics Monitor</h1>
          <p className="text-gray-600">Session {currentSessionId} - Real-time Ethics Analysis</p>
        </div>

        {/* Session Analytics */}
        {ethicsData?.analytics && (
          <div className="bg-white rounded-lg p-4 mb-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-3">Session Analytics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {ethicsData.analytics.overallRRI.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Overall RRI Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {ethicsData.totalMessages}
                </div>
                <div className="text-sm text-gray-600">Total Messages</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${ethicsData.analytics.trendsAlert ? 'text-red-600' : 'text-green-600'}`}>
                  {ethicsData.analytics.trendsAlert ? 'ALERT' : 'NORMAL'}
                </div>
                <div className="text-sm text-gray-600">Trends Status</div>
              </div>
            </div>
            
            {ethicsData.analytics.recommendedActions.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <strong className="text-yellow-800">Recommended Actions:</strong>
                <ul className="mt-1 text-sm">
                  {ethicsData.analytics.recommendedActions.map((action, index) => (
                    <li key={index} className="text-yellow-700">• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Recent Ethics Reports */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Ethics Reports</h3>
          {recentEthicsReports.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-gray-500">
              <p>No ethics reports available yet.</p>
              <p className="text-sm mt-1">Send a message in the chat to see live ethics analysis.</p>
            </div>
          ) : (
            recentEthicsReports.map((report, index) => (
              <div key={report.messageId} className="bg-white rounded-lg p-4 border shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{report.speaker}</h4>
                  <span className="text-sm text-gray-500">
                    {new Date(report.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <EthicsReflectionBar report={report.elpReport} />
              </div>
            ))
          )}
        </div>

        {/* Live Update Indicator and Controls */}
        <div className="fixed bottom-4 right-4 space-y-2">
          <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm">
            🟢 WebSocket Connected (Session {currentSessionId})
          </div>
          <div className="bg-blue-500 text-white px-3 py-2 rounded text-sm">
            📊 {ethicsData?.totalMessages || 0} messages analyzed
          </div>
          <button 
            onClick={() => {
              console.log('Manual refresh triggered');
              refetch();
            }} 
            className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
          >
            Refresh Now
          </button>
          <button 
            onClick={() => window.close()} 
            className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
          >
            Close Monitor
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectorPage;