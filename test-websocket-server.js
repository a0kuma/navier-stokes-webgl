const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 9980 });

console.log('WebSocket 伺服器運行在 ws://localhost:9980');

// 模擬的滑鼠點座標
let simulatedPoints = [
    { pos: [0.3, 0.3], movement: [0.01, 0.02] },
    { pos: [0.7, 0.4], movement: [-0.005, 0.015] },
    { pos: [0.5, 0.7], movement: [0.02, -0.01] }
];

server.on('connection', (ws) => {
    console.log('客戶端已連接');
    
    ws.on('message', (message) => {
        const msg = message.toString();
        console.log('收到訊息:', msg);
        
        if (msg === 'detect') {
            // 隨機移動點並更新它們的移動向量
            simulatedPoints = simulatedPoints.map((point, index) => {
                // 隨機移動
                const newX = Math.max(0.1, Math.min(0.9, point.pos[0] + (Math.random() - 0.5) * 0.02));
                const newY = Math.max(0.1, Math.min(0.9, point.pos[1] + (Math.random() - 0.5) * 0.02));
                
                // 計算移動向量
                const movementX = newX - point.pos[0];
                const movementY = newY - point.pos[1];
                
                return {
                    pos: [newX, newY],
                    movement: [movementX, movementY]
                };
            });
            
            // 偶爾添加或移除點
            if (Math.random() < 0.01 && simulatedPoints.length < 6) {
                simulatedPoints.push({
                    pos: [Math.random() * 0.8 + 0.1, Math.random() * 0.8 + 0.1],
                    movement: [0, 0]
                });
                console.log('添加了一個新點');
            } else if (Math.random() < 0.005 && simulatedPoints.length > 1) {
                simulatedPoints.pop();
                console.log('移除了一個點');
            }
            
            // 發送點座標回客戶端
            ws.send(JSON.stringify(simulatedPoints));
        }
    });
    
    ws.on('close', () => {
        console.log('客戶端已斷開連接');
    });
    
    // 發送初始點位置
    ws.send(JSON.stringify(simulatedPoints));
});

server.on('error', (error) => {
    console.error('WebSocket 伺服器錯誤:', error);
});
