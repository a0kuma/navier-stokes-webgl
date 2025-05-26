import Fluid from "./fluid";
import * as Requirements from "./requirements";

import "./page-interface-generated";

class Mouse {
    private _posInPx: number[];
    private _pos: number[];

    private _movementInPx: number[];
    private _movement: number[];

    private _pivotInPx: number[];

    constructor() {
        this._posInPx = [0, 0];
        this._pivotInPx = [0, 0];
        this.setPosInPx([0, 0]);
        this.setMovementInPx([0, 0]);

        Page.Canvas.Observers.mouseMove.push((relX: number, relY: number) => {
            const canvasSize = Page.Canvas.getSize();
            this.setPosInPx([canvasSize[0] * relX, canvasSize[1] * (1 - relY)]);
        });

        Page.Canvas.Observers.mouseDown.push(() => {
            this.setMovementInPx([0, 0]);
            this._pivotInPx = this._posInPx;
        });
    }

    public get posInPx(): number[] {
        return this._posInPx;
    }

    public get pos(): number[] {
        return this._pos;
    }

    public get movementInPx(): number[] {
        return this._movementInPx;
    }

    public get movement(): number[] {
        return this._movement;
    }

    private setPosInPx(pos: number[]): void {
        const toPivot: number[] = [
            this._pivotInPx[0] - pos[0],
            this._pivotInPx[1] - pos[1]
        ];
        const distToPivot = Math.sqrt(toPivot[0] * toPivot[0] + toPivot[1] * toPivot[1]);
        const maxDist = 16;

        if (distToPivot > maxDist) {
            toPivot[0] *= maxDist / distToPivot;
            toPivot[1] *= maxDist / distToPivot;

            this._pivotInPx[0] = pos[0] + toPivot[0];
            this._pivotInPx[1] = pos[1] + toPivot[1];
        }
        const movementInPx = [-toPivot[0] / maxDist, -toPivot[1] / maxDist];
        this.setMovementInPx(movementInPx);
        this._posInPx = pos;
        this._pos = this.setRelative(pos);
    }

    private setMovementInPx(movement: number[]): void {
        this._movementInPx = movement;
        this._movement = this.setRelative(movement);
    }

    private setRelative(pos: number[]): number[] {
        const canvasSize = Page.Canvas.getSize();
        return [
            pos[0] / canvasSize[0],
            pos[1] / canvasSize[1],
        ];
    }
}

let mouse: Mouse = new Mouse();

function bindMouse(): void {
    mouse = new Mouse();
}

interface BrushInfo {
    radius: number,
    strength: number,
}
const brushInfo: BrushInfo = {
    radius: 10,
    strength: 100,
}

interface FluidInfo {
    stream: boolean;
}
const fluidInfo: FluidInfo = {
    stream: true,
}

enum ObstaclesInfo {
    NONE = "none",
    ONE = "one",
    MANY = "many",
    DYNAMIC = "dynamic",
}
let obstaclesInfo: ObstaclesInfo = ObstaclesInfo.NONE;

interface DisplayInfo {
    velocity: boolean,
    pressure: boolean,
    brush: boolean,
    obstacles: boolean,
}
const displayInfo: DisplayInfo = {
    velocity: true,
    pressure: true,
    brush: true,
    obstacles: true,
}

interface CollisionInfo {
    speed: number,
}
const collisionInfo: CollisionInfo = {
    speed: 0.1,
}

interface FullscreenInfo {
    isFullscreen: boolean,
}
const fullscreenInfo: FullscreenInfo = {
    isFullscreen: false,
}

interface ResolutionInfo {
    width: number,
    height: number,
}
const resolutionInfo: ResolutionInfo = {
    width: 512,
    height: 512,
}

// Fullscreen functionality
function handleFullscreenToggle(isFullscreen: boolean): void {
    const canvas = Page.Canvas.getCanvas();
    const canvasContainer = Page.Canvas.getCanvasContainer();
    
    if (!canvas || !canvasContainer) {
        console.warn("Canvas or canvas container not found");
        return;
    }

    if (isFullscreen) {
        // Enter fullscreen mode
        enterFullscreenMode(canvas, canvasContainer);
    } else {
        // Exit fullscreen mode  
        exitFullscreenMode(canvas, canvasContainer);
    }
    
    // Update button text
    updateFullscreenButtonText(isFullscreen);
}

