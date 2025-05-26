import * as Utils from "./gl-utils/utils";
import FBO from "./gl-utils/fbo";
import * as Parameters from "./parameters";
import Brush from "./brush";
import ObstacleMap from "./obstacle-map";
import Fluid from "./fluid";
import * as Requirements from "./requirements";

import "./page-interface-generated";

// [2025新增功能] WS模擬多滑鼠 (TypeScript)
import { MultiMouseWS, MousePoint } from "./ws-mouse";
import { MousePointRenderer } from "./mouse-point-renderer";

// [2025新增功能] 動態障礙物系統
import { DynamicObstacleSystem } from "./dynamic-obstacle";

// 障礙物操作相關變數
let obstaclePosition = [0.3, 0.5];
let obstacleMaps: ObstacleMap[] = [];
let webgl: WebGLRenderingContext;
let obstacleSize = 256;

// 動態障礙物系統
let dynamicObstacleSystem: DynamicObstacleSystem | null = null;

let mousePointRenderer: MousePointRenderer | null = null;

// callback：把多滑鼠座標給流體模擬和視覺化
function updateFluidWithMultiMouse(points: MousePoint[]): void {
  // 暫存全域供 fluid.ts 使用
  (window as any).multiMousePoints = points;
  
  // 更新點的視覺化
  if (mousePointRenderer) {
    mousePointRenderer.updatePoints(points);
  }
}

// 檢查滑鼠點是否與障礙物碰撞
function checkCollisionWithObstacles(points: MousePoint[]): void {
  if (!obstacleMaps || !webgl) return;
  
  const currentObstacleMap: ObstacleMap = obstacleMaps[Parameters.obstacles];
  if (!currentObstacleMap) return;
  
  // 根據不同的障礙物模式進行碰撞檢測
  if (Parameters.obstacles === "dynamic") {
    // 動態障礙物模式：使用動態障礙物系統進行碰撞檢測
    if (dynamicObstacleSystem) {
      dynamicObstacleSystem.checkCollisionWithMousePoints(points);
    }
    return;
  }
  
  points.forEach((point, index) => {
    const [x, y] = point.pos;
    // 檢查點是否在障礙物內
    // 這裡我們簡化檢測：如果有 "one" 障礙物，檢查是否在障礙物附近
    if (Parameters.obstacles === "one") {
      const distance = Math.sqrt(
        Math.pow(x - obstaclePosition[0], 2) + 
        Math.pow(y - obstaclePosition[1], 2)
      );
      if (distance < 0.05) { // 碰撞閾值
        console.log(`WS Mouse Point ${index} 碰撞到障礙物！位置: [${x.toFixed(3)}, ${y.toFixed(3)}], 障礙物位置: [${obstaclePosition[0].toFixed(3)}, ${obstaclePosition[1].toFixed(3)}]`);
        
        // 計算從障礙物到鼠標點的向量
        const vectorX = x - obstaclePosition[0];
        const vectorY = y - obstaclePosition[1];
        const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
        
        if (vectorLength > 0) {
          // 正規化向量
          const normalizedX = vectorX / vectorLength;
          const normalizedY = vectorY / vectorLength;
          
          // 障礙物往反方向移動（乘以負號），移動量乘以碰撞速度
          const moveX = -normalizedX * Parameters.collision.speed;
          const moveY = -normalizedY * Parameters.collision.speed;
          
          moveObstacle(moveX, moveY);
        }
      }
    } else if (Parameters.obstacles === "many") {
      // 對於多個障礙物，檢查是否在任何一個障礙物範圍內
      // 基於 "many" 障礙物的生成模式檢查
      for (let iX = 0; iX < 5; ++iX) {
        for (let iY = -iX / 2; iY <= iX / 2; ++iY) {
          const obstacleX = 0.3 + iX * 0.07;
          const obstacleY = 0.5 + iY * 0.08;
          const distance = Math.sqrt(
            Math.pow(x - obstacleX, 2) + 
            Math.pow(y - obstacleY, 2)
          );
          if (distance < 0.03) { // 碰撞閾值稍小因為障礙物較小
            console.log(`WS Mouse Point ${index} 碰撞到多障礙物！位置: [${x.toFixed(3)}, ${y.toFixed(3)}], 障礙物位置: [${obstacleX.toFixed(3)}, ${obstacleY.toFixed(3)}]`);
            // 注意：多個障礙物目前不支持移動，因為它們是固定生成的
            return; // 只報告第一個碰撞
          }
        }
      }
    }
  });
}

// 將碰撞檢測函數暴露到全域，供 ws-mouse.ts 使用
(window as any).checkCollisionWithObstacles = checkCollisionWithObstacles;

