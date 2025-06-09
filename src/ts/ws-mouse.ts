export interface MousePoint {
  pos: [number, number];
  movement: [number, number];
}

// 动态障碍物接口 (为了避免循环依赖)
export interface DynamicObstacle {
  id: number;
  pos: [number, number];
  vel: [number, number];
  size: [number, number];
  mass: number;
  friction: number;
  restitution: number;
}

export type PointsUpdateCallback = (points: MousePoint[]) => void;

// 碰撞检测工具类
export class CollisionDetector {
  // 检测点与障碍物的碰撞
  static checkPointObstacleCollision(point: MousePoint, obstacle: DynamicObstacle): boolean {
    const dx = point.pos[0] - obstacle.pos[0];
    const dy = point.pos[1] - obstacle.pos[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 假設點的半徑為0.01，障礙物半徑為size的平均值
    const pointRadius = 0.01;
    const obstacleRadius = (obstacle.size[0] + obstacle.size[1]) * 0.5;
    
    return distance < (pointRadius + obstacleRadius);
  }
  
  // 处理点与障碍物的碰撞
  static handlePointObstacleCollision(point: MousePoint, obstacle: DynamicObstacle): void {
    const dx = point.pos[0] - obstacle.pos[0];
    const dy = point.pos[1] - obstacle.pos[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // 避免除以零
    
    // 標準化碰撞方向
    const nx = dx / distance;
    const ny = dy / distance;
    
    // 相對速度
    const relativeVelX = point.movement[0] - obstacle.vel[0];
    const relativeVelY = point.movement[1] - obstacle.vel[1];
    
    // 相對速度在碰撞法線方向的分量
    const velAlongNormal = relativeVelX * nx + relativeVelY * ny;
    
    // 如果物體正在分離，不處理碰撞
    if (velAlongNormal > 0) return;
    
    console.log(`💥 WS點碰撞! 點:[${point.pos[0].toFixed(3)}, ${point.pos[1].toFixed(3)}] 障礙物ID:${obstacle.id} 路徑:${distance.toFixed(4)}`);
    
    // 計算彈性碰撞
    const pointMass = 0.1; // 假設點的質量
    const e = obstacle.restitution;
    const j = -(1 + e) * velAlongNormal / (1/pointMass + 1/obstacle.mass);
    
    // 更新障礙物速度
    const impulseX = j * nx;
    const impulseY = j * ny;
    
    obstacle.vel[0] += impulseX / obstacle.mass;
    obstacle.vel[1] += impulseY / obstacle.mass;
    
    console.log(`⚡ 障礙物ID:${obstacle.id} 新速度:[${obstacle.vel[0].toFixed(3)}, ${obstacle.vel[1].toFixed(3)}]`);
    
    // 分離重疊的物體
    const pointRadius = 0.01;
    const obstacleRadius = (obstacle.size[0] + obstacle.size[1]) * 0.5;
    const overlap = pointRadius + obstacleRadius - distance;
    
    if (overlap > 0) {
      const separationX = nx * overlap * 0.5;
      const separationY = ny * overlap * 0.5;
      
      // 只移動障礙物，避免干擾點的位置
      obstacle.pos[0] -= separationX;
      obstacle.pos[1] -= separationY;
    }
  }
}

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

  private performCollisionDetection(): void {
    // 檢查是否在動態障礙物模式下
    const Parameters = (window as any).Parameters;
    if (!Parameters || Parameters.obstacles !== "dynamic") {
      return;
    }
    
    // 獲取動態障礙物系統
    const dynamicObstacleController = (window as any).dynamicObstacleController;
    const obstacleMaps = (window as any).obstacleMaps;
    
    if (!dynamicObstacleController || !obstacleMaps || !obstacleMaps["dynamic"]) {
      return;
    }
    
    const dynamicObstacles = obstacleMaps["dynamic"].getDynamicObstacles();
    
    if (dynamicObstacles.length === 0) {
      return;
    }
    
    // 對每個點檢查與障礙物的碰撞
    this.points.forEach((point: MousePoint) => {
      dynamicObstacles.forEach((obstacle: DynamicObstacle) => {
        if (CollisionDetector.checkPointObstacleCollision(point, obstacle)) {
          console.log(`💥 碰撞檢測: 點[${point.pos[0].toFixed(3)}, ${point.pos[1].toFixed(3)}] 與障礙物ID:${obstacle.id} 發生碰撞`);
          CollisionDetector.handlePointObstacleCollision(point, obstacle);
        }
      });
    });
    
    // 碰撞後需要重繪所有動態障礙物到GPU紋理
    obstacleMaps["dynamic"].redrawAllDynamicObstacles();
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