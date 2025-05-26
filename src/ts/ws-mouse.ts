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
  private isConnected: boolean;
  private fps: number;
  private sendInterval: number | null;

  constructor(url: string, onPointsUpdate?: PointsUpdateCallback, fps: number = 10) {
    this.url = url;
    this.points = [];
    this.onPointsUpdate = onPointsUpdate;
    this.ws = null;
    this.isConnected = false;
    this.fps = fps;
    this.sendInterval = null;
  }
  connect(): void {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WS connected');
      this.isConnected = true;
      this.startSendLoop();
    };
    
    this.ws.onclose = () => {
      console.log('WS closed');
      this.isConnected = false;
      this.stopSendLoop();
    };
    
    this.ws.onerror = (err) => {
      console.error('WS error', err);
      this.isConnected = false;
    };
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
          
          // 檢查與障礙物的碰撞並 console log
          if ((window as any).checkCollisionWithObstacles && this.points.length > 0) {
            (window as any).checkCollisionWithObstacles(this.points);
          }
          
          if (this.onPointsUpdate) this.onPointsUpdate(this.points);
        }
      } catch (e) {
        console.warn('Non-JSON message:', ev.data);
      }
    };
  }

  private startSendLoop(): void {
    const interval = 1000 / this.fps;
    this.sendInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('detect');
      }
    }, interval);
  }

  private stopSendLoop(): void {
    if (this.sendInterval !== null) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
  }

  disconnect(): void {
    this.stopSendLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  setFPS(fps: number): void {
    this.fps = fps;
    if (this.isConnected) {
      this.stopSendLoop();
      this.startSendLoop();
    }
  }
}