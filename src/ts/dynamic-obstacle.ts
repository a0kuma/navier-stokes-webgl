import { MousePoint } from "./ws-mouse";


// 動態障礙物介面
export interface DynamicObstacle {
  id: number;
  pos: [number, number];     // 位置 (0-1 標準化座標)
  vel: [number, number];     // 速度
  size: [number, number];    // 大小
  mass: number;              // 質量
  friction: number;          // 摩擦係數
  restitution: number;       // 彈性係數 (0-1)
}

// 動態障礙物系統
export class DynamicObstacleSystem {
  private obstacles: DynamicObstacle[] = [];
  private nextId: number = 0;

  constructor() {
    // 初始化時隨機生成15個障礙物
    this.initializeRandomObstacles();
  }

  // 初始化隨機障礙物（類似many模式但位置隨機）
  private initializeRandomObstacles(): void {
    const obstacleCount = 15;
    
    for (let i = 0; i < obstacleCount; i++) {
      // 隨機位置，避免靠太近邊界
      const pos: [number, number] = [
        Math.random() * 0.6 + 0.2,  // 0.2 到 0.8
        Math.random() * 0.6 + 0.2   // 0.2 到 0.8
      ];
      
      // 隨機大小，但保持合理範圍
      const baseSize = 0.015;
      const sizeVariation = Math.random() * 0.01;
      const size: [number, number] = [baseSize + sizeVariation, baseSize + sizeVariation];
      
      // 創建障礙物
      const obstacle: DynamicObstacle = {
        id: this.nextId++,
        pos,
        vel: [0, 0],           // 初始速度為0
        size,
        mass: 1.0 + Math.random() * 0.5,  // 質量在1.0-1.5之間
        friction: 0.95,
        restitution: 0.8
      };
      
      this.obstacles.push(obstacle);
    }
    
    console.log(`✨ 初始化動態障礙物系統，創建了 ${obstacleCount} 個隨機障礙物`);
  }

  // 檢查點與障礙物的碰撞
  checkCollisionWithMousePoints(points: MousePoint[]): void {
    points.forEach((point, pointIndex) => {
      const [x, y] = point.pos;
      
      this.obstacles.forEach((obstacle, obstacleIndex) => {
        const distance = Math.sqrt(
          Math.pow(x - obstacle.pos[0], 2) + 
          Math.pow(y - obstacle.pos[1], 2)
        );
        
        // 使用與 "one" 模式相同的碰撞閾值
        const collisionThreshold = 0.05;
        
        if (distance < collisionThreshold) {
          console.log(`WS Mouse Point ${pointIndex} 碰撞到動態障礙物 ${obstacle.id}！位置: [${x.toFixed(3)}, ${y.toFixed(3)}], 障礙物位置: [${obstacle.pos[0].toFixed(3)}, ${obstacle.pos[1].toFixed(3)}]`);
          
          // 使用與 "one" 模式相同的碰撞邏輯
          this.handleCollision(point, obstacle, distance);
        }
      });
    });
  }

  // 處理碰撞邏輯（類似 "one" 模式）
  private handleCollision(point: MousePoint, obstacle: DynamicObstacle, distance: number): void {
    if (distance === 0) return; // 避免除零錯誤
    
    // 計算從障礙物到鼠標點的向量
    const vectorX = point.pos[0] - obstacle.pos[0];
    const vectorY = point.pos[1] - obstacle.pos[1];
    
    // 正規化向量
    const normalizedX = vectorX / distance;
    const normalizedY = vectorY / distance;
    
    // 障礙物往反方向移動（乘以負號），移動量乘以碰撞速度
    // 從全域參數中獲取碰撞速度
    const collisionSpeed = (window as any).Parameters?.collision?.speed || 0.02;
    const moveX = -normalizedX * collisionSpeed;
    const moveY = -normalizedY * collisionSpeed;
    
    // 更新障礙物位置
    obstacle.pos[0] += moveX;
    obstacle.pos[1] += moveY;
    
    // 確保障礙物不會移出邊界
    const halfSizeX = obstacle.size[0] * 0.5;
    const halfSizeY = obstacle.size[1] * 0.5;
    
    obstacle.pos[0] = Math.max(halfSizeX, Math.min(1 - halfSizeX, obstacle.pos[0]));
    obstacle.pos[1] = Math.max(halfSizeY, Math.min(1 - halfSizeY, obstacle.pos[1]));

  }

  // 獲取所有障礙物
  getObstacles(): DynamicObstacle[] {
    return this.obstacles;
  }


  // 清除所有障礙物
  clear(): void {
    this.obstacles = [];
    this.nextId = 0;
  }

  // 重新初始化（當切換到動態模式時調用）
  reset(): void {
    this.clear();
    this.initializeRandomObstacles();

  }
}
