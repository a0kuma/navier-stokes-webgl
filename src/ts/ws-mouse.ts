export interface MousePoint {
  pos: [number, number];
  movement: [number, number];
}

export type PointsUpdateCallback = (points: MousePoint[]) => void;

export class MultiMouseWS {
  url: string;
  points: MousePoint[];
  onPointsUpdate?: PointsUpdateCallback;
  ws: WebSocket | null;

  constructor(url: string, onPointsUpdate?: PointsUpdateCallback) {
    this.url = url;
    this.points = [];
    this.onPointsUpdate = onPointsUpdate;
    this.ws = null;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => console.log('WS connected');
    this.ws.onclose = () => console.log('WS closed');
    this.ws.onerror = (err) => console.error('WS error', err);
    this.ws.onmessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        // 支援格式: [[x, y], ...] 或 [{pos:[x,y], movement:[dx,dy]}, ...]
        if (Array.isArray(data)) {
          if (typeof data[0]?.pos !== "undefined") {
            this.points = data as MousePoint[];
          } else {
            this.points = (data as [number, number][]).map(([x, y]) => ({ pos: [x, y], movement: [0, 0] }));
          }
          if (this.onPointsUpdate) this.onPointsUpdate(this.points);
        }
      } catch (e) {
        console.warn('Non-JSON message:', ev.data);
      }
    };
  }
}