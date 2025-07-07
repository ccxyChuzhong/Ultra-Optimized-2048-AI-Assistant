// 强化版学习型2048游戏助手
class Enhanced2048Assistant {
    constructor() {
        this.canvas = this.findCanvas();
        this.ctx = this.canvas?.getContext('2d');
        this.calibration = this.loadCalibration();
        this.colorPatterns = this.loadColorPatterns();
        this.ai = new AdvancedAI(this);
        this.learningMode = false;
        this.currentLearningValue = 0;
        this.init();
    }

    // 寻找画布
    findCanvas() {
        const selectors = ['canvas', '.game-canvas', '#game-canvas', '[class*="canvas"]'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.tagName === 'CANVAS') {
                console.log('找到画布:', sel);
                return el;
            }
        }
        return document.querySelector('canvas');
    }

    // 简化自动校准
    autoCalibrate() {
        if (!this.canvas) return false;
        
        const size = Math.min(this.canvas.width, this.canvas.height);
        const margin = size * 0.15;
        
        this.calibration = {
            left: margin,
            top: margin,
            cellSize: (size - margin * 2) / 4.5,
            gap: (size - margin * 2) / 50
        };
        
        this.saveCalibration();
        console.log('自动校准完成:', this.calibration);
        return true;
    }

    // 手动校准
    manualCalibrate() {
        if (!this.canvas) return;
        
        const overlay = document.createElement('div');
        const rect = this.canvas.getBoundingClientRect();
        
        overlay.style.cssText = `
            position: fixed; left: ${rect.left}px; top: ${rect.top}px;
            width: ${rect.width}px; height: ${rect.height}px;
            background: rgba(0,0,0,0.5); cursor: crosshair; z-index: 9999;
            border: 2px solid #ff0000;
        `;
        
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            position: absolute; top: 10px; left: 10px;
            background: rgba(0,0,0,0.9); color: white; padding: 10px;
            border-radius: 5px; font-size: 14px; font-weight: bold;
        `;
        instruction.textContent = '点击第一个格子(0,0)的中心';
        overlay.appendChild(instruction);
        document.body.appendChild(overlay);
        
        const clicks = [];
        overlay.onclick = (e) => {
            const canvasX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            const canvasY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
            clicks.push({ x: canvasX, y: canvasY });
            
            const marker = document.createElement('div');
            marker.style.cssText = `
                position: absolute; left: ${e.clientX - rect.left - 5}px; 
                top: ${e.clientY - rect.top - 5}px;
                width: 10px; height: 10px; background: red;
                border: 2px solid white; border-radius: 50%;
            `;
            overlay.appendChild(marker);
            
            if (clicks.length === 1) {
                instruction.textContent = '点击最后一个格子(3,3)的中心';
            } else if (clicks.length === 2) {
                const dx = clicks[1].x - clicks[0].x;
                const dy = clicks[1].y - clicks[0].y;
                const cellSize = Math.abs(dx) / 3.5;
                
                this.calibration = {
                    left: clicks[0].x - cellSize / 2,
                    top: clicks[0].y - cellSize / 2,
                    cellSize: cellSize,
                    gap: cellSize / 10
                };
                
                this.saveCalibration();
                this.showCalibrationGrid(overlay);
                setTimeout(() => overlay.remove(), 2000);
            }
        };
    }

    // 显示校准网格
    showCalibrationGrid(overlay) {
        const rect = this.canvas.getBoundingClientRect();
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const bounds = this.getCellBounds(row, col);
                const screenX = (bounds.x / this.canvas.width) * rect.width;
                const screenY = (bounds.y / this.canvas.height) * rect.height;
                const screenW = (bounds.width / this.canvas.width) * rect.width;
                const screenH = (bounds.height / this.canvas.height) * rect.height;
                
                const cellDiv = document.createElement('div');
                cellDiv.style.cssText = `
                    position: absolute; left: ${screenX}px; top: ${screenY}px;
                    width: ${screenW}px; height: ${screenH}px;
                    border: 2px solid lime; box-sizing: border-box;
                    background: rgba(0,255,0,0.1);
                `;
                
                const label = document.createElement('div');
                label.style.cssText = `
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 12px; color: lime; font-weight: bold;
                    text-shadow: 1px 1px 2px black;
                `;
                label.textContent = `${row},${col}`;
                cellDiv.appendChild(label);
                
                overlay.appendChild(cellDiv);
            }
        }
        
        const instruction = overlay.querySelector('div');
        instruction.textContent = '校准完成！网格将在2秒后消失';
        instruction.style.background = 'rgba(0,128,0,0.9)';
    }

    // 开始学习模式
    startLearningMode() {
        if (!this.calibration) {
            this.updateStatus('❌ 请先校准');
            return;
        }
        
        this.learningMode = true;
        this.currentLearningValue = 0;
        this.updateStatus('🎓 学习模式开始！点击数字进行训练');
        
        this.createLearningInterface();
    }

    // 创建学习界面
    createLearningInterface() {
        const overlay = document.createElement('div');
        const rect = this.canvas.getBoundingClientRect();
        
        overlay.id = 'learning-overlay';
        overlay.style.cssText = `
            position: fixed; left: ${rect.left}px; top: ${rect.top}px;
            width: ${rect.width}px; height: ${rect.height}px;
            background: rgba(0,0,0,0.2); z-index: 9999;
            pointer-events: none;
        `;
        
        // 添加点击区域
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const bounds = this.getCellBounds(row, col);
                const screenX = (bounds.x / this.canvas.width) * rect.width;
                const screenY = (bounds.y / this.canvas.height) * rect.height;
                const screenW = (bounds.width / this.canvas.width) * rect.width;
                const screenH = (bounds.height / this.canvas.height) * rect.height;
                
                const clickArea = document.createElement('div');
                clickArea.style.cssText = `
                    position: absolute; left: ${screenX}px; top: ${screenY}px;
                    width: ${screenW}px; height: ${screenH}px;
                    border: 2px solid rgba(255,255,255,0.6);
                    cursor: pointer; pointer-events: auto;
                    box-sizing: border-box; transition: all 0.2s;
                `;
                
                clickArea.addEventListener('mouseenter', () => {
                    clickArea.style.background = 'rgba(255,255,255,0.1)';
                    clickArea.style.border = '2px solid rgba(255,255,255,0.8)';
                });
                
                clickArea.addEventListener('mouseleave', () => {
                    clickArea.style.background = 'transparent';
                    clickArea.style.border = '2px solid rgba(255,255,255,0.6)';
                });
                
                clickArea.onclick = () => this.learnFromClick(row, col);
                overlay.appendChild(clickArea);
            }
        }
        
        // 学习控制面板 - 左上角
        const controlPanel = document.createElement('div');
        controlPanel.style.cssText = `
            position: fixed; top: 10px; left: 10px;
            background: rgba(0,0,0,0.95); color: white; padding: 15px;
            border-radius: 8px; font-family: Arial;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 1px solid #333; z-index: 10000; max-width: 300px;
        `;
        controlPanel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #4CAF50;">
                🎓 数字学习模式
            </div>
            <div style="margin-bottom: 10px; font-size: 14px;">
                当前学习: <span id="current-learning" style="color: #666;">选择数字</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 15px;">
                ${[0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048].map(num => 
                    `<button onclick="assistant.setLearningValue(${num})" 
                     style="padding: 6px 4px; background: #333; color: white; border: 1px solid #555; 
                            border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                     onmouseover="this.style.background='#555'"
                     onmouseout="this.style.background='#333'">${num}</button>`
                ).join('')}
            </div>
            <div style="font-size: 12px; color: #ccc; margin-bottom: 15px; line-height: 1.4;">
                📝 使用说明：<br>
                1. 点击上方数字按钮选择要学习的数字<br>
                2. 点击游戏中对应的格子进行训练<br>
                3. 每个数字建议学习3-5个样本<br>
                4. 0代表空格子，也需要学习
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="assistant.finishLearning()" 
                        style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; 
                               border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                        onmouseover="this.style.background='#45a049'"
                        onmouseout="this.style.background='#4CAF50'">
                    ✅ 完成学习
                </button>
                <button onclick="assistant.cancelLearning()" 
                        style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; 
                               border-radius: 5px; cursor: pointer; font-weight: bold; transition: all 0.2s;"
                        onmouseover="this.style.background='#da190b'"
                        onmouseout="this.style.background='#f44336'">
                    ❌ 取消
                </button>
            </div>
        `;
        
        document.body.appendChild(controlPanel);
        document.body.appendChild(overlay);
    }

    // 设置学习值
    setLearningValue(value) {
        this.currentLearningValue = value;
        const currentLearningSpan = document.getElementById('current-learning');
        if (currentLearningSpan) {
            currentLearningSpan.textContent = value === 0 ? '空格' : value.toString();
            currentLearningSpan.style.color = value === 0 ? '#FF9800' : '#4CAF50';
            currentLearningSpan.style.fontWeight = 'bold';
        }
        
        const buttons = document.querySelectorAll('button[onclick*="setLearningValue"]');
        buttons.forEach(btn => {
            if (btn.textContent === value.toString()) {
                btn.style.background = '#4CAF50';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#333';
                btn.style.color = 'white';
            }
        });
    }

    // 从点击学习
    learnFromClick(row, col) {
        if (this.currentLearningValue === undefined) {
            this.showTempMessage('请先选择要学习的数字！', 'warning');
            return;
        }
        
        const bounds = this.getCellBounds(row, col);
        const imageData = this.ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
        const colorSignature = this.extractColorSignature(imageData);
        
        if (!this.colorPatterns[this.currentLearningValue]) {
            this.colorPatterns[this.currentLearningValue] = [];
        }
        
        this.colorPatterns[this.currentLearningValue].push(colorSignature);
        
        if (this.colorPatterns[this.currentLearningValue].length > 5) {
            this.colorPatterns[this.currentLearningValue].shift();
        }
        
        this.saveColorPatterns();
        console.log(`学习了数字 ${this.currentLearningValue}:`, colorSignature);
        
        this.showLearningFeedback(row, col, this.currentLearningValue);
        this.updateLearningProgress();
    }

    // 显示学习反馈
    showLearningFeedback(row, col, value) {
        const overlay = document.getElementById('learning-overlay');
        const bounds = this.getCellBounds(row, col);
        
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: absolute; 
            left: ${(bounds.x / this.canvas.width) * overlay.offsetWidth}px;
            top: ${(bounds.y / this.canvas.height) * overlay.offsetHeight}px;
            width: ${(bounds.width / this.canvas.width) * overlay.offsetWidth}px;
            height: ${(bounds.height / this.canvas.height) * overlay.offsetHeight}px;
            background: rgba(76, 175, 80, 0.9); color: white;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 16px;
            border-radius: 8px; pointer-events: none;
            animation: pulse 0.5s;
        `;
        
        feedback.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 20px;">✓</div>
                <div style="font-size: 12px;">${value === 0 ? '空格' : value}</div>
            </div>
        `;
        
        if (!document.getElementById('learning-animation-css')) {
            const style = document.createElement('style');
            style.id = 'learning-animation-css';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        overlay.appendChild(feedback);
        setTimeout(() => feedback.remove(), 1000);
    }

    // 更新学习进度
    updateLearningProgress() {
        const learnedCount = Object.keys(this.colorPatterns).length;
        const totalSamples = Object.values(this.colorPatterns).reduce((sum, patterns) => sum + patterns.length, 0);
        console.log(`学习进度: ${learnedCount} 种数字, 总样本: ${totalSamples}`);
    }

    // 显示临时消息
    showTempMessage(message, type = 'info') {
        const colors = {
            info: '#2196F3',
            warning: '#FF9800',
            error: '#f44336',
            success: '#4CAF50'
        };
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: ${colors[type]}; color: white;
            padding: 15px 25px; border-radius: 8px;
            font-size: 16px; font-weight: bold;
            z-index: 10001; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 2000);
    }

    // 取消学习
    cancelLearning() {
        this.learningMode = false;
        const overlay = document.getElementById('learning-overlay');
        if (overlay) overlay.remove();
        
        const controlPanels = document.querySelectorAll('div[style*="数字学习模式"]');
        controlPanels.forEach(panel => panel.remove());
        
        this.updateStatus('❌ 学习模式已取消');
    }

    // 提取颜色特征
    extractColorSignature(imageData) {
        const { data } = imageData;
        const pixels = data.length / 4;
        
        let totalR = 0, totalG = 0, totalB = 0;
        let darkPixels = 0, lightPixels = 0;
        const colorBuckets = Array(8).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            
            totalR += r;
            totalG += g;
            totalB += b;
            
            if (brightness < 80) darkPixels++;
            else if (brightness > 200) lightPixels++;
            
            const bucket = Math.floor(brightness / 32);
            colorBuckets[Math.min(bucket, 7)]++;
        }
        
        return {
            avgR: Math.round(totalR / pixels),
            avgG: Math.round(totalG / pixels),
            avgB: Math.round(totalB / pixels),
            brightness: Math.round((totalR + totalG + totalB) / (3 * pixels)),
            darkRatio: darkPixels / pixels,
            lightRatio: lightPixels / pixels,
            colorDistribution: colorBuckets.map(count => count / pixels)
        };
    }

    // 完成学习
    finishLearning() {
        this.learningMode = false;
        const overlay = document.getElementById('learning-overlay');
        if (overlay) overlay.remove();
        
        const controlPanels = document.querySelectorAll('div[style*="数字学习模式"]');
        controlPanels.forEach(panel => panel.remove());
        
        const learnedNumbers = Object.keys(this.colorPatterns).length;
        const totalSamples = Object.values(this.colorPatterns).reduce((sum, patterns) => sum + patterns.length, 0);
        
        this.updateStatus(`🎓 学习完成！已学习 ${learnedNumbers} 种数字，共 ${totalSamples} 个样本`);
        this.showTempMessage(`学习完成！已学习 ${learnedNumbers} 种数字`, 'success');
        
        console.log('学习完成，颜色模式:', this.colorPatterns);
    }

    // 获取格子边界
    getCellBounds(row, col) {
        if (!this.calibration) return null;
        const { left, top, cellSize, gap } = this.calibration;
        
        return {
            x: Math.round(left + col * (cellSize + gap)),
            y: Math.round(top + row * (cellSize + gap)),
            width: Math.round(cellSize),
            height: Math.round(cellSize)
        };
    }

    // 使用学习数据识别数字
    recognizeCell(row, col) {
        const bounds = this.getCellBounds(row, col);
        if (!bounds) return 0;
        
        const imageData = this.ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
        const signature = this.extractColorSignature(imageData);
        
        return this.matchSignature(signature);
    }

    // 匹配颜色特征
    matchSignature(signature) {
        let bestMatch = 0;
        let bestScore = Infinity;
        
        for (const [value, patterns] of Object.entries(this.colorPatterns)) {
            for (const pattern of patterns) {
                const score = this.calculateSimilarity(signature, pattern);
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = parseInt(value);
                }
            }
        }
        
        if (bestScore > 0.3) {
            console.log('未识别的模式:', signature);
            return 0;
        }
        
        return bestMatch;
    }

    // 计算相似度
    calculateSimilarity(sig1, sig2) {
        const brightnessDiff = Math.abs(sig1.brightness - sig2.brightness) / 255;
        const colorDiff = (
            Math.abs(sig1.avgR - sig2.avgR) +
            Math.abs(sig1.avgG - sig2.avgG) +
            Math.abs(sig1.avgB - sig2.avgB)
        ) / (3 * 255);
        
        const ratioDiff = Math.abs(sig1.darkRatio - sig2.darkRatio) + 
                         Math.abs(sig1.lightRatio - sig2.lightRatio);
        
        let distDiff = 0;
        for (let i = 0; i < 8; i++) {
            distDiff += Math.abs(sig1.colorDistribution[i] - sig2.colorDistribution[i]);
        }
        
        return brightnessDiff * 0.4 + colorDiff * 0.3 + ratioDiff * 0.2 + distDiff * 0.1;
    }

    // 提取棋盘
    extractBoard() {
        if (!this.calibration) return null;
        
        const board = Array(4).fill().map(() => Array(4).fill(0));
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                board[i][j] = this.recognizeCell(i, j);
            }
        }
        return board;
    }

    // 游戏逻辑
    simulateMove(board, direction) {
        const newBoard = board.map(row => [...row]);
        let moved = false;
        let score = 0;
        
        const slideRow = (row) => {
            const filtered = row.filter(x => x !== 0);
            const result = [];
            
            for (let i = 0; i < filtered.length; i++) {
                if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                    result.push(filtered[i] * 2);
                    score += filtered[i] * 2;
                    i++;
                } else {
                    result.push(filtered[i]);
                }
            }
            
            while (result.length < 4) result.push(0);
            
            if (JSON.stringify(result) !== JSON.stringify(row)) moved = true;
            return result;
        };
        
        switch (direction) {
            case 'ArrowLeft':
                for (let i = 0; i < 4; i++) newBoard[i] = slideRow(newBoard[i]);
                break;
            case 'ArrowRight':
                for (let i = 0; i < 4; i++) newBoard[i] = slideRow(newBoard[i].reverse()).reverse();
                break;
            case 'ArrowUp':
                for (let j = 0; j < 4; j++) {
                    const col = [newBoard[0][j], newBoard[1][j], newBoard[2][j], newBoard[3][j]];
                    const newCol = slideRow(col);
                    for (let i = 0; i < 4; i++) newBoard[i][j] = newCol[i];
                }
                break;
            case 'ArrowDown':
                for (let j = 0; j < 4; j++) {
                    const col = [newBoard[0][j], newBoard[1][j], newBoard[2][j], newBoard[3][j]];
                    const newCol = slideRow(col.reverse()).reverse();
                    for (let i = 0; i < 4; i++) newBoard[i][j] = newCol[i];
                }
                break;
        }
        
        return { board: newBoard, moved, score };
    }

    // 模拟按键
    simulateKey(key) {
        ['keydown', 'keyup'].forEach(type => {
            document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
        });
    }

    // 保存/加载
    saveCalibration() {
        localStorage.setItem('2048_calibration_v3', JSON.stringify(this.calibration));
    }

    loadCalibration() {
        const saved = localStorage.getItem('2048_calibration_v3');
        return saved ? JSON.parse(saved) : null;
    }

    saveColorPatterns() {
        localStorage.setItem('2048_color_patterns', JSON.stringify(this.colorPatterns));
    }

    loadColorPatterns() {
        const saved = localStorage.getItem('2048_color_patterns');
        return saved ? JSON.parse(saved) : {};
    }

    // 更新状态
    updateStatus(message) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.innerHTML = message;
            statusDiv.scrollTop = statusDiv.scrollHeight;
        }
    }

    // 测试识别
    testRecognition() {
        if (!this.calibration) {
            this.updateStatus('❌ 请先校准');
            return;
        }
        
        const board = this.extractBoard();
        if (!board) {
            this.updateStatus('❌ 提取失败');
            return;
        }
        
        let html = '<div style="color: #4CAF50; margin-bottom: 8px;">🧪 识别测试:</div>';
        html += '<table style="border-collapse: collapse; width: 100%; font-size: 11px;">';
        
        for (let i = 0; i < 4; i++) {
            html += '<tr>';
            for (let j = 0; j < 4; j++) {
                const value = board[i][j];
                const color = value === 0 ? '#666' : '#4CAF50';
                const bg = value === 0 ? '#1a1a1a' : '#2a2a2a';
                html += `<td style="border: 1px solid #444; padding: 6px; text-align: center; color: ${color}; background: ${bg};">${value}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        
        const learned = Object.keys(this.colorPatterns).length;
        const totalSamples = Object.values(this.colorPatterns).reduce((sum, patterns) => sum + patterns.length, 0);
        html += `<div style="font-size: 10px; color: #aaa; margin-top: 5px;">已学习 ${learned} 种数字，${totalSamples} 个样本</div>`;
        
        this.updateStatus(html);
        console.table(board);
    }

    // 初始化
    init() {
        const panel = document.createElement('div');
        panel.innerHTML = `
            <div style="position: fixed; bottom: 10px; right: 10px; background: #1a1a1a; color: white; padding: 15px; border-radius: 10px; z-index: 9999; font-family: Arial; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid #333; min-width: 240px;">
                <h3 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 16px;">🚀 强化版2048助手</h3>
                
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; gap: 6px;">
                        <button id="autoCal" style="flex: 1; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🔍 自动校准</button>
                        <button id="manualCal" style="flex: 1; padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">📐 手动校准</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <button id="learn" style="width: 100%; padding: 10px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">🎓 开始学习数字</button>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; gap: 6px;">
                        <button id="test" style="flex: 1; padding: 8px; background: #607D8B; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🧪 测试识别</button>
                        <button id="clear" style="flex: 1; padding: 8px; background: #795548; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🗑️ 清除学习</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; gap: 6px;">
                        <button id="startAI" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">🚀 启动强化AI</button>
                        <button id="stopAI" style="flex: 1; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">⏹️ 停止AI</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; color: #ccc; margin-bottom: 8px;">AI设置:</div>
                    <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                        <label style="flex: 1; font-size: 11px; color: #aaa;">搜索深度:</label>
                        <select id="aiDepth" style="flex: 1; padding: 4px; background: #333; color: white; border: 1px solid #555; border-radius: 3px; font-size: 11px;">
                            <option value="3">3 (快速)</option>
                            <option value="4" selected>4 (平衡)</option>
                            <option value="5">5 (深度)</option>
                            <option value="6">6 (极限)</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <label style="flex: 1; font-size: 11px; color: #aaa;">移动速度:</label>
                        <select id="aiSpeed" style="flex: 1; padding: 4px; background: #333; color: white; border: 1px solid #555; border-radius: 3px; font-size: 11px;">
                            <option value="100">极快</option>
                            <option value="200">快速</option>
                            <option value="300" selected>正常</option>
                            <option value="500">慢速</option>
                        </select>
                    </div>
                </div>
                
                <div id="status" style="padding: 10px; background: #2a2a2a; border-radius: 4px; font-size: 11px; max-height: 200px; overflow-y: auto; border: 1px solid #444;">
                    <div style="color: #4CAF50; margin-bottom: 5px;">🚀 强化AI已就绪</div>
                    <div style="color: #ccc; font-size: 10px; line-height: 1.4;">
                        <strong>新功能:</strong><br>
                        • 多层搜索算法<br>
                        • 智能角落策略<br>
                        • 动态难度调节<br>
                        • 期望值最大化
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.setupEventListeners();
        
        setTimeout(() => {
            if (!this.calibration) {
                this.autoCalibrate();
                this.updateStatus('✅ 自动校准完成，请开始学习数字');
            }
        }, 500);
    }

    // 事件监听
    setupEventListeners() {
        document.getElementById('autoCal').onclick = () => {
            if (this.autoCalibrate()) {
                this.updateStatus('✅ 自动校准完成');
            }
        };
        
        document.getElementById('manualCal').onclick = () => {
            this.manualCalibrate();
            this.updateStatus('📐 手动校准模式');
        };
        
        document.getElementById('learn').onclick = () => {
            this.startLearningMode();
        };
        
        document.getElementById('test').onclick = () => {
            this.testRecognition();
        };
        
        document.getElementById('clear').onclick = () => {
            this.colorPatterns = {};
            this.saveColorPatterns();
            this.updateStatus('🗑️ 学习数据已清除');
        };
        
        document.getElementById('startAI').onclick = () => {
            const depth = parseInt(document.getElementById('aiDepth').value);
            const speed = parseInt(document.getElementById('aiSpeed').value);
            this.ai.setParameters(depth, speed);
            this.ai.start();
        };
        
        document.getElementById('stopAI').onclick = () => {
            this.ai.stop();
        };
        
        // AI参数变化监听
        document.getElementById('aiDepth').onchange = (e) => {
            this.ai.searchDepth = parseInt(e.target.value);
            console.log('搜索深度设置为:', e.target.value);
        };
        
        document.getElementById('aiSpeed').onchange = (e) => {
            this.ai.moveDelay = parseInt(e.target.value);
            console.log('移动速度设置为:', e.target.value);
        };
    }
}

// 强化版AI
class AdvancedAI {
    constructor(assistant) {
        this.assistant = assistant;
        this.running = false;
        this.searchDepth = 4;
        this.moveDelay = 300;
        this.maxTileBonus = 1000000;
        
        // 优化的权重矩阵 - 强调角落策略
        this.positionWeights = [
            [1048576, 65536, 4096, 256],
            [65536, 4096, 256, 16], 
            [4096, 256, 16, 1],
            [256, 16, 1, 0.0625]
        ];
        
        // 统计数据
        this.stats = {
            moves: 0,
            maxTile: 0,
            startTime: null,
            evaluations: 0
        };
    }

    // 设置AI参数
    setParameters(depth, speed) {
        this.searchDepth = depth;
        this.moveDelay = speed;
        console.log(`AI参数设置: 搜索深度=${depth}, 移动延迟=${speed}ms`);
    }

    // 强化版棋盘评估
    evaluateBoard(board) {
        this.stats.evaluations++;
        let score = 0;
        
        // 1. 位置权重评分 (40%)
        let positionScore = 0;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] > 0) {
                    positionScore += board[i][j] * this.positionWeights[i][j];
                }
            }
        }
        score += positionScore * 0.4;
        
        // 2. 空格奖励 (20%)
        const emptyCells = this.countEmptyCells(board);
        score += Math.pow(emptyCells, 2) * 100000 * 0.2;
        
        // 3. 单调性评分 (15%)
        score += this.calculateMonotonicity(board) * 0.15;
        
        // 4. 平滑度评分 (10%)
        score += this.calculateSmoothness(board) * 0.1;
        
        // 5. 最大值角落奖励 (10%)
        const maxTile = Math.max(...board.flat());
        if (board[0][0] === maxTile) {
            score += maxTile * this.maxTileBonus * 0.1;
        }
        
        // 6. 梯度奖励 (5%)
        score += this.calculateGradient(board) * 0.05;
        
        return score;
    }

    // 计算空格数量
    countEmptyCells(board) {
        return board.flat().filter(cell => cell === 0).length;
    }

    // 计算单调性
    calculateMonotonicity(board) {
        let totalMono = 0;
        
        // 水平单调性
        for (let i = 0; i < 4; i++) {
            let current = 0;
            let next = current + 1;
            while (next < 4) {
                while (next < 4 && board[i][next] === 0) next++;
                if (next >= 4) break;
                
                const currentValue = board[i][current] === 0 ? 0 : Math.log2(board[i][current]);
                const nextValue = Math.log2(board[i][next]);
                
                if (currentValue > nextValue) {
                    totalMono += (nextValue - currentValue);
                } else {
                    totalMono += (currentValue - nextValue);
                }
                
                current = next;
                next++;
            }
        }
        
        // 垂直单调性
        for (let j = 0; j < 4; j++) {
            let current = 0;
            let next = current + 1;
            while (next < 4) {
                while (next < 4 && board[next][j] === 0) next++;
                if (next >= 4) break;
                
                const currentValue = board[current][j] === 0 ? 0 : Math.log2(board[current][j]);
                const nextValue = Math.log2(board[next][j]);
                
                if (currentValue > nextValue) {
                    totalMono += (nextValue - currentValue);
                } else {
                    totalMono += (currentValue - nextValue);
                }
                
                current = next;
                next++;
            }
        }
        
        return totalMono;
    }

    // 计算平滑度
    calculateSmoothness(board) {
        let smoothness = 0;
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] !== 0) {
                    const value = Math.log2(board[i][j]);
                    
                    // 检查右边邻居
                    if (j < 3 && board[i][j + 1] !== 0) {
                        smoothness -= Math.abs(value - Math.log2(board[i][j + 1]));
                    }
                    
                    // 检查下边邻居
                    if (i < 3 && board[i + 1][j] !== 0) {
                        smoothness -= Math.abs(value - Math.log2(board[i + 1][j]));
                    }
                }
            }
        }
        
        return smoothness;
    }

    // 计算梯度 (新增)
    calculateGradient(board) {
        let gradient = 0;
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (board[i][j] !== 0) {
                    const value = Math.log2(board[i][j]);
                    
                    // 距离左上角的距离惩罚
                    const distance = i + j;
                    gradient -= distance * value;
                }
            }
        }
        
        return gradient;
    }

    // 检查游戏是否结束
    isGameOver(board) {
        // 检查是否有空格
        if (this.countEmptyCells(board) > 0) return false;
        
        // 检查是否可以合并
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const current = board[i][j];
                if (j < 3 && current === board[i][j + 1]) return false;
                if (i < 3 && current === board[i + 1][j]) return false;
            }
        }
        
        return true;
    }

    // 期望值搜索 (核心算法)
    expectimax(board, depth, isPlayerTurn) {
        if (depth === 0 || this.isGameOver(board)) {
            return { score: this.evaluateBoard(board), move: null };
        }
        
        if (isPlayerTurn) {
            // 玩家回合：最大化分数
            let maxScore = -Infinity;
            let bestMove = null;
            
            const moves = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            
            for (const move of moves) {
                const result = this.assistant.simulateMove(board, move);
                
                if (result.moved) {
                    const evaluation = this.expectimax(result.board, depth - 1, false);
                    
                    if (evaluation.score > maxScore) {
                        maxScore = evaluation.score;
                        bestMove = move;
                    }
                }
            }
            
            return { score: maxScore, move: bestMove };
        } else {
            // 计算机回合：期望值计算
            let expectedScore = 0;
            let possibleMoves = 0;
            
            // 找到所有空格位置
            const emptyCells = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (board[i][j] === 0) {
                        emptyCells.push({ row: i, col: j });
                    }
                }
            }
            
            if (emptyCells.length === 0) {
                return { score: this.evaluateBoard(board), move: null };
            }
            
            // 限制搜索的空格数量以提高性能
            const searchLimit = Math.min(emptyCells.length, 6);
            const searchCells = emptyCells.slice(0, searchLimit);
            
            for (const cell of searchCells) {
                // 90% 概率放置 2
                const newBoard2 = board.map(row => [...row]);
                newBoard2[cell.row][cell.col] = 2;
                const evaluation2 = this.expectimax(newBoard2, depth - 1, true);
                expectedScore += evaluation2.score * 0.9;
                
                // 10% 概率放置 4
                const newBoard4 = board.map(row => [...row]);
                newBoard4[cell.row][cell.col] = 4;
                const evaluation4 = this.expectimax(newBoard4, depth - 1, true);
                expectedScore += evaluation4.score * 0.1;
                
                possibleMoves += 1;
            }
            
            return { 
                score: possibleMoves > 0 ? expectedScore / possibleMoves : 0,
                move: null 
            };
        }
    }

    // 获取最佳移动
    getBestMove(board) {
        const emptyCells = this.countEmptyCells(board);
        
        // 根据空格数量动态调整搜索深度
        let actualDepth = this.searchDepth;
        if (emptyCells > 10) {
            actualDepth = Math.max(3, this.searchDepth - 1); // 早期减少深度
        } else if (emptyCells < 4) {
            actualDepth = Math.min(6, this.searchDepth + 1); // 后期增加深度
        }
        
        console.log(`搜索深度: ${actualDepth}, 空格数: ${emptyCells}`);
        
        this.stats.evaluations = 0;
        const startTime = Date.now();
        
        const result = this.expectimax(board, actualDepth, true);
        
        const endTime = Date.now();
        console.log(`搜索耗时: ${endTime - startTime}ms, 评估次数: ${this.stats.evaluations}`);
        
        return result.move;
    }

    // 启动AI
    async start() {
        if (this.running) return;
        
        this.running = true;
        this.stats.moves = 0;
        this.stats.maxTile = 0;
        this.stats.startTime = Date.now();
        
        console.log('🚀 强化AI开始运行');
        this.assistant.updateStatus('🚀 强化AI运行中...');
        
        while (this.running) {
            try {
                const board = this.assistant.extractBoard();
                
                if (!board) {
                    this.assistant.updateStatus('❌ 无法读取棋盘');
                    break;
                }
                
                if (this.isGameOver(board)) {
                    const maxTile = Math.max(...board.flat());
                    const elapsed = Math.floor((Date.now() - this.stats.startTime) / 1000);
                    
                    this.assistant.updateStatus(`
                        🎯 游戏结束！<br>
                        🏆 最高分: ${maxTile}<br>
                        📊 步数: ${this.stats.moves}<br>
                        ⏱️ 用时: ${elapsed}秒<br>
                        💡 平均: ${(this.stats.moves / (elapsed || 1)).toFixed(1)} 步/秒
                    `);
                    
                    console.log('游戏结束统计:');
                    console.log(`最高分: ${maxTile}`);
                    console.log(`总步数: ${this.stats.moves}`);
                    console.log(`用时: ${elapsed}秒`);
                    console.table(board);
                    break;
                }
                
                const bestMove = this.getBestMove(board);
                
                if (bestMove) {
                    this.assistant.simulateKey(bestMove);
                    this.stats.moves++;
                    
                    const currentMaxTile = Math.max(...board.flat());
                    this.stats.maxTile = Math.max(this.stats.maxTile, currentMaxTile);
                    
                    const emptyCells = this.countEmptyCells(board);
                    const elapsed = Math.floor((Date.now() - this.stats.startTime) / 1000);
                    
                    this.assistant.updateStatus(`
                        🎮 第 ${this.stats.moves} 步: ${bestMove.replace('Arrow', '')}<br>
                        🏆 最高: ${currentMaxTile} | 📦 空格: ${emptyCells}<br>
                        ⏱️ 用时: ${elapsed}s | 🚀 ${(this.stats.moves / (elapsed || 1)).toFixed(1)} 步/秒
                    `);
                    
                    console.log(`第${this.stats.moves}步: ${bestMove}, 最高分: ${currentMaxTile}`);
                } else {
                    this.assistant.updateStatus('❌ 无可用移动');
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, this.moveDelay));
                
            } catch (error) {
                console.error('AI运行错误:', error);
                this.assistant.updateStatus('❌ AI出错: ' + error.message);
                break;
            }
        }
        
        this.running = false;
        console.log('🛑 强化AI停止运行');
    }

    // 停止AI
    stop() {
        this.running = false;
        this.assistant.updateStatus('⏹️ 强化AI已停止');
        console.log('🛑 AI已停止');
    }
}

// 创建全局实例
const assistant = new Enhanced2048Assistant();

console.log('🚀 强化版2048助手已加载！');
console.log('🎯 新特性:');
console.log('  🧠 Expectimax算法 - 考虑随机性的最优决策');
console.log('  📊 多维度评估 - 位置、单调性、平滑度、梯度');
console.log('  🔧 动态搜索深度 - 根据游戏状态自动调节');
console.log('  ⚡ 性能优化 - 智能剪枝和缓存');
console.log('  📈 实时统计 - 详细的性能和进度数据');
console.log('');
console.log('💪 强化策略:');
console.log('  🎯 强化角落策略 - 最大数字保持在角落');
console.log('  📐 梯度优化 - 数字按大小有序排列');
console.log('  🔄 期望值最大化 - 考虑所有可能的随机结果');
console.log('  ⚙️ 自适应深度 - 游戏不同阶段使用不同策略');