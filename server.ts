import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

const getOAuth2Client = (req: express.Request) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// API routes
app.get('/api/auth/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured' });
  }
  const oauth2Client = getOAuth2Client(req);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing code');
  }

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in a JWT cookie
    const tokenStr = jwt.sign(tokens, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('google_auth', tokenStr, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/status', (req, res) => {
  const token = req.cookies.google_auth;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.json({ authenticated: true });
    } catch (e) {
      // invalid token
    }
  }
  res.json({ authenticated: false });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_auth', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ success: true });
});

// Helper to get authenticated client
const getAuthClient = (req: express.Request) => {
  const token = req.cookies.google_auth;
  if (!token) throw new Error('Not authenticated');
  
  const tokens = jwt.verify(token, JWT_SECRET) as any;
  const oauth2Client = getOAuth2Client(req);
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

app.get('/api/spreadsheet/:id/headers', async (req, res) => {
  try {
    const auth = getAuthClient(req);
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.params.id,
      range: '1:1', // First row
    });

    const headers = response.data.values?.[0] || [];
    res.json({ headers });
  } catch (error: any) {
    console.error('Error fetching headers:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch headers' });
  }
});

app.post('/api/spreadsheet/:id/submit', async (req, res) => {
  try {
    const auth = getAuthClient(req);
    const sheets = google.sheets({ version: 'v4', auth });
    
    // req.body should be an array of values corresponding to the headers
    const values = req.body.values;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: req.params.id,
      range: 'A1', // Append to the first available row
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting data:', error);
    res.status(500).json({ error: error.message || 'Failed to submit data' });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
