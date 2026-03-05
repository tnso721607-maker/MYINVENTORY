import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function SpreadsheetForm() {
  const [spreadsheetId, setSpreadsheetId] = useState('1fbuNmB4W6_YwKb3iIUrnO3fBlfyEtOcFxFSOX_6hLeo');
  const [headers, setHeaders] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadHeaders = async () => {
    if (!spreadsheetId) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const res = await fetch(`/api/spreadsheet/${spreadsheetId}/headers`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load spreadsheet');
      }
      
      if (!data.headers || data.headers.length === 0) {
        throw new Error('No headers found in the first row of the spreadsheet');
      }
      
      setHeaders(data.headers);
      
      // Initialize form data
      const initialData: Record<string, string> = {};
      data.headers.forEach((h: string) => {
        initialData[h] = '';
      });
      setFormData(initialData);
    } catch (err: any) {
      setError(err.message);
      setHeaders([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (spreadsheetId) {
      loadHeaders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (header: string, value: string) => {
    setFormData(prev => ({ ...prev, [header]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Map form data back to array in the correct order
      const values = headers.map(h => formData[h] || '');
      
      const res = await fetch(`/api/spreadsheet/${spreadsheetId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit data');
      }
      
      setSuccess(true);
      
      // Reset form
      const resetData: Record<string, string> = {};
      headers.forEach(h => {
        resetData[h] = '';
      });
      setFormData(resetData);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Select Spreadsheet</CardTitle>
          <CardDescription>
            Enter the ID of your Google Spreadsheet. You can find this in the URL: 
            <br/>
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block">
              docs.google.com/spreadsheets/d/<strong>YOUR_SPREADSHEET_ID</strong>/edit
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input 
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" 
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadHeaders()}
            />
            <Button onClick={loadHeaders} disabled={!spreadsheetId || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Load Form
            </Button>
          </div>
          
          {error && !headers.length && (
            <div className="mt-4 flex items-start text-red-600 bg-red-50 p-3 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card className="border-t-4 border-t-indigo-500 shadow-md">
          <CardHeader>
            <CardTitle>Data Entry Form</CardTitle>
            <CardDescription>
              Fill out the fields below to add a new row to your spreadsheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {headers.map((header, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`field-${index}`}>{header}</Label>
                  <Input 
                    id={`field-${index}`}
                    value={formData[header] || ''}
                    onChange={(e) => handleInputChange(header, e.target.value)}
                    placeholder={`Enter ${header.toLowerCase()}`}
                  />
                </div>
              ))}
              
              {error && headers.length > 0 && (
                <div className="flex items-start text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg text-sm">
                  <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
                  <span>Successfully added row to spreadsheet!</span>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit to Spreadsheet'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