// 將動態障礙物系統暴露到全域，供 parameters.ts 使用
(window as any).dynamicObstacleSystem = null;

// 初始化 WebSocket (設定為 60 FPS，與畫面更新同步)
const ws = new MultiMouseWS("ws://localhost:9980", updateFluidWithMultiMouse, 10);
ws.connect();

/** Initializes a WebGL context */
function initGL(canvas: HTMLCanvasElement, flags: any): WebGLRenderingContext | null {
    function setError(message: string) {
        Page.Demopage.setErrorMessage("webgl-support", message);
    }

    let gl: WebGLRenderingContext | null = canvas.getContext("webgl", flags) as WebGLRenderingContext;
    if (!gl) {
        gl = canvas.getContext("experimental-webgl", flags) as WebGLRenderingContext;
        if (!gl) {
            setError("Your browser or device does not seem to support WebGL.");
            return null;
        }
        setError("Your browser or device only supports experimental WebGL.\n" +
            "The simulation may not run as expected.");
    }

    if (gl) {
        canvas.style.cursor = "none";
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        Utils.resizeCanvas(gl, false);
    }

    return gl;
}

function main() {
    const canvas: HTMLCanvasElement | null = Page.Canvas.getCanvas();
    if (!canvas) {
        console.error("Canvas element not found");
        return;
    }
      const gl: WebGLRenderingContext | null = initGL(canvas, { alpha: false });
    if (!gl || !Requirements.check(gl))
        return;

    // TypeScript doesn't know that gl is non-null after the above check
    webgl = gl;

    // 初始化滑鼠點渲染器
    mousePointRenderer = new MousePointRenderer(canvas);

    const extensions: string[] = [
        "OES_texture_float",
        "WEBGL_color_buffer_float",
        "OES_texture_float_linear",
    ];
    Requirements.loadExtensions(webgl, extensions);    const size = 256;
    obstacleSize = size; // 設定全域變數

    const fluid = new Fluid(webgl, size, size);
    const brush = new Brush(webgl);
    obstacleMaps["none"] = new ObstacleMap(webgl, size, size);
    
    // 使用新的函數來建立可移動的障礙物
    rebuildObstacleMapOne(obstacleMaps, webgl, size, obstaclePosition);
    
    obstacleMaps["many"] = new ObstacleMap(webgl, size, size);
    {
        let size = [0.012, 0.012];
        for (let iX = 0; iX < 5; ++iX) {
            for (let iY = -iX / 2; iY <= iX / 2; ++iY) {
                size = [size[0] + 0.0005, size[1] + 0.0005];
                const pos = [0.3 + iX * 0.07, 0.5 + iY * 0.08];
                obstacleMaps["many"].addObstacle(size, pos);
            }
        }
    }
      // 初始化動態障礙物系統
    dynamicObstacleSystem = new DynamicObstacleSystem();
    (window as any).dynamicObstacleSystem = dynamicObstacleSystem; // 暴露到全域
    obstacleMaps["dynamic"] = new ObstacleMap(webgl, size, size);
    // 為動態障礙物創建初始障礙物地圖
    rebuildDynamicObstacleMap();Parameters.bind(fluid);

    // 設定障礙物鍵盤控制
    setupObstacleControls();

    /* Update the FPS indicator every second. */
    let instantFPS: number = 0;
    const updateFpsText = function () {
        Page.Canvas.setIndicatorText("fps", instantFPS.toFixed(0));
    };
    setInterval(updateFpsText, 1000);

    let lastUpdate = 0;
    function mainLoop(time: number) {
        time *= 0.001; //dt is now in seconds
        let dt = time - lastUpdate;
        instantFPS = 1 / dt;
        lastUpdate = time;

        /* If the javascript was paused (tab lost focus), the dt may be too big.
         * In that case we adjust it so the simulation resumes correctly. */
        dt = Math.min(dt, 1 / 10);        const obstacleMap: ObstacleMap = obstacleMaps[Parameters.obstacles];

        /* Updating */
        // 更新動態障礙物（如果啟用）
        if (Parameters.obstacles === "dynamic" && dynamicObstacleSystem) {
            // 重建障礙物地圖以反映當前位置
            rebuildDynamicObstacleMap();
        }
        
        if (Parameters.fluid.stream) {
            //fluid.addVel([0.1, 0.5], [0.05, 0.2], [0.4, 0]);
            /**
             * [0.1, 0.5]
→ 加速度的位置（Position）
這是流體場中加速度（流入）的中心座標，x=0.1, y=0.5，表示在畫面左側偏中間的位置。

[0.05, 0.2]
→ 加速度範圍（Sigma，標準差，影響範圍）
這是加速度影響的範圍（在 x/y 方向上的寬度，高斯分布的標準差），x 方向 0.05，y 方向 0.2，代表沿著 x 是窄的，y 是寬的橢圓形區域。

[0.4, 0]
→ 加上的速度向量（Velocity Vector）
這是施加到該區域的速度向量：x 方向 0.4，y 方向 0。代表速度往右（水平）。


             */
            fluid.addVel([0.5, 0.9], [0.3, 0.05], [0, -0.4]);
            //0.9是y上0.1是y下
        }
        fluid.update(obstacleMap);

        /* Drawing */
        FBO.bindDefault(webgl);
        webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

        if (Parameters.display.velocity) {
            fluid.drawVelocity();
        } else if (Parameters.display.pressure) {
            fluid.drawPressure();
        }

        if (Parameters.display.brush) {
            brush.draw();
        }

        if (Parameters.display.obstacles) {
            obstacleMap.draw();
        }

        if (Parameters.display.velocity && Parameters.display.pressure) {
            webgl.viewport(10, 10, 128, 128);
            fluid.drawPressure();
        }

        requestAnimationFrame(mainLoop);
    }

    requestAnimationFrame(mainLoop);

    // Add fullscreen canvas resize handling
    Page.Canvas.Observers.canvasResize.push((newWidth: number, newHeight: number) => {
        if (webgl) {
            webgl.viewport(0, 0, newWidth, newHeight);
            fluid.reset(newWidth > newHeight ? size : Math.floor(size * newWidth / newHeight), 
                       newHeight > newWidth ? size : Math.floor(size * newHeight / newWidth));
        }
    });

    // Add fullscreen toggle observer
    Page.Canvas.Observers.fullscreenToggle.push((isFullscreen: boolean) => {
        console.log(`Fullscreen state changed: ${isFullscreen}`);
        // Additional fullscreen handling if needed
    });
}