function enterFullscreenMode(canvas: HTMLCanvasElement, canvasContainer: HTMLElement): void {
    // Request browser fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
        (document.documentElement as any).msRequestFullscreen();
    }
    
    // Hide UI elements (controls, headers, etc.)
    const controlsSections = document.querySelectorAll('.controls-section, .section-header, .demopage-header, .demopage-footer');
    controlsSections.forEach(section => {
        (section as HTMLElement).style.display = 'none';
    });
    
    // Hide scrollbars
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Make canvas fill the viewport
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '9999';
    
    // Resize canvas to viewport resolution
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
      // Update WebGL viewport if the context exists
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
        gl.viewport(0, 0, viewportWidth, viewportHeight);
    }
    
    // Store original canvas size for restoration
    (canvas as any)._originalSize = Page.Canvas.getSize();
    
    console.log(`Entered fullscreen mode: ${viewportWidth}x${viewportHeight}`);
}

function exitFullscreenMode(canvas: HTMLCanvasElement, canvasContainer: HTMLElement): void {
    // Exit browser fullscreen
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
    }
    
    // Restore UI elements
    const controlsSections = document.querySelectorAll('.controls-section, .section-header, .demopage-header, .demopage-footer');
    controlsSections.forEach(section => {
        (section as HTMLElement).style.display = '';
    });
    
    // Restore scrollbars
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // Restore canvas styling
    canvas.style.position = '';
    canvas.style.top = '';
    canvas.style.left = '';
    canvas.style.width = '';
    canvas.style.height = '';
    canvas.style.zIndex = '';
    
    // Restore original canvas size
    const originalSize = (canvas as any)._originalSize;
    if (originalSize) {
        canvas.width = originalSize[0];
        canvas.height = originalSize[1];
          // Update WebGL viewport
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
            gl.viewport(0, 0, originalSize[0], originalSize[1]);
        }
    }
    
    console.log("Exited fullscreen mode");
}

function updateFullscreenButtonText(isFullscreen: boolean): void {
    const button = document.getElementById("fullscreen-button-id");
    if (button) {
        button.textContent = isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen";
    }
}

// Listen for browser fullscreen change events to sync state
document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    if (fullscreenInfo.isFullscreen !== isFullscreen) {
        fullscreenInfo.isFullscreen = isFullscreen;
        if (!isFullscreen) {
            // Browser exited fullscreen (e.g., ESC key), update our state
            exitFullscreenMode(
                Page.Canvas.getCanvas()!,
                Page.Canvas.getCanvasContainer()!
            );
        }
        updateFullscreenButtonText(isFullscreen);
    }
});

// Handle ESC key to exit fullscreen
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fullscreenInfo.isFullscreen) {
        fullscreenInfo.isFullscreen = false;
        handleFullscreenToggle(false);
    }
});

