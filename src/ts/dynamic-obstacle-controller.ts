import { DynamicObstacle, DynamicObstacleSystem } from "./dynamic-obstacle";
import { MousePointRenderer } from "./mouse-point-renderer";
import ObstacleMap from "./obstacle-map";

export interface DynamicObstacleControlConfig {
  enabled: boolean;
  autoCreate: boolean;          // 自動創建障礙物
  maxObstacles: number;         // 最大障礙物數量
  defaultMass: number;          // 預設質量
  defaultFriction: number;      // 預設摩擦係數
  defaultRestitution: number;   // 預設彈性係數
  defaultSize: [number, number]; // 預設大小
}

export class DynamicObstacleController {
  private obstacleMap: ObstacleMap;
  private mouseRenderer: MousePointRenderer;
  private config: DynamicObstacleControlConfig;
  private controlPanel: HTMLElement | null = null;

  constructor(obstacleMap: ObstacleMap, mouseRenderer: MousePointRenderer) {
    this.obstacleMap = obstacleMap;
    this.mouseRenderer = mouseRenderer;
    
    // 預設配置
    this.config = {
      enabled: false,
      autoCreate: false,
      maxObstacles: 10,
      defaultMass: 1.0,
      defaultFriction: 0.95,
      defaultRestitution: 0.8,
      defaultSize: [0.03, 0.03]
    };
    
    this.createControlPanel();
  }

