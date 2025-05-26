import GLResource from "./gl-utils/gl-resource";
import Shader from "./gl-utils/shader";
import FBO from "./gl-utils/fbo";
import * as ObstacleMapShaders from "./shaders/obstacle-map-shaders";
import { DynamicObstacle, DynamicObstacleSystem } from "./dynamic-obstacle";
import { MousePoint } from "./ws-mouse";
import Fluid from "./fluid";

class ObstacleMap extends GLResource {
  private _width: number;
  private _height: number;

  private _fbo: FBO;
  private _texture: WebGLTexture;
  private _initTexture: WebGLTexture;

  private _drawShader: Shader;
  private _addShader: Shader;
  private _dynamicObstacleSystem: DynamicObstacleSystem;
  constructor(gl: WebGLRenderingContext, width: number, height: number) {
    super(gl);

    this._width = width;
    this._height = height;

    this._fbo = new FBO(gl, width, height);

    this._drawShader = ObstacleMapShaders.buildDrawShader(gl);
    this._addShader = ObstacleMapShaders.buildAddShader(gl);
    
    // 初始化動態障礙物系統
    this._dynamicObstacleSystem = new DynamicObstacleSystem(width, height);

    this.initObstaclesMap();
    
    console.log(`🔧 ObstacleMap 初始化完成: 寬度=${width}, 高度=${height}, texture=${this._texture ? 'OK' : 'FAILED'}`);
  }
  public freeGLResources(): void {
    const gl = super.gl();

    this._fbo.freeGLResources();
    
    gl.deleteTexture(this._texture);
    gl.deleteTexture(this._initTexture);

    this._drawShader.freeGLResources();
    this._addShader.freeGLResources();
  }
  public get texture(): WebGLTexture {
    if (!this._texture) {
      console.error("🚨 ObstacleMap texture 未初始化！重新初始化...");
      this.initObstaclesMap();
    }
    return this._texture;
  }

  public draw(): void {
    const gl = super.gl();
    const drawShader = this._drawShader;

    drawShader.u["uObstacles"].value = this.texture;
    drawShader.use();
    drawShader.bindUniformsAndAttributes();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public addObstacle(pos, size): void {
    const gl = super.gl();
    const addShader = this._addShader;
    addShader.u["uSize"].value = pos;
    addShader.u["uPos"].value = size;

    this._fbo.bind([this._texture]);
    addShader.use();
    addShader.bindUniformsAndAttributes();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // 添加動態障礙物相關方法
  public createDynamicObstacle(
    pos: [number, number], 
    size: [number, number] = [0.02, 0.02], 
    mass: number = 1.0,
    friction: number = 0.95,
    restitution: number = 0.8
  ): DynamicObstacle {
    return this._dynamicObstacleSystem.createObstacle(pos, size, mass, friction, restitution);
  }
  public updateDynamicObstacles(mousePoints: MousePoint[], deltaTime: number): void {
    this._dynamicObstacleSystem.update(mousePoints, deltaTime);
    this.updateDynamicObstacleTexture();
  }

  public getDynamicObstacles(): DynamicObstacle[] {
    return this._dynamicObstacleSystem.getObstacles();
  }

  public clearDynamicObstacles(): void {
    this._dynamicObstacleSystem.clear();
  }
  // 更新動態障礙物到texture
  private updateDynamicObstacleTexture(): void {
    const gl = super.gl();
    
    console.log(`🔄 更新動態障礙物纹理: texture=${this._texture ? 'OK' : 'NULL'}`);
    
    // 先重置為初始狀態（只有邊界）
    this.resetToInitialState();
    
    // 添加所有動態障礙物
    const obstacles = this._dynamicObstacleSystem.getObstacles();
    console.log(`🔄 添加 ${obstacles.length} 個動態障礙物到纹理`);
    for (const obstacle of obstacles) {
      this.addObstacle(obstacle.size, obstacle.pos);
    }
  }

  private resetToInitialState(): void {
    const gl = super.gl();
    
    // 將初始紋理複製回當前紋理
    this._fbo.bind([this._texture]);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 重新繪製邊界
    const width = this._width;
    const height = this._height;
    let texels: number[] = [];
    for (let iY = 0; iY < height; ++iY) {
      for (let iX = 0; iX < width; ++iX) {
        if (iY === 0) {
          texels.push.apply(texels, [127, 255, 0, 255]);
        } else if (iY === height - 1) {
          texels.push.apply(texels, [127, 0, 0, 255]);
        } else if (iX === 0) {
          texels.push.apply(texels, [255, 127, 0, 255]);
        } else if (iX === width - 1) {
          texels.push.apply(texels, [0, 127, 0, 255]);
        } else {
          texels.push.apply(texels, [127, 127, 0, 255]);
        }
      }
    }
    const data = new Uint8Array(texels);
    
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  private initObstaclesMap(): void {
    const gl = super.gl();
    const width = this._width;
    const height = this._height;

    let texels: number[] = [];
    for (let iY = 0; iY < height; ++iY) {
      for (let iX = 0; iX < width; ++iX) {
        if (iY === 0) {
          texels.push.apply(texels, [127, 255, 0, 255]);
        } else if (iY === height - 1) {
          texels.push.apply(texels, [127, 0, 0, 255]);
        } else if (iX === 0) {
          texels.push.apply(texels, [255, 127, 0, 255]);
        } else if (iX === width - 1) {
          texels.push.apply(texels, [0, 127, 0, 255]);
        } else {
          texels.push.apply(texels, [127, 127, 0, 255]);
        }
      }
    }
    const data = new Uint8Array(texels);

    const textures: WebGLTexture[] = [];
    for (let i = 0; i < 2; ++i) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures.push(tex);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);

    this._texture = textures[0];
    this._initTexture = textures[1];
  }
  // 添加動態障礙物對流體的速度影響
  public addDynamicObstacleVelocityToFluid(fluid: Fluid): void {
    const obstacles = this._dynamicObstacleSystem.getObstacles();
    for (const obstacle of obstacles) {
      // 計算障礙物的影響範圍
      const influenceRadius = Math.max(obstacle.size[0], obstacle.size[1]) * 1.5;
      const brushSize = [influenceRadius, influenceRadius];
      
      // 根據障礙物的速度向流體添加速度
      const velocityScale = 0.5; // 調整速度影響強度
      const addVel = [
        obstacle.vel[0] * velocityScale,
        obstacle.vel[1] * velocityScale
      ];
      
      // 只有當障礙物有明顯速度時才添加影響
      const speed = Math.sqrt(obstacle.vel[0] * obstacle.vel[0] + obstacle.vel[1] * obstacle.vel[1]);
      if (speed > 0.001) {
        fluid.addVel(obstacle.pos, brushSize, addVel);
      }
    }
  }
}

export default ObstacleMap;