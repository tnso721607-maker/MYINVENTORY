/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GoogleConnect } from './components/GoogleConnect';
import { SpreadsheetForm } from './components/SpreadsheetForm';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Spreadsheet Form Builder
          </h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
            Connect your Google account and instantly generate a form from any spreadsheet.
          </p>
        </div>

        <GoogleConnect onConnect={() => setIsConnected(true)} />

        {isConnected && (
          <div className="pt-8 border-t border-gray-200">
            <SpreadsheetForm />
          </div>
        )}
      </div>
    </div>
  );
}
