import { Database } from "sqlite3";


interface RequestBody {
  url: string;
  api_key?: string;
  organization_id?: string;
  dataset_id?: string;
  only_fulltext?: boolean;
  searchTerm?: string;
}

export interface SearchResult {
  healthy: boolean;
  time?: number;
  status: string;
  cardCount?: number;
  response?: any;
  timing?: string;
}

export interface HealthCheckResponse {
  semantic?: SearchResult;
  fulltext?: SearchResult;
  hybrid?: SearchResult;
  groupSearch?: SearchResult;
}

const statusCodeResponseTypes: Record<number, string> = {
  400: "400 Bad Request",
  401: "401 Unauthorized",
  405: "405 Method Not Allowed",
  500: "500 Internal Server Error",
  502: "502 Bad Gateway",
  503: "503 Service Unavailable",
  408: "408 Request Timeout",
  200: "200 OK",
};

const db = new Database('health.db');

db.run(`CREATE TABLE IF NOT EXISTS health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id TEXT,
  search_type TEXT,
  status TEXT,
  latency INTEGER,
  card_count INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const saveHealthCheck = (dataset_id: string, response: HealthCheckResponse) => {
  for (const search_type of Object.keys(response)) {
    const search_result = response[search_type as keyof HealthCheckResponse] as SearchResult;
    
    db.get(
      `SELECT id FROM health 
       WHERE search_type = ? AND created_at > datetime('now', '-1 minute') 
       LIMIT 1`,
      [search_type],
      (err, row) => {
        if (err) {
          console.error('Error checking recent health entries:', err);
          return;
        }
        
        if (!row) {
          db.run(
            `INSERT INTO health (dataset_id, search_type, status, latency, card_count) 
             VALUES (?, ?, ?, ?, ?)`, 
            [
              dataset_id, 
              search_type, 
              search_result.status, 
              search_result.time, 
              search_result.cardCount
            ],
            (err) => {
              if (err) {
                console.error('Error inserting health data:', err);
              }
            }
          );
        }
      }
    );
  }
}

export const POST = async ({ request }: { request: Request }) => {
  let api_key: string | undefined;
  let dataset_id: string | undefined;
  let organization_id: string | undefined;
  let only_fulltext = false;

  const requestJSON: RequestBody = await request.json();
  let url = requestJSON.url;
  if (requestJSON.api_key) {
    api_key = requestJSON.api_key;
  }
  if (requestJSON.organization_id) {
    organization_id = requestJSON.organization_id;
  }
  if (requestJSON.dataset_id) {
    dataset_id = requestJSON.dataset_id;
  }
  if (requestJSON.only_fulltext) {
    only_fulltext = requestJSON.only_fulltext;
  }
  let searchTerm = requestJSON.searchTerm;
  if (!searchTerm) {
    searchTerm = "The man";
  }

  // SearchCardQueryResponseBody
  // {
  //    "score_cards": [
  //       {
  //          "metadata": [
  //             "card_html": "string",
  //             "content": "string",
  //             ...
  //          ]
  //          "score": 0.0,
  //       }
  //    ],
  //    "total_card_pages": 0
  //  }
  //
  // SearchCardData
  let full_url = `${url}/card/search/1`;
  if (url.includes("trieve")) {
    full_url = `${url}/chunk/search`;
  }
  
  const response: HealthCheckResponse = {
    fulltext: { healthy: false, status: "Not attempted" }
  };

  // Semantic search
  if (!only_fulltext) {
    try {
      const start = Date.now();
      const semantic_search = await fetch(full_url, {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json',
          "Authorization": api_key || "",
          "TR-Dataset": dataset_id || "",
          "TR-Organization": organization_id || "",
        },
        credentials: 'include',
        body: JSON.stringify({
          "query": searchTerm,
          "search_type": "semantic",
        })
      });
      
      response.semantic = {
        healthy: semantic_search.status === 200,
        time: Date.now() - start,
        status: statusCodeResponseTypes[semantic_search.status] || `Unknown status: ${semantic_search.status}`,
        timing: semantic_search.headers.get("Server-Timing") || undefined
      };

      if (semantic_search.status === 200) {
        const json = await semantic_search.json();
        if (json) {
          let cardCount = 0;
          if (json.results) {
            cardCount = json.results.length;
          } else if (json.chunks) {
            cardCount = json.chunks.length;
          }
          
          response.semantic.cardCount = cardCount;
          
          if (cardCount === 0) {
            response.semantic.healthy = false;
            response.semantic.status = "No cards found";
          }
        }
      } else if (semantic_search.status === 400) {
        response.semantic.response = await semantic_search.text();
      }
    } catch (e) {
      response.semantic = {
        healthy: false,
        status: "Fetch failed"
      };
    }
  }

  // Full text search
  try {
    const start = Date.now();
    const fulltextsearch = await fetch(full_url, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
        "Authorization": api_key || "",
        "TR-Dataset": dataset_id || "",
        "TR-Organization": organization_id || "",
      },
      credentials: 'include',
      body: JSON.stringify({
        "query": searchTerm,
        "search_type": "fulltext",
      })
    });
    
    response.fulltext = {
      healthy: fulltextsearch.status === 200,
      time: Date.now() - start,
      status: statusCodeResponseTypes[fulltextsearch.status] || `Unknown status: ${fulltextsearch.status}`,
      timing: fulltextsearch.headers.get("Server-Timing") || undefined
    };

    if (fulltextsearch.status === 200) {
      const json = await fulltextsearch.json();
      if (json) {
        let cardCount = 0;
        if (json.results) {
          cardCount = json.results.length;
        } else if (json.chunks) {
          cardCount = json.chunks.length;
        }
        
        response.fulltext.cardCount = cardCount;
        
        if (cardCount === 0) {
          response.fulltext.healthy = false;
          response.fulltext.status = "No cards found";
        }
      }
    } else if (fulltextsearch.status === 400) {
      response.fulltext.response = await fulltextsearch.text();
    }
  } catch (e) {
    response.fulltext = {
      healthy: false,
      status: "Fetch failed"
    };
  }

  // Hybrid search
  if (!only_fulltext) {
    try {
      const start = Date.now();
      const hybrid_search = await fetch(full_url, {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json',
          "Authorization": api_key || "",
          "TR-Dataset": dataset_id || "",
          "TR-Organization": organization_id || "",
        },
        credentials: 'include',
        body: JSON.stringify({
          "query": searchTerm,
          "search_type": "hybrid",
        })
      });
      
      response.hybrid = {
        healthy: hybrid_search.status === 200,
        time: Date.now() - start,
        status: statusCodeResponseTypes[hybrid_search.status] || `Unknown status: ${hybrid_search.status}`,
        timing: hybrid_search.headers.get("Server-Timing") || undefined
      };

      if (hybrid_search.status === 200) {
        const json = await hybrid_search.json();
        if (json) {
          let cardCount = 0;
          if (json.results) {
            cardCount = json.results.length;
          } else if (json.chunks) {
            cardCount = json.chunks.length;
          }
          
          response.hybrid.cardCount = cardCount;
          
          if (cardCount === 0) {
            response.hybrid.healthy = false;
            response.hybrid.status = "No cards found";
          }
        }
      } else if (hybrid_search.status === 400) {
        response.hybrid.response = await hybrid_search.text();
      }
    } catch (e) {
      response.hybrid = {
        healthy: false,
        status: "Fetch failed"
      };
    }
  }

  // Group search
  try {
    const start = Date.now();
    const group_search = await fetch(`${url}/chunk_group/group_oriented_search`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json',
        "Authorization": api_key || "",
        "TR-Dataset": dataset_id || "",
        "TR-Organization": organization_id || "",
      },
      credentials: 'include',
      body: JSON.stringify({
        "query": searchTerm,
        "search_type": "fulltext",
      })
    });
    
    response.groupSearch = {
      healthy: group_search.status === 200,
      time: Date.now() - start,
      status: statusCodeResponseTypes[group_search.status] || `Unknown status: ${group_search.status}`,
      timing: group_search.headers.get("Server-Timing") || undefined
    };

    if (group_search.status === 200) {
      const json = await group_search.json();
      if (json) {
        let cardCount = 0;
        if (json.results) {
          cardCount = json.results.length;
        } else if (json.chunks) {
          cardCount = json.chunks.length;
        }
        
        response.groupSearch.cardCount = cardCount;
        
        if (cardCount === 0) {
          response.groupSearch.healthy = false;
          response.groupSearch.status = "No cards found";
        }
      }
    } else if (group_search.status === 400) {
      response.groupSearch.response = await group_search.text();
    }
  } catch (e) {
    response.groupSearch = {
      healthy: false,
      status: "Fetch failed"
    };
  }

  saveHealthCheck(dataset_id ?? "", response);

  return new Response(JSON.stringify(response));
}; 