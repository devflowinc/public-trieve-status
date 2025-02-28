import { Database } from 'sqlite3';
import { promisify } from 'util';

export interface HealthHistoryPoint {
  id: number;
  dataset_id: string;
  search_type: string;
  status: string;
  latency: number;
  card_count: number;
  timestamp: string;
}

export interface IngestHistoryPoint {
  id: number;
  queue: string;
  length: number;
  timestamp: string;
}

export interface HealthHistoryResponse {
  health: HealthHistoryPoint[];
  ingest: IngestHistoryPoint[];
}

export const GET = async () => {
  const db = new Database('health.db');
  
  // Promisify the db.all method
  const dbAll = promisify(db.all).bind(db);
  
  try {
    // Get health check history (last 100 entries)
    const healthHistory = await dbAll(`
      SELECT id, dataset_id, search_type, status, latency, card_count, 
             datetime(created_at, 'localtime') as timestamp
      FROM health
      ORDER BY id DESC
      LIMIT 100
    `) as HealthHistoryPoint[];
    
    // Get ingest history (last 100 entries)
    const ingestHistory = await dbAll(`
      SELECT id, queue, length, datetime(created_at, 'localtime') as timestamp
      FROM ingest
      ORDER BY id DESC
      LIMIT 100
    `) as IngestHistoryPoint[];
    
    return new Response(JSON.stringify({
      health: healthHistory,
      ingest: ingestHistory
    }));
  } catch (error) {
    console.error('Error fetching history:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch history data' }), { status: 500 });
  } finally {
    db.close();
  }
}; 