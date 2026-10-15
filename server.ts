import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { INITIAL_ASSESSMENTS, INITIAL_CONTINGENCY, INITIAL_ROUTES } from './src/data/initialData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory store initialized with seed data
let assessmentsStore = [...INITIAL_ASSESSMENTS];
let routesStore = [...INITIAL_ROUTES];
let contingencyStore = { ...INITIAL_CONTINGENCY };
const activeEvaluatorsStore: Record<string, any> = {};

// Server-Sent Events (SSE) clients for real-time live synchronization
interface SSEClient {
  id: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'EDAN Tepatitlán Emergency Server',
    connectedClients: sseClients.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/contingency', (req, res) => {
  res.json(contingencyStore);
});

app.post('/api/contingency', (req, res) => {
  const item = req.body;
  if (!item) {
    return res.status(400).json({ error: 'Contingency data is required' });
  }
  contingencyStore = { ...contingencyStore, ...item };
  broadcastSSE('CONTINGENCY_UPDATED', contingencyStore);
  res.json({ success: true, contingency: contingencyStore });
});

app.get('/api/assessments', (req, res) => {
  res.json(assessmentsStore);
});

app.post('/api/assessments', (req, res) => {
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ error: 'Assessment data with ID is required' });
  }

  const existingIndex = assessmentsStore.findIndex((a) => a.id === item.id);
  const updatedItem = {
    ...item,
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced',
  };

  if (existingIndex >= 0) {
    assessmentsStore[existingIndex] = updatedItem;
  } else {
    assessmentsStore.unshift(updatedItem);
  }

  // Real-time broadcast to all field users and command post
  broadcastSSE('ASSESSMENT_SAVED', updatedItem);

  res.json({ success: true, assessment: updatedItem });
});

app.delete('/api/assessments/:id', (req, res) => {
  const { id } = req.params;
  assessmentsStore = assessmentsStore.filter((a) => a.id !== id);
  broadcastSSE('ASSESSMENT_DELETED', { id });
  res.json({ success: true, id });
});

app.get('/api/routes', (req, res) => {
  res.json(routesStore);
});

app.post('/api/routes', (req, res) => {
  const route = req.body;
  const idx = routesStore.findIndex((r) => r.id === route.id);
  if (idx >= 0) {
    routesStore[idx] = route;
  } else {
    routesStore.push(route);
  }
  broadcastSSE('ROUTE_UPDATED', route);
  res.json({ success: true, route });
});

// Batch sync endpoint for offline evaluators regaining connectivity
app.post('/api/sync', (req, res) => {
  const { mutations, lastSyncTimestamp } = req.body;

  if (Array.isArray(mutations) && mutations.length > 0) {
    for (const mut of mutations) {
      if (mut.type === 'CREATE_ASSESSMENT' || mut.type === 'UPDATE_ASSESSMENT') {
        const item = mut.payload;
        const existingIndex = assessmentsStore.findIndex((a) => a.id === item.id);
        const syncedItem = { ...item, syncStatus: 'synced', updatedAt: new Date().toISOString() };
        if (existingIndex >= 0) {
          assessmentsStore[existingIndex] = syncedItem;
        } else {
          assessmentsStore.unshift(syncedItem);
        }
        broadcastSSE('ASSESSMENT_SAVED', syncedItem);
      } else if (mut.type === 'DELETE_ASSESSMENT') {
        assessmentsStore = assessmentsStore.filter((a) => a.id !== mut.payload.id);
        broadcastSSE('ASSESSMENT_DELETED', { id: mut.payload.id });
      }
    }
  }

  res.json({
    success: true,
    serverTimestamp: new Date().toISOString(),
    assessments: assessmentsStore,
    routes: routesStore,
    contingency: contingencyStore,
  });
});

// Live Evaluator Presence / Location tracking in field
app.post('/api/presence', (req, res) => {
  const { evaluatorId, name, callsign, role, lat, lng } = req.body;
  if (evaluatorId) {
    activeEvaluatorsStore[evaluatorId] = {
      evaluatorId,
      name,
      callsign,
      role,
      lat,
      lng,
      lastSeen: Date.now(),
    };
    broadcastSSE('EVALUATOR_PRESENCE', activeEvaluatorsStore[evaluatorId]);
  }
  res.json({ success: true });
});

app.get('/api/presence', (req, res) => {
  const cutoff = Date.now() - 5 * 60 * 1000; // active in last 5 min
  const active = Object.values(activeEvaluatorsStore).filter((e: any) => e.lastSeen > cutoff);
  res.json(active);
});

// SSE endpoint for live real-time push
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial ping and connection confirmation
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  // Heartbeat every 25 seconds
  const interval = setInterval(() => {
    res.write(`event: PING\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(interval);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[EDAN Tepatitlan] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[EDAN Server Error]', err);
});
