import { MousePoint } from "./ws-mouse";

export interface DynamicObstacle {
  pos: [number, number];      // 位置 (0-1標準化座標)
  vel: [number, number];      // 速度
  size: [number, number];     // 大小
  mass: number;               // 質量
  friction: number;           // 摩擦係數
  restitution: number;        // 彈性係數 (0-1)
  id: number;                 // 唯一識別
}

export class DynamicObstacleSystem {
  private obstacles: DynamicObstacle[] = [];
  private nextId: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  // 創建新的動態障礙物
  createObstacle(
    pos: [number, number], 
    size: [number, number] = [0.02, 0.02], 
    mass: number = 1.0,
    friction: number = 0.95,
    restitution: number = 0.8
  ): DynamicObstacle {
    const obstacle: DynamicObstacle = {
      pos,
      vel: [0, 0],
      size,
      mass,
      friction,
      restitution,
      id: this.nextId++
    };
    
    this.obstacles.push(obstacle);
    return obstacle;
  }

  // 檢測點與障礙物的碰撞
  private checkPointObstacleCollision(point: MousePoint, obstacle: DynamicObstacle): boolean {
    const dx = point.pos[0] - obstacle.pos[0];
    const dy = point.pos[1] - obstacle.pos[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 假設點的半徑為0.005，障礙物半徑為size的平均值
    const pointRadius = 0.005;
    const obstacleRadius = (obstacle.size[0] + obstacle.size[1]) * 0.5;
    
    return distance < (pointRadius + obstacleRadius);
  }

  // 處理點與障礙物的碰撞
  private handlePointObstacleCollision(point: MousePoint, obstacle: DynamicObstacle): void {
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
    
    // 計算彈性碰撞
    const pointMass = 0.1; // 假設點的質量
    const e = obstacle.restitution;
    const j = -(1 + e) * velAlongNormal / (1/pointMass + 1/obstacle.mass);
    
    // 更新障礙物速度 (點的速度由外部系統控制，所以我們不直接修改)
    const impulseX = j * nx;
    const impulseY = j * ny;
    
    obstacle.vel[0] += impulseX / obstacle.mass;
    obstacle.vel[1] += impulseY / obstacle.mass;
    
    // 分離重疊的物體
    const pointRadius = 0.005;
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

  // 檢測障礙物與邊界的碰撞
  private handleBoundaryCollision(obstacle: DynamicObstacle): void {
    const halfSizeX = obstacle.size[0] * 0.5;
    const halfSizeY = obstacle.size[1] * 0.5;
    
    // 左右邊界
    if (obstacle.pos[0] - halfSizeX < 0) {
      obstacle.pos[0] = halfSizeX;
      obstacle.vel[0] = -obstacle.vel[0] * obstacle.restitution;
    } else if (obstacle.pos[0] + halfSizeX > 1) {
      obstacle.pos[0] = 1 - halfSizeX;
      obstacle.vel[0] = -obstacle.vel[0] * obstacle.restitution;
    }
    
    // 上下邊界
    if (obstacle.pos[1] - halfSizeY < 0) {
      obstacle.pos[1] = halfSizeY;
      obstacle.vel[1] = -obstacle.vel[1] * obstacle.restitution;
    } else if (obstacle.pos[1] + halfSizeY > 1) {
      obstacle.pos[1] = 1 - halfSizeY;
      obstacle.vel[1] = -obstacle.vel[1] * obstacle.restitution;
    }
  }

  // 檢測障礙物之間的碰撞
  private handleObstacleCollisions(): void {
    for (let i = 0; i < this.obstacles.length; i++) {
      for (let j = i + 1; j < this.obstacles.length; j++) {
        const obs1 = this.obstacles[i];
        const obs2 = this.obstacles[j];
        
        const dx = obs2.pos[0] - obs1.pos[0];
        const dy = obs2.pos[1] - obs1.pos[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const radius1 = (obs1.size[0] + obs1.size[1]) * 0.5;
        const radius2 = (obs2.size[0] + obs2.size[1]) * 0.5;
        const minDistance = radius1 + radius2;
        
        if (distance < minDistance && distance > 0) {
          // 標準化碰撞方向
          const nx = dx / distance;
          const ny = dy / distance;
          
          // 相對速度
          const relativeVelX = obs2.vel[0] - obs1.vel[0];
          const relativeVelY = obs2.vel[1] - obs1.vel[1];
          const velAlongNormal = relativeVelX * nx + relativeVelY * ny;
          
          if (velAlongNormal > 0) continue;
          
          // 彈性碰撞計算
          const e = Math.min(obs1.restitution, obs2.restitution);
          const j = -(1 + e) * velAlongNormal / (1/obs1.mass + 1/obs2.mass);
          
          const impulseX = j * nx;
          const impulseY = j * ny;
          
          obs1.vel[0] -= impulseX / obs1.mass;
          obs1.vel[1] -= impulseY / obs1.mass;
          obs2.vel[0] += impulseX / obs2.mass;
          obs2.vel[1] += impulseY / obs2.mass;
          
          // 分離重疊
          const overlap = minDistance - distance;
          const separationX = nx * overlap * 0.5;
          const separationY = ny * overlap * 0.5;
          
          obs1.pos[0] -= separationX;
          obs1.pos[1] -= separationY;
          obs2.pos[0] += separationX;
          obs2.pos[1] += separationY;
        }
      }
    }
  }

  // 更新動態障礙物系統
  update(mousePoints: MousePoint[], deltaTime: number): void {
    // 檢測滑鼠點與障礙物的碰撞
    for (const point of mousePoints) {
      for (const obstacle of this.obstacles) {
        if (this.checkPointObstacleCollision(point, obstacle)) {
          this.handlePointObstacleCollision(point, obstacle);
        }
      }
    }
    
    // 更新每個障礙物
    for (const obstacle of this.obstacles) {
      // 應用摩擦力
      obstacle.vel[0] *= obstacle.friction;
      obstacle.vel[1] *= obstacle.friction;
      
      // 更新位置
      obstacle.pos[0] += obstacle.vel[0] * deltaTime;
      obstacle.pos[1] += obstacle.vel[1] * deltaTime;
      
      // 處理邊界碰撞
      this.handleBoundaryCollision(obstacle);
    }
    
    // 處理障礙物間的碰撞
    this.handleObstacleCollisions();
  }

  // 獲取所有障礙物
  getObstacles(): DynamicObstacle[] {
    return this.obstacles;
  }

  // 移除障礙物
  removeObstacle(id: number): void {
    this.obstacles = this.obstacles.filter(obs => obs.id !== id);
  }

  // 清空所有障礙物
  clear(): void {
    this.obstacles = [];
  }

  // 更新畫布大小
  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
