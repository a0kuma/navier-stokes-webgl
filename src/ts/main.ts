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
import { DynamicObstacleController } from "./dynamic-obstacle-controller";

let mousePointRenderer: MousePointRenderer | null = null;
let dynamicObstacleController: DynamicObstacleController | null = null;

// callback：把多滑鼠座標給流體模擬和視覺化
function updateFluidWithMultiMouse(points: MousePoint[]): void {
  // 暫存全域供 fluid.ts 使用
  (window as any).multiMousePoints = points;
  
  // 更新點的視覺化
  if (mousePointRenderer) {
    mousePointRenderer.updatePoints(points);
  }
}

// 初始化 WebSocket (設定為 10 FPS)
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
    const webgl: WebGLRenderingContext = gl;    // 初始化滑鼠點渲染器
    mousePointRenderer = new MousePointRenderer(canvas);

    const extensions: string[] = [
        "OES_texture_float",
        "WEBGL_color_buffer_float",
        "OES_texture_float_linear",
    ];
    Requirements.loadExtensions(webgl, extensions);

    const size = 256;

    const fluid = new Fluid(webgl, size, size);
    const brush = new Brush(webgl);
    const obstacleMaps: ObstacleMap[] = [];
    obstacleMaps["none"] = new ObstacleMap(webgl, size, size);
    obstacleMaps["one"] = new ObstacleMap(webgl, size, size);
    {
        obstacleMaps["one"].addObstacle([0.015, 0.015], [0.3, 0.5]);
    }
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
    
    // 添加動態障礙物新類別到障礙物選項
    obstacleMaps["dynamic"] = new ObstacleMap(webgl, size, size);
    
    // 初始化動態障礙物控制器
    dynamicObstacleController = new DynamicObstacleController(
        obstacleMaps["dynamic"], 
        mousePointRenderer
    );

    Parameters.bind(fluid);

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
        dt = Math.min(dt, 1 / 10);        const obstacleMap: ObstacleMap = obstacleMaps[Parameters.obstacles];        // 更新動態障礙物系統
        if (dynamicObstacleController && Parameters.obstacles === "dynamic") {
            const multiMousePoints = (window as any).multiMousePoints || [];
            const obstacleCount = obstacleMaps["dynamic"].getDynamicObstacles().length;
            
            // 詳細的調試信息
            if (multiMousePoints.length > 0) {
                console.log(`🎯 更新動態障礙物: 收到${multiMousePoints.length}個WS點, 當前有${obstacleCount}個障礙物`);
                
                // 顯示每個WS點的詳細信息
                multiMousePoints.forEach((point: any, index: number) => {
                    console.log(`  點${index}: 位置[${point.pos[0].toFixed(3)}, ${point.pos[1].toFixed(3)}], 移動[${point.movement[0].toFixed(3)}, ${point.movement[1].toFixed(3)}]`);
                });
                
                // 顯示每個障礙物的詳細信息
                const obstacles = obstacleMaps["dynamic"].getDynamicObstacles();
                obstacles.forEach((obs: any, index: number) => {
                    console.log(`  障礙物${index} (ID:${obs.id}): 位置[${obs.pos[0].toFixed(3)}, ${obs.pos[1].toFixed(3)}], 大小[${obs.size[0].toFixed(3)}, ${obs.size[1].toFixed(3)}], 速度[${obs.vel[0].toFixed(3)}, ${obs.vel[1].toFixed(3)}]`);
                });
            }
            
            dynamicObstacleController.update(multiMousePoints, dt);
            
            // 讓動態障礙物的速度影響流體
            obstacleMap.addDynamicObstacleVelocityToFluid(fluid);
        }

        /* Updating */
        if (Parameters.fluid.stream) {
            fluid.addVel([0.1, 0.5], [0.05, 0.2], [0.4, 0]);
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
}

main();