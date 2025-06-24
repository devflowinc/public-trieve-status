import { createClient } from 'redis';
import { Database } from 'sqlite3';
import type { HealthCheckResponse, SearchResult } from './checkhealth';

interface RequestBody {
  uri: string;
  queue: string;
  command?: 'fair' | 'scard';
}

export interface DatasetInfo {
  dataset_length: number;
  dataset_id: string;
}

export interface IngestResponse {
  length: number;
  dataset_info: DatasetInfo[] | null;
}

const db = new Database('health.db');

db.run(`CREATE TABLE IF NOT EXISTS ingest (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue TEXT,
  length INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const saveIngest = (queue: string, response: IngestResponse) => {
  db.get(
    `SELECT id FROM ingest WHERE created_at > datetime('now', '-1 minute') AND queue = ? LIMIT 1`,
    [queue],
    (err, row) => {
      if (err) {
        console.error('Error checking recent entries:', err);
        return;
      }
      
      if (!row) {
        db.run(
          `INSERT INTO ingest (queue, length) VALUES (?, ?)`, 
          [queue, response.length],
          (err) => {
            if (err) {
              console.error('Error inserting ingest data:', err);
            }
          }
        );
      }
    }
  );
};

export const POST = async ({ request }: { request: Request }) => {
  const requestJSON: RequestBody = await request.json();

  const client = await createClient({
    url: requestJSON.uri
  })
  .connect();

  let length = -1;
  let dataset_info: DatasetInfo[] | null = null;

  if (requestJSON.command && requestJSON.command === "fair") {
    dataset_info = [];
    let keys_global = `${requestJSON.queue}_*_queue`;
    length = 0;
    
    if (requestJSON.queue.includes("processing")) {
      keys_global = `${requestJSON.queue}_*_processing`;
    }
    if (requestJSON.queue.includes("dead_letters")) {
      keys_global = `${requestJSON.queue}_*_failed`;
    }
    
    const dataset_keys = await client.KEYS(keys_global);
    for (let dataset of dataset_keys) {
      const dataset_length = await client.ZCARD(dataset);
      length += dataset_length;
      dataset_info.push({
        dataset_length: dataset_length,
        dataset_id: dataset
      });
    }
  } else if (requestJSON.command && requestJSON.command === "scard") {
    length = await client.SCARD(requestJSON.queue);
  } else {
    length = await client.LLEN(requestJSON.queue);
  }

  await client.disconnect();

  const response: IngestResponse = {
    length: length,
    dataset_info: dataset_info
  };

  saveIngest(requestJSON.queue, response);

  return new Response(JSON.stringify(response));
}; 