function bindControls(fluid: Fluid): void {
    {
        const RESOLUTIONS_CONTROL_ID = "resolution";
        const updateResolution = (values: string[]) => {
            const size: number = +values[0];
            fluid.reset(size, size);
        };
        Page.Tabs.addObserver(RESOLUTIONS_CONTROL_ID, updateResolution);
        updateResolution(Page.Tabs.getValues(RESOLUTIONS_CONTROL_ID));
    }
    {
        const FLOAT_CONTROL_ID = "float-texture-checkbox-id";
        if (!Requirements.allExtensionsLoaded) {
            Page.Controls.setVisibility(FLOAT_CONTROL_ID, false);
            Page.Checkbox.setChecked(FLOAT_CONTROL_ID, false);
        }
        const updateFloat = (use: boolean) => { fluid.useFloatTextures = use; };
        Page.Checkbox.addObserver(FLOAT_CONTROL_ID, updateFloat);
        updateFloat(Page.Checkbox.isChecked(FLOAT_CONTROL_ID));
    }
    {
        const ITERATIONS_CONTROL_ID = "solver-steps-range-id";
        const updateIterations = (iterations: number) => { fluid.minNbIterations = iterations; };
        Page.Range.addObserver(ITERATIONS_CONTROL_ID, updateIterations);
        updateIterations(Page.Range.getValue(ITERATIONS_CONTROL_ID));
    }
    {
        const TIMESTEP_CONTROL_ID = "timestep-range-id";
        const updateTimestep = (timestep: number) => { fluid.timestep = timestep; };
        Page.Range.addObserver(TIMESTEP_CONTROL_ID, updateTimestep);
        updateTimestep(Page.Range.getValue(TIMESTEP_CONTROL_ID));
    }
    {
        const STREAM_CONTROL_ID = "stream-checkbox-id";
        const updateStream = (doStream: boolean) => { fluidInfo.stream = doStream; };
        Page.Checkbox.addObserver(STREAM_CONTROL_ID, updateStream);
        updateStream(Page.Checkbox.isChecked(STREAM_CONTROL_ID));
    }    {
        const OBSTACLES_CONTROL_ID = "obstacles";
        const updateObstacles = (values: string[]) => {
            obstaclesInfo = values[0] as ObstaclesInfo;
            
            // 如果切換到動態模式，重新初始化動態障礙物系統
            if (obstaclesInfo === ObstaclesInfo.DYNAMIC) {
                // 通知動態障礙物系統進行重置
                if ((window as any).dynamicObstacleSystem) {
                    (window as any).dynamicObstacleSystem.reset();
                    console.log("🔄 切換到動態障礙物模式，重新初始化障礙物");
                }
            }
        };
        Page.Tabs.addObserver(OBSTACLES_CONTROL_ID, updateObstacles);
        updateObstacles(Page.Tabs.getValues(OBSTACLES_CONTROL_ID));
    }

    {
        const BRUSH_RADIUS_CONTROL_ID = "brush-radius-range-id";
        const updateBrushRadius = (radius: number) => { brushInfo.radius = radius; };
        Page.Range.addObserver(BRUSH_RADIUS_CONTROL_ID, updateBrushRadius);
        updateBrushRadius(Page.Range.getValue(BRUSH_RADIUS_CONTROL_ID));

        Page.Canvas.Observers.mouseWheel.push((delta: number) => {
            Page.Range.setValue(BRUSH_RADIUS_CONTROL_ID, brushInfo.radius + 5 * delta);
            updateBrushRadius(Page.Range.getValue(BRUSH_RADIUS_CONTROL_ID));
        });
    }
    {
        const BRUSH_STRENGTH_CONTROL_ID = "brush-strength-range-id";
        const updateBrushStrength = (strength: number) => { brushInfo.strength = strength; };
        Page.Range.addObserver(BRUSH_STRENGTH_CONTROL_ID, updateBrushStrength);
        updateBrushStrength(Page.Range.getValue(BRUSH_STRENGTH_CONTROL_ID));
    }

    {
        const DISPLAY_MODE_CONTROL_ID = "displayed-fields";
        const updateDisplayMode = (modes: string[]) => {
            displayInfo.velocity = modes[0] === "velocity" || modes[1] === "velocity";
            displayInfo.pressure = modes[0] === "pressure" || modes[1] === "pressure";
        };
        Page.Tabs.addObserver(DISPLAY_MODE_CONTROL_ID, updateDisplayMode);
        updateDisplayMode(Page.Tabs.getValues(DISPLAY_MODE_CONTROL_ID));
    }
    {
        const COLOR_INTENSITY_CONTROL_ID = "intensity-range-id";
        const updateColorIntensity = (intensity: number) => { fluid.colorIntensity = intensity; };
        Page.Range.addObserver(COLOR_INTENSITY_CONTROL_ID, updateColorIntensity);
        updateColorIntensity(Page.Range.getValue(COLOR_INTENSITY_CONTROL_ID));
    }
    {
        const DISPLAY_COLOR_CONTROL_ID = "display-color-checkbox-id";
        const updateColor = (display: boolean) => { fluid.color = display; };
        Page.Checkbox.addObserver(DISPLAY_COLOR_CONTROL_ID, updateColor);
        updateColor(Page.Checkbox.isChecked(DISPLAY_COLOR_CONTROL_ID));
    }
    {
        const DISPLAY_OBSTACLES_CONTROL_ID = "display-obstacles-checkbox-id";
        const updateDisplayObstacles = (display: boolean) => { displayInfo.obstacles = display; };        Page.Checkbox.addObserver(DISPLAY_OBSTACLES_CONTROL_ID, updateDisplayObstacles);
        updateDisplayObstacles(Page.Checkbox.isChecked(DISPLAY_OBSTACLES_CONTROL_ID));
    }
    {
        const COLLISION_SPEED_CONTROL_ID = "collision-speed-range-id";
        const updateCollisionSpeed = (speed: number) => { collisionInfo.speed = speed; };
        Page.Range.addObserver(COLLISION_SPEED_CONTROL_ID, updateCollisionSpeed);
        updateCollisionSpeed(Page.Range.getValue(COLLISION_SPEED_CONTROL_ID));
    }    {
        const FULLSCREEN_BUTTON_ID = "fullscreen-button-id";
        const toggleFullscreen = () => {
            fullscreenInfo.isFullscreen = !fullscreenInfo.isFullscreen;
            handleFullscreenToggle(fullscreenInfo.isFullscreen);
        };
        
        // Use DOM event handling for button click since Page.Button API doesn't exist
        setTimeout(() => {
            const button = document.getElementById(FULLSCREEN_BUTTON_ID);
            if (button) {
                button.addEventListener('click', toggleFullscreen);
            }
        }, 100); // Small delay to ensure DOM is loaded
    }
    
    // Resolution button handlers
    {
        const RESOLUTION_1920x1080_BUTTON_ID = "resolution-1920x1080-button-id";
        const setResolution1920x1080 = () => {
            resolutionInfo.width = 1920;
            resolutionInfo.height = 1080;
            
            const canvas = Page.Canvas.getCanvas();
            if (canvas) {
                canvas.width = 1920;
                canvas.height = 1080;
                
                // Update WebGL viewport
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl && gl instanceof WebGLRenderingContext) {
                    gl.viewport(0, 0, 1920, 1080);
                }
                
                // Trigger canvas resize observers
                Page.Canvas.Observers.canvasResize.forEach(observer => observer(1920, 1080));
                
                console.log("Resolution set to 1920×1080");
            }
        };
        
        setTimeout(() => {
            const button = document.getElementById(RESOLUTION_1920x1080_BUTTON_ID);
            if (button) {
                button.addEventListener('click', setResolution1920x1080);
            }
        }, 100);
    }
    
    {
        const RESOLUTION_1280x720_BUTTON_ID = "resolution-1280x720-button-id";
        const setResolution1280x720 = () => {
            resolutionInfo.width = 1280;
            resolutionInfo.height = 720;
            
            const canvas = Page.Canvas.getCanvas();
            if (canvas) {
                canvas.width = 1280;
                canvas.height = 720;
                
                // Update WebGL viewport
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl && gl instanceof WebGLRenderingContext) {
                    gl.viewport(0, 0, 1280, 720);
                }
                
                // Trigger canvas resize observers
                Page.Canvas.Observers.canvasResize.forEach(observer => observer(1280, 720));
                
                console.log("Resolution set to 1280×720");
            }
        };
        
        setTimeout(() => {
            const button = document.getElementById(RESOLUTION_1280x720_BUTTON_ID);
            if (button) {
                button.addEventListener('click', setResolution1280x720);
            }
        }, 100);
    }
}

function bind(fluid: Fluid): void {
    bindControls(fluid);
    bindMouse();
}

export {
    mouse,
    bind,
    brushInfo as brush,
    displayInfo as display,
    obstaclesInfo as obstacles,
    fluidInfo as fluid,
    collisionInfo as collision,
    fullscreenInfo as fullscreen,
    resolutionInfo as resolution
};