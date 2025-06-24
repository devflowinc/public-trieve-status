import { createSignal, createEffect, Show, onMount, onCleanup, For } from "solid-js";
import type { HealthHistoryPoint, IngestHistoryPoint } from "../pages/api/healthhistory";
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { FiRefreshCcw, FiDatabase } from "solid-icons/fi";

export const HealthGraphs = () => {
  const [healthHistory, setHealthHistory] = createSignal<HealthHistoryPoint[]>([]);
  const [ingestHistory, setIngestHistory] = createSignal<IngestHistoryPoint[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [canvasElements, setCanvasElements] = createSignal<Map<string, HTMLCanvasElement>>(new Map());
  const [queueNames, setQueueNames] = createSignal<string[]>([]);
  const charts = new Map<string, Chart>();

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/healthhistory");
      if (!response.ok) {
        throw new Error(`Failed to fetch history data: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthHistory(data.health || []);
      setIngestHistory(data.ingest || []);
      
      const queues = [...new Set(data.ingest.map((item: IngestHistoryPoint) => item.queue))];
      setQueueNames(queues as string[]);
      
      setError(null);
      
      updateCharts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const registerCanvas = (queue: string, element: HTMLCanvasElement) => {
    setCanvasElements(prev => {
      const newMap = new Map(prev);
      newMap.set(queue, element);
      return newMap;
    });
  };

  const updateCharts = () => {
    queueNames().forEach(queue => {
      const canvas = canvasElements().get(queue);
      if (!canvas) return;
      
      if (charts.has(queue)) {
        // Update existing chart
        updateQueueChart(queue);
      } else {
        // Initialize new chart
        initQueueChart(queue, canvas);
      }
    });
  };

  const initQueueChart = (queue: string, canvas: HTMLCanvasElement) => {
    const data = getQueueData(queue);
    
    const chart = new Chart(canvas, {
      type: 'line', 
      data: {
        datasets: [{
          label: 'Queue Length',
          data: data,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          borderWidth: 2,
          tension: 0,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: 'rgb(147, 51, 234)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
              tooltipFormat: 'MMM d, h:mm a',
              displayFormats: {
                minute: 'h:mm a'
              }
            },
            title: {
              display: true,
              text: 'Time',
              color: '#e2e8f0',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#e2e8f0',
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Queue Length',
              color: '#e2e8f0',
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#e2e8f0',
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Queue Length: ${context.parsed.y}`;
              }
            }
          }
        }
      }
    });
    
    charts.set(queue, chart);
  };

  // Update chart for a specific queue
  const updateQueueChart = (queue: string) => {
    const chart = charts.get(queue);
    if (!chart) return;
    
    const data = getQueueData(queue);
    chart.data.datasets[0].data = data;
    chart.update();
  };

  // Get data for a specific queue
  const getQueueData = (queue: string) => {
    return ingestHistory()
      .filter(point => point.queue === queue)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(point => ({
        x: new Date(point.timestamp).getTime(),
        y: point.length
      }));
  };

  // Get a color for a specific queue (for consistent coloring)
  const getQueueColor = (queue: string, alpha: number) => {
    // Generate a consistent color based on the queue name
    const hash = queue.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const h = Math.abs(hash % 360);
    const s = 70;
    const l = 60;
    
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  };

  // Get a friendly name for the queue
  const getQueueDisplayName = (queue: string) => {
    // Extract the main part of the queue name
    const parts = queue.split('_');
    if (parts.length > 1) {
      return parts.slice(0, -1).join('_');
    }
    return queue;
  };

  createEffect(() => {
    fetchHistoryData();
    const interval = setInterval(() => {
      fetchHistoryData();
    }, 300000);
    return () => clearInterval(interval);
  });

  createEffect(() => {
    if (queueNames().length > 0 && canvasElements().size > 0) {
      updateCharts();
    }
  });

  onCleanup(() => {
    // Clean up all charts
    charts.forEach(chart => {
      chart.destroy();
    });
    charts.clear();
  });

  // Group health data by search type
  const groupedHealthData = () => {
    const grouped: Record<string, HealthHistoryPoint[]> = {};
    
    healthHistory().forEach(point => {
      const key = point.search_type;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(point);
    });
    
    return grouped;
  };

  // Calculate average latency by search type
  const averageLatencyByType = () => {
    const grouped = groupedHealthData();
    const result: Record<string, number> = {};
    
    Object.entries(grouped).forEach(([type, points]) => {
      const validPoints = points.filter(p => p.latency > 0);
      if (validPoints.length > 0) {
        const sum = validPoints.reduce((acc, point) => acc + point.latency, 0);
        result[type] = Math.round(sum / validPoints.length);
      } else {
        result[type] = 0;
      }
    });
    
    return result;
  };

  // Calculate availability percentage by search type
  const availabilityByType = () => {
    const grouped = groupedHealthData();
    const result: Record<string, number> = {};
    
    Object.entries(grouped).forEach(([type, points]) => {
      if (points.length > 0) {
        const successfulPoints = points.filter(p => p.status.includes("200 OK"));
        result[type] = Math.round((successfulPoints.length / points.length) * 100);
      } else {
        result[type] = 0;
      }
    });
    
    return result;
  };

  return (
    <div class="mt-8">
      <h2 class="text-2xl mb-4">Performance Metrics</h2>
      
      <Show when={!error()} fallback={<div class="text-red-500">{error()}</div>}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Latency Chart */}
          <div class="bg-[rgb(28,25,31)] p-4 rounded-lg">
            <h3 class="text-xl mb-3">Average Latency (ms)</h3>
            <div class="space-y-3">
              {Object.entries(averageLatencyByType()).map(([type, latency]) => (
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span>{type}</span>
                    <span>{latency} ms</span>
                  </div>
                  <div class="w-full bg-shark-800 rounded-full h-2.5">
                    <div 
                      class="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(latency / 2000 * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Availability Chart */}
          <div class="bg-[rgb(28,25,31)] p-4 rounded-lg">
            <h3 class="text-xl mb-3">API Availability (%)</h3>
            <div class="space-y-3">
              {Object.entries(availabilityByType()).map(([type, availability]) => (
                <div>
                  <div class="flex justify-between text-sm mb-1">
                    <span>{type}</span>
                    <span>{availability}%</span>
                  </div>
                  <div class="w-full bg-shark-800 rounded-full h-2.5">
                    <div 
                      class="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${availability}%` }}
                      classList={{
                        "bg-red-500": availability < 90,
                        "bg-yellow-500": availability >= 90 && availability < 99,
                        "bg-green-500": availability >= 99
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Individual Queue Charts */}
          <For each={queueNames()}>
            {(queue) => (
              <div class="bg-[rgb(28,25,31)] p-4 rounded-lg md:col-span-2">
                <h3 class="text-xl mb-3 flex items-center gap-2">
                  <FiDatabase style={{ color: 'rgb(147, 51, 234)' }} />
                  <span>{getQueueDisplayName(queue)} Queue</span>
                </h3>
                <Show 
                  when={ingestHistory().some(p => p.queue === queue)} 
                  fallback={<div>No data available for this queue</div>}
                >
                  <div class="h-64">
                    <canvas ref={(el) => registerCanvas(queue, el)}></canvas>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
      
      <div class="mt-4 text-right">
        <button 
          onClick={fetchHistoryData}
          class="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
        >
          <FiRefreshCcw classList={{
            "animate-spin": loading()
          }}/>
          Refresh Metrics
        </button>
      </div>
    </div>
  );
}; 