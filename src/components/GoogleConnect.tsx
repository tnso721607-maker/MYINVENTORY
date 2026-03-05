import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function GoogleConnect({ onConnect }: { onConnect: () => void }) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.authenticated) {
        setStatus('connected');
        onConnect();
      } else {
        setStatus('disconnected');
      }
    } catch (e) {
      setStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL. Make sure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        setError('Please allow popups for this site to connect your account.');
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      setError(err.message || 'Failed to initiate connection');
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setStatus('disconnected');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  if (status === 'loading') {
    return <div className="animate-pulse h-32 bg-gray-100 rounded-xl"></div>;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Connect Google Sheets</CardTitle>
        <CardDescription>
          Link your Google account to read and write to your spreadsheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'connected' ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>Successfully connected to Google</span>
            </div>
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect Account
            </Button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {error && (
              <div className="flex items-start text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <Button onClick={handleConnect} className="w-full">
              Connect Google Account
            </Button>
            <div className="text-xs text-gray-500 mt-4">
              <p className="font-semibold mb-1">Setup Instructions:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Go to Google Cloud Console and create an OAuth Client ID.</li>
                <li>Add <code className="bg-gray-100 px-1 rounded">{window.location.origin}/auth/callback</code> to Authorized redirect URIs.</li>
                <li>Set <code className="bg-gray-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-gray-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in the environment variables.</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
