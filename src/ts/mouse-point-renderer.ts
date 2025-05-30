import { MousePoint } from "./ws-mouse";
import { DynamicObstacle } from "./dynamic-obstacle";

export class MousePointRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private overlayCanvas: HTMLCanvasElement;
    private overlayCtx: CanvasRenderingContext2D;
    private points: MousePoint[] = [];
    private dynamicObstacles: DynamicObstacle[] = [];

    constructor(targetCanvas: HTMLCanvasElement) {
        this.canvas = targetCanvas;
        
        // 創建一個覆蓋層 Canvas 來繪製點，避免干擾 WebGL 渲染
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none'; // 讓滑鼠事件穿透
        this.overlayCanvas.style.zIndex = '10';
        
        // 設置覆蓋層 Canvas 的大小
        this.updateCanvasSize();
        
        // 將覆蓋層插入到目標 Canvas 的父元素中
        if (this.canvas.parentElement) {
            this.canvas.parentElement.appendChild(this.overlayCanvas);
            // 確保父元素有相對定位
            if (getComputedStyle(this.canvas.parentElement).position === 'static') {
                this.canvas.parentElement.style.position = 'relative';
            }
        }
        
        this.overlayCtx = this.overlayCanvas.getContext('2d')!;
        
        // 監聽目標 Canvas 大小變化
        const resizeObserver = new ResizeObserver(() => {
            this.updateCanvasSize();
        });
        resizeObserver.observe(this.canvas);
    }

    private updateCanvasSize(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.overlayCanvas.width = rect.width;
        this.overlayCanvas.height = rect.height;
        this.overlayCanvas.style.width = rect.width + 'px';
        this.overlayCanvas.style.height = rect.height + 'px';
    }

    updatePoints(points: MousePoint[]): void {
        this.points = points;
        this.render();
    }

    // 新增：更新動態障礙物
    updateDynamicObstacles(obstacles: DynamicObstacle[]): void {
        this.dynamicObstacles = obstacles;
        this.render();
    }

    private render(): void {
        // 清除畫布
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        const canvasWidth = this.overlayCanvas.width;
        const canvasHeight = this.overlayCanvas.height;

        // 繪製動態障礙物
        this.renderDynamicObstacles(canvasWidth, canvasHeight);
        
        if (this.points.length === 0) return;

        // 繪製滑鼠點
        this.points.forEach((point, index) => {
            // 將標準化座標 (0-1) 轉換為畫布像素座標
            const x = point.pos[0] * canvasWidth;
            const y = (1.0-point.pos[1]) * canvasHeight;//!important這裡很重要不要給我改掉
            
            // 為每個點設置不同顏色
            const hue = (index * 137.5) % 360; // 使用黃金角度分佈顏色
            const color = `hsl(${hue}, 70%, 60%)`;
            
            // 繪製點
            this.drawPoint(x, y, color, index);
            
            // 如果有移動向量，繪製移動軌跡
            if (point.movement[0] !== 0 || point.movement[1] !== 0) {
                this.drawMovement(x, y, point.movement, color, canvasWidth, canvasHeight);
            }
        });
    }

    private renderDynamicObstacles(canvasWidth: number, canvasHeight: number): void {
        this.dynamicObstacles.forEach((obstacle, index) => {
            // 將標準化座標轉換為畫布像素座標
            const x = obstacle.pos[0] * canvasWidth;
            const y = (1.0 - obstacle.pos[1]) * canvasHeight;
            const sizeX = obstacle.size[0] * canvasWidth;
            const sizeY = obstacle.size[1] * canvasHeight;
            
            // 繪製障礙物
            this.drawObstacle(x, y, sizeX, sizeY, obstacle, index);
            
            // 如果障礙物有速度，繪製速度向量
            if (obstacle.vel[0] !== 0 || obstacle.vel[1] !== 0) {
                this.drawObstacleVelocity(x, y, obstacle.vel, canvasWidth, canvasHeight);
            }
        });
    }

    private drawPoint(x: number, y: number, color: string, index: number): void {
        const ctx = this.overlayCtx;
        
        // 繪製外圈
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        
        // 繪製內圈
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.9;
        ctx.fill();
        
        // 繪製點編號
        ctx.fillStyle = 'black';
        ctx.globalAlpha = 1.0;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), x, y);
        
        // 重置透明度
        ctx.globalAlpha = 1.0;
    }

    private drawMovement(x: number, y: number, movement: [number, number], color: string, canvasWidth: number, canvasHeight: number): void {
        const ctx = this.overlayCtx;
        
        // 將移動向量轉換為像素
        const moveX = movement[0] * canvasWidth * 100; // 放大移動向量以便可視化
        const moveY = movement[1] * canvasHeight * 100;
        
        // 只有在移動向量足夠大時才繪製
        const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        if (magnitude < 5) return;
        
        // 繪製箭頭
        const endX = x + moveX;
        const endY = y + moveY;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        
        // 繪製箭頭頭部
        const angle = Math.atan2(moveY, moveX);
        const headLength = Math.min(15, magnitude * 0.3);
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
    }

    private drawObstacle(x: number, y: number, sizeX: number, sizeY: number, obstacle: DynamicObstacle, index: number): void {
        const ctx = this.overlayCtx;
        
        // 計算顏色基於障礙物質量和摩擦力
        const hue = (obstacle.mass * 60 + obstacle.friction * 120) % 360;
        const color = `hsl(${hue}, 80%, 50%)`;
        
        // 繪製障礙物主體（圓形或橢圓）
        ctx.beginPath();
        ctx.ellipse(x, y, sizeX/2, sizeY/2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        
        // 繪製邊框
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1.0;
        ctx.stroke();
        
        // 繪製障礙物 ID
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`O${obstacle.id}`, x, y);
        
        // 顯示障礙物屬性（質量、摩擦力、彈性）
        ctx.font = '8px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(`M:${obstacle.mass.toFixed(1)} F:${obstacle.friction.toFixed(2)} R:${obstacle.restitution.toFixed(2)}`, 
                    x, y + sizeY/2 + 10);
    }

    private drawObstacleVelocity(x: number, y: number, velocity: [number, number], canvasWidth: number, canvasHeight: number): void {
        const ctx = this.overlayCtx;
        
        // 將速度轉換為像素並放大以便可視化
        const velX = velocity[0] * canvasWidth * 200;
        const velY = -velocity[1] * canvasHeight * 200; // 注意Y軸翻轉
        
        const magnitude = Math.sqrt(velX * velX + velY * velY);
        if (magnitude < 3) return; // 太小的速度不顯示
        
        const endX = x + velX;
        const endY = y + velY;
        
        // 繪製速度箭頭
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        
        // 繪製箭頭頭部
        const angle = Math.atan2(velY, velX);
        const headLength = Math.min(12, magnitude * 0.2);
        
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
    }

    destroy(): void {
        if (this.overlayCanvas.parentElement) {
            this.overlayCanvas.parentElement.removeChild(this.overlayCanvas);
        }
    }
}