  // 啟用/關閉動態障礙物系統
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      // 關閉時清除所有動態障礙物
      this.obstacleMap.clearDynamicObstacles();
      this.mouseRenderer.updateDynamicObstacles([]);
    }
    
    this.updateControlPanel();
  }

  // 檢查是否啟用
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // 手動添加障礙物
  addObstacle(
    pos?: [number, number], 
    size?: [number, number], 
    mass?: number,
    friction?: number,
    restitution?: number
  ): DynamicObstacle | null {
    if (!this.config.enabled) {
      console.warn("動態障礙物系統未啟用");
      return null;
    }

    const obstacles = this.obstacleMap.getDynamicObstacles();
    if (obstacles.length >= this.config.maxObstacles) {
      console.warn(`已達到最大障礙物數量限制: ${this.config.maxObstacles}`);
      return null;
    }

    // 使用預設值或提供的值
    const finalPos = pos || [Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2];
    const finalSize = size || this.config.defaultSize;
    const finalMass = mass !== undefined ? mass : this.config.defaultMass;
    const finalFriction = friction !== undefined ? friction : this.config.defaultFriction;
    const finalRestitution = restitution !== undefined ? restitution : this.config.defaultRestitution;

    const obstacle = this.obstacleMap.createDynamicObstacle(
      finalPos, finalSize, finalMass, finalFriction, finalRestitution
    );

    // 更新渲染器
    this.mouseRenderer.updateDynamicObstacles(this.obstacleMap.getDynamicObstacles());
    
    console.log(`創建動態障礙物 ID: ${obstacle.id}`);
    return obstacle;
  }

  // 移除障礙物
  removeObstacle(id: number): void {
    if (!this.config.enabled) return;
    
    const obstacles = this.obstacleMap.getDynamicObstacles();
    const obstacle = obstacles.find(obs => obs.id === id);
    if (obstacle) {
      this.obstacleMap.getDynamicObstacles().splice(
        this.obstacleMap.getDynamicObstacles().indexOf(obstacle), 1
      );
      this.mouseRenderer.updateDynamicObstacles(this.obstacleMap.getDynamicObstacles());
      console.log(`移除動態障礙物 ID: ${id}`);
    }
  }

  // 清除所有障礙物
  clearAllObstacles(): void {
    this.obstacleMap.clearDynamicObstacles();
    this.mouseRenderer.updateDynamicObstacles([]);
    console.log("清除所有動態障礙物");
  }

  // 更新配置
  updateConfig(newConfig: Partial<DynamicObstacleControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateControlPanel();
  }

  // 獲取當前配置
  getConfig(): DynamicObstacleControlConfig {
    return { ...this.config };
  }

  // 創建控制面板
  private createControlPanel(): void {
    // 創建控制面板容器
    this.controlPanel = document.createElement('div');
    this.controlPanel.id = 'dynamic-obstacle-control';
    this.controlPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000;
      min-width: 200px;
    `;

    this.updateControlPanel();
    document.body.appendChild(this.controlPanel);
  }

  // 更新控制面板
  private updateControlPanel(): void {
    if (!this.controlPanel) return;

    const obstacles = this.obstacleMap.getDynamicObstacles();
    
    this.controlPanel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #fff;">動態障礙物控制</h3>
      
      <div style="margin-bottom: 10px;">
        <label>
          <input type="checkbox" id="enableToggle" ${this.config.enabled ? 'checked' : ''}>
          啟用動態障礙物
        </label>
      </div>
      
      ${this.config.enabled ? `
        <div style="border-top: 1px solid #666; padding-top: 10px;">
          <div style="margin-bottom: 8px;">
            <label>最大數量: 
              <input type="number" id="maxObstacles" value="${this.config.maxObstacles}" 
                     min="1" max="50" style="width: 50px;">
            </label>
          </div>
          
          <div style="margin-bottom: 8px;">
            <label>預設質量: 
              <input type="number" id="defaultMass" value="${this.config.defaultMass}" 
                     min="0.1" max="10" step="0.1" style="width: 50px;">
            </label>
          </div>
          
          <div style="margin-bottom: 8px;">
            <label>摩擦係數: 
              <input type="number" id="defaultFriction" value="${this.config.defaultFriction}" 
                     min="0" max="1" step="0.05" style="width: 50px;">
            </label>
          </div>
          
          <div style="margin-bottom: 8px;">
            <label>彈性係數: 
              <input type="number" id="defaultRestitution" value="${this.config.defaultRestitution}" 
                     min="0" max="1" step="0.1" style="width: 50px;">
            </label>
          </div>
          
          <div style="margin: 10px 0;">
            <button id="addObstacle" style="padding: 5px 10px; margin-right: 5px;">
              添加障礙物
            </button>
            <button id="clearObstacles" style="padding: 5px 10px;">
              清除全部
            </button>
          </div>
          
          <div style="border-top: 1px solid #666; padding-top: 8px; font-size: 11px;">
            <div>當前障礙物: ${obstacles.length}/${this.config.maxObstacles}</div>
            ${obstacles.length > 0 ? `
              <div style="max-height: 100px; overflow-y: auto; margin-top: 5px;">
                ${obstacles.map(obs => `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin: 2px 0;">
                    <span>ID ${obs.id} (M:${obs.mass.toFixed(1)})</span>
                    <button onclick="window.dynamicObstacleController?.removeObstacle(${obs.id})" 
                            style="padding: 1px 5px; font-size: 10px;">移除</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;

    this.bindControlEvents();
  }

  // 綁定控制事件
  private bindControlEvents(): void {
    if (!this.controlPanel) return;

    // 啟用/關閉切換
    const enableToggle = this.controlPanel.querySelector('#enableToggle') as HTMLInputElement;
    if (enableToggle) {
      enableToggle.addEventListener('change', (e) => {
        this.setEnabled((e.target as HTMLInputElement).checked);
      });
    }    // 配置更新
    ['maxObstacles', 'defaultMass', 'defaultFriction', 'defaultRestitution'].forEach(id => {
      const input = this.controlPanel!.querySelector(`#${id}`) as HTMLInputElement;
      if (input) {
        input.addEventListener('change', () => {
          const value = parseFloat(input.value);
          if (id === 'maxObstacles') {
            this.config.maxObstacles = value;
          } else if (id === 'defaultMass') {
            this.config.defaultMass = value;
          } else if (id === 'defaultFriction') {
            this.config.defaultFriction = value;
          } else if (id === 'defaultRestitution') {
            this.config.defaultRestitution = value;
          }
        });
      }
    });

    // 添加障礙物按鈕
    const addButton = this.controlPanel.querySelector('#addObstacle') as HTMLButtonElement;
    if (addButton) {
      addButton.addEventListener('click', () => {
        this.addObstacle();
      });
    }

    // 清除全部按鈕
    const clearButton = this.controlPanel.querySelector('#clearObstacles') as HTMLButtonElement;
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearAllObstacles();
      });
    }

    // 暴露到全域，讓移除按鈕可以使用
    (window as any).dynamicObstacleController = this;
  }

  // 更新動態障礙物（每幀調用）
  update(mousePoints: any[], deltaTime: number): void {
    if (!this.config.enabled) return;

    // 更新障礙物物理
    this.obstacleMap.updateDynamicObstacles(mousePoints, deltaTime);
    
    // 更新渲染
    this.mouseRenderer.updateDynamicObstacles(this.obstacleMap.getDynamicObstacles());
  }

  // 移除控制面板
  destroy(): void {
    if (this.controlPanel && this.controlPanel.parentElement) {
      this.controlPanel.parentElement.removeChild(this.controlPanel);
    }
    delete (window as any).dynamicObstacleController;
  }
}
