const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

const CONFIG = {
  port: process.env.PORT || 3000,
  configUrl: (process.env.CONFIG_URL || '').trim(),
  logUrl: (process.env.LOG_URL || '').trim(),
  logToken: (process.env.LOG_API_TOKEN || '').trim(),
  itemsPerPage: 12,
  timeout: 15000
};

app.use(express.json());
app.use(cors({
  exposedHeaders: ['X-Page', 'X-Per-Page', 'X-Total-Items', 'X-Total-Pages']
}));

app.get('/', (req, res) => {
  res.send('Drone API is running');
});

app.post('/logs', async (req, res) => {
  const { drone_id, drone_name, country, celsius } = req.body || {};
  const numericId = Number(drone_id);
  const temperature = Number(celsius);

  if (Number.isNaN(numericId) || Number.isNaN(temperature) || !drone_name || !country) {
    return res.status(400).json({
      error: 'drone_id, drone_name, country, celsius are required (ids/temps must be numbers)'
    });
  }

  try {
    if (!CONFIG.logUrl) throw new Error('LOG_URL is not set in .env');

    const payload = {
      drone_id: numericId,
      drone_name: String(drone_name),
      country: String(country),
      celsius: temperature
    };

    const response = await axios.post(CONFIG.logUrl, payload, {
      headers: buildLogHeaders(),
      timeout: CONFIG.timeout
    });

    return res.status(201).json(response.data);
  } catch (err) {
    console.error('Create log error:', err.message, err.response ? JSON.stringify(err.response.data) : '');
    return res.status(502).json({
      error: 'Failed to create drone log',
      details: err.response ? err.response.data : err.message
    });
  }
});

app.get('/logs/:droneId', async (req, res) => {
  const { droneId } = req.params;
  if (!isValidNumericId(droneId)) {
    return res.status(400).json({ error: 'droneId must be a number' });
  }

  const currentPage = Math.max(1, parseInt(req.query.page, 10) || 1);

  try {
    if (!CONFIG.logUrl) throw new Error('LOG_URL is not set in .env');

    const { data } = await axios.get(CONFIG.logUrl, {
      headers: buildLogHeaders(),
      params: {
        page: currentPage,
        perPage: CONFIG.itemsPerPage,
        sort: '-created',
        filter: `drone_id=${droneId}`
      },
      timeout: CONFIG.timeout
    });

    res.set({
      'X-Page': data.page,
      'X-Per-Page': data.perPage,
      'X-Total-Items': data.totalItems,
      'X-Total-Pages': data.totalPages
    });

    const formattedLogs = data.items.map((item) => ({
      drone_id: item.drone_id,
      drone_name: item.drone_name,
      created: item.created,
      country: item.country,
      celsius: item.celsius
    }));

    return res.json(formattedLogs);
  } catch (err) {
    console.error('Logs fetch error:', err.message);
    return res.status(502).json({
      error: 'Failed to fetch drone logs',
      details: err.response ? err.response.data : err.message
    });
  }
});

app.get('/status/:droneId', async (req, res) => {
  const { droneId } = req.params;
  if (!isValidNumericId(droneId)) {
    return res.status(400).json({ error: 'droneId must be a number' });
  }

  try {
    const { targetDrone, allDrones } = await fetchDroneData(droneId);
    if (!targetDrone) return sendNotFoundResponse(res, droneId, allDrones);

    return res.json({ condition: targetDrone.condition });
  } catch (err) {
    console.error('Status fetch error:', err.message);
    return res.status(502).json({
      error: 'Cannot reach Drone Config Server',
      details: err.message
    });
  }
});

app.get('/configs/:droneId', async (req, res) => {
  const { droneId } = req.params;
  if (!isValidNumericId(droneId)) {
    return res.status(400).json({ error: 'droneId must be a number' });
  }

  try {
    const { targetDrone, allDrones } = await fetchDroneData(droneId);
    if (!targetDrone) return sendNotFoundResponse(res, droneId, allDrones);

    return res.json({
      drone_id: Number(extractDroneId(targetDrone)),
      drone_name: targetDrone.drone_name,
      light: targetDrone.light,
      country: targetDrone.country,
      weight: Number(targetDrone.weight)
    });
  } catch (err) {
    console.error('Config fetch error:', err.message);
    return res.status(502).json({
      error: 'Cannot reach Drone Config Server',
      details: err.message
    });
  }
});

function isValidNumericId(val) {
  return /^\d+$/.test(String(val));
}

function buildLogHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (CONFIG.logToken) {
    headers.Authorization = CONFIG.logToken.startsWith('Bearer ')
      ? CONFIG.logToken
      : `Bearer ${CONFIG.logToken}`;
  }
  return headers;
}

function extractDroneId(item) {
  if (!item || typeof item !== 'object') return undefined;
  return item.drone_id ?? item.droneId ?? item.id ?? item.DroneID;
}

function parseDroneCollection(rawData) {
  const foundArrays = [];
  const foundObjects = [];

  function traverse(node) {
    if (Array.isArray(node)) {
      foundArrays.push(node);
      node.forEach(traverse);
    } else if (node && typeof node === 'object') {
      if (extractDroneId(node) !== undefined) {
        foundObjects.push(node);
      }
      Object.values(node).forEach(traverse);
    }
  }

  traverse(rawData);

  const validLists = foundArrays.filter((arr) =>
    arr.some((entry) => entry && typeof entry === 'object' && !Array.isArray(entry) && extractDroneId(entry) !== undefined)
  );

  if (validLists.length > 0) {
    return validLists.sort((a, b) => b.length - a.length)[0];
  }
  return foundObjects;
}

async function fetchDroneData(droneId) {
  if (!CONFIG.configUrl) throw new Error('CONFIG_URL is not set in .env');

  const response = await axios.get(CONFIG.configUrl, { timeout: CONFIG.timeout });
  const allDrones = parseDroneCollection(response.data);
  const targetDrone = allDrones.find((item) => String(extractDroneId(item)) === String(droneId));

  return { targetDrone, allDrones };
}

function sendNotFoundResponse(res, droneId, list) {
  console.warn(`Drone ${droneId} not found. Config server returned ${list.length} item(s). First item:`, JSON.stringify(list[0]));
  return res.status(404).json({
    error: `Drone ${droneId} not found`,
    items_from_config_server: list.length,
    sample_keys: list[0] && typeof list[0] === 'object' ? Object.keys(list[0]) : null,
    sample_ids: list.slice(0, 20).map(extractDroneId)
  });
}

app.listen(CONFIG.port, () => {
  console.log(`API Server is running on port ${CONFIG.port}`);
});