// 重建單一障礙物地圖的函數
function rebuildObstacleMapOne(obstacleMaps: ObstacleMap[], gl: WebGLRenderingContext, size: number, pos: number[]) {
    obstacleMaps["one"] = new ObstacleMap(gl, size, size);
    obstacleMaps["one"].addObstacle([0.015, 0.015], pos);
}

// 重建動態障礙物地圖的函數
function rebuildDynamicObstacleMap() {
    if (!dynamicObstacleSystem || !webgl) return;
    
    // 重新創建動態障礙物地圖
    obstacleMaps["dynamic"] = new ObstacleMap(webgl, obstacleSize, obstacleSize);
    
    // 添加所有動態障礙物到地圖中
    const obstacles = dynamicObstacleSystem.getObstacles();
    obstacles.forEach(obstacle => {
        obstacleMaps["dynamic"].addObstacle(obstacle.size, obstacle.pos);
    });
    
    console.log(`🔄 重建動態障礙物地圖，包含 ${obstacles.length} 個障礙物`);
}

// 移動障礙物的函數
function moveObstacle(dx: number, dy: number) {
    obstaclePosition[0] += dx;
    obstaclePosition[1] += dy;
    
    // 確保障礙物不會移出邊界
    obstaclePosition[0] = Math.max(0.02, Math.min(0.98, obstaclePosition[0]));
    obstaclePosition[1] = Math.max(0.02, Math.min(0.98, obstaclePosition[1]));
    
    rebuildObstacleMapOne(obstacleMaps, webgl, obstacleSize, obstaclePosition);
}

// 設定鍵盤事件監聽
function setupObstacleControls() {
    // 鍵盤控制
    document.addEventListener('keydown', (event) => {
        const moveStep = 0.01;
        switch(event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                moveObstacle(-moveStep, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                moveObstacle(moveStep, 0);
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
                moveObstacle(0, moveStep);//重要:原點的位置要注意，這裡的正負號是對的
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                moveObstacle(0, -moveStep);//重要:原點的位置要注意，這裡的正負號是對的
                break;
        }
    });
    
    // 按鈕控制
    const moveStep = 0.01;
    
    const leftButton = document.getElementById("move-obstacle-left");
    const rightButton = document.getElementById("move-obstacle-right");
    const upButton = document.getElementById("move-obstacle-up");
    const downButton = document.getElementById("move-obstacle-down");
    
    if (leftButton) leftButton.onclick = () => moveObstacle(-moveStep, 0);
    if (rightButton) rightButton.onclick = () => moveObstacle(moveStep, 0);
    if (upButton) upButton.onclick = () => moveObstacle(0, -moveStep);
    if (downButton) downButton.onclick = () => moveObstacle(0, moveStep);
}

main();