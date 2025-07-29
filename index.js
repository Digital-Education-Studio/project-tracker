const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'frontend');

// Ensure data file exists
function ensureData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ programmes: [] }, null, 2), 'utf8');
  }
}

// Load data from file
function loadData() {
  ensureData();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: send JSON response
function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(obj));
}

// Serve static files
function serveStatic(req, res) {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = path.join(PUBLIC_DIR, filePath);
  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(fullPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    });
  });
}

// Extract id from url
function extractId(str) {
  const id = parseInt(str, 10);
  return isNaN(id) ? null : id;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API routes
  if (pathname.startsWith('/api')) {
    const parts = pathname.split('/').filter(Boolean); // remove empty
    // parts[1] will be 'api'
    const route = parts.slice(1);
    const data = loadData();

    // GET /api/data
    if (method === 'GET' && pathname === '/api/data') {
      sendJSON(res, 200, data);
      return;
    }

    // Programmes
    if (route[0] === 'programmes') {
      // GET /api/programmes
      if (method === 'GET' && route.length === 1) {
        sendJSON(res, 200, data.programmes);
        return;
      }
      // POST /api/programmes
      if (method === 'POST' && route.length === 1) {
        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const { name } = JSON.parse(body);
            if (!name || typeof name !== 'string') {
              sendJSON(res, 400, { error: 'Name is required' });
              return;
            }
            const newId = data.programmes.length
              ? Math.max(...data.programmes.map((p) => p.id)) + 1
              : 1;
            const newProgramme = { id: newId, name, modules: [] };
            data.programmes.push(newProgramme);
            saveData(data);
            sendJSON(res, 201, newProgramme);
          } catch (e) {
            sendJSON(res, 400, { error: 'Invalid JSON' });
          }
        });
        return;
      }
      // GET /api/programmes/:programmeId
      const programmeId = extractId(route[1]);
      if (route.length === 2 && programmeId !== null && method === 'GET') {
        const programme = data.programmes.find((p) => p.id === programmeId);
        if (!programme) {
          sendJSON(res, 404, { error: 'Programme not found' });
          return;
        }
        sendJSON(res, 200, programme);
        return;
      }
      // POST /api/programmes/:programmeId/modules
      if (route.length === 3 && programmeId !== null && route[2] === 'modules' && method === 'POST') {
        const programme = data.programmes.find((p) => p.id === programmeId);
        if (!programme) {
          sendJSON(res, 404, { error: 'Programme not found' });
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const { name } = JSON.parse(body);
            if (!name || typeof name !== 'string') {
              sendJSON(res, 400, { error: 'Module name is required' });
              return;
            }
            const newId = programme.modules.length
              ? Math.max(...programme.modules.map((m) => m.id)) + 1
              : 1;
            const newModule = { id: newId, name, tasks: [] };
            programme.modules.push(newModule);
            saveData(data);
            sendJSON(res, 201, newModule);
          } catch (e) {
            sendJSON(res, 400, { error: 'Invalid JSON' });
          }
        });
        return;
      }
    }
    // Modules
    if (route[0] === 'modules') {
      const moduleId = extractId(route[1]);
      // GET /api/modules/:id
      if (method === 'GET' && route.length === 2 && moduleId !== null) {
        let found = null;
        for (const programme of data.programmes) {
          const module = programme.modules.find((m) => m.id === moduleId);
          if (module) {
            found = { ...module, programmeId: programme.id };
            break;
          }
        }
        if (!found) {
          sendJSON(res, 404, { error: 'Module not found' });
          return;
        }
        sendJSON(res, 200, found);
        return;
      }
      // POST /api/modules/:id/tasks
      if (method === 'POST' && route.length === 3 && moduleId !== null && route[2] === 'tasks') {
        let foundProgramme = null;
        let moduleRef = null;
        for (const programme of data.programmes) {
          const m = programme.modules.find((mm) => mm.id === moduleId);
          if (m) {
            foundProgramme = programme;
            moduleRef = m;
            break;
          }
        }
        if (!moduleRef) {
          sendJSON(res, 404, { error: 'Module not found' });
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const { name, start, end } = JSON.parse(body);
            if (!name || !start || !end) {
              sendJSON(res, 400, { error: 'Name, start, and end are required' });
              return;
            }
            const newId = moduleRef.tasks.length
              ? Math.max(...moduleRef.tasks.map((t) => t.id)) + 1
              : 1;
            const newTask = { id: newId, name, start, end };
            moduleRef.tasks.push(newTask);
            saveData(data);
            sendJSON(res, 201, newTask);
          } catch (e) {
            sendJSON(res, 400, { error: 'Invalid JSON' });
          }
        });
        return;
      }
    }

    // Not found for API
    sendJSON(res, 404, { error: 'Not Found' });
    return;
  }

  // Fallback to static
  serveStatic(req, res);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Project tracker server running on port ${port}`);
});