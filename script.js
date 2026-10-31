// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const speedRangeElement = document.getElementById('speedRange');
const speedValueElement = document.getElementById('speedValue');
const startButton = document.getElementById('startBtn');
const pauseButton = document.getElementById('pauseBtn');
const restartButton = document.getElementById('restartBtn');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreElement = document.getElementById('finalScore');

// 游戏配置
const gridSize = 20; // 网格大小
const initialSnakeLength = 5; // 初始蛇的长度
let speed = 5; // 初始速度
let isPaused = false;
let isGameOver = false;
let isRunning = false;
let directionChangePending = false;
let gameLoop;

// 方向常量
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// 游戏状态
let snake = [];
let food = {};
let direction = DIRECTIONS.RIGHT;
let nextDirection = DIRECTIONS.RIGHT;
let score = 0;
let highScore = 0;
try { highScore = Number(localStorage.getItem('snakeHighScore')) || 0; } catch (error) { console.warn('无法读取最高分', error); }
highScoreElement.textContent = highScore;

// 颜色配置
const colors = {
    background: '#E8F5E9',
    snake: {
        head: '#388E3C',
        body: '#4CAF50',
        border: '#2E7D32'
    },
    food: {
        fill: '#F44336',
        border: '#D32F2F'
    },
    grid: 'rgba(0, 0, 0, 0.05)'
};

// 声音效果
const sounds = {
    eat: new Audio(),
    gameOver: new Audio(),
    move: new Audio()
};

// 设置声音源 (可以替换为你自己的声音文件)
sounds.eat.src = 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3';
sounds.gameOver.src = 'https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3';
sounds.move.src = 'https://assets.mixkit.co/sfx/preview/mixkit-move-game-piece-slide-176.mp3';

// 音量调整
sounds.eat.volume = 0.3;
sounds.gameOver.volume = 0.5;
sounds.move.volume = 0.1;

function playSound(audio) {
    try {
        audio.currentTime = 0;
        const result = audio.play();
        if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (error) { /* Audio is optional */ }
}

// 初始化游戏
function initGame() {
    // 初始化蛇
    snake = [];
    const startX = Math.floor(canvas.width / gridSize / 2) * gridSize;
    const startY = Math.floor(canvas.height / gridSize / 2) * gridSize;
    
    for (let i = 0; i < initialSnakeLength; i++) {
        snake.push({
            x: startX - i * gridSize,
            y: startY
        });
    }
    
    // 生成第一个食物
    generateFood();
    
    // 重置游戏状态
    direction = DIRECTIONS.RIGHT;
    nextDirection = DIRECTIONS.RIGHT;
    directionChangePending = false;
    score = 0;
    scoreElement.textContent = score;
    isPaused = false;
    isGameOver = false;
    isRunning = true;
    pauseButton.textContent = '暂停';
    gameOverModal.style.display = 'none';
    document.getElementById('modalTitle').textContent = '游戏结束!';
    
    // 更新按钮状态
    startButton.disabled = true;
    pauseButton.disabled = false;
    
    // 根据速度设置游戏循环间隔
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, 1000 / speed);
    
    // 绘制游戏界面
    draw();
}

// 选择空闲格子；满棋盘时返回 false，避免无限循环
function generateFood() {
    const occupied = new Set(snake.map(p => p.x + ',' + p.y));
    const free = [];
    for (let y = 0; y < canvas.height; y += gridSize) {
        for (let x = 0; x < canvas.width; x += gridSize) {
            if (!occupied.has(x + ',' + y)) free.push({ x, y });
        }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    return food !== null;
}

// 游戏单步逻辑
function gameStep() {
    if (isPaused || isGameOver) return;
    
    // 更新方向
    direction = nextDirection;
    directionChangePending = false;
    
    // 计算蛇头的下一个位置
    const head = { ...snake[0] };
    head.x += direction.x * gridSize;
    head.y += direction.y * gridSize;
    
    // 检查碰撞
    const eating = head.x === food.x && head.y === food.y;
    if (checkCollision(head, eating)) {
        gameOver();
        return;
    }
    
    // 移动蛇
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (eating) {
        // 增加分数
        score++;
        scoreElement.textContent = score;
        finalScoreElement.textContent = score;
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            try { localStorage.setItem('snakeHighScore', String(highScore)); } catch (error) { console.warn('无法保存最高分', error); }
        }
        
        // 播放吃食物的声音
        playSound(sounds.eat);
        
        // 生成新食物
        if (!generateFood()) {
            draw();
            gameOver(true);
            return;
        }
    } else {
        // 如果没吃到食物，移除尾部
        snake.pop();
        
        // 播放移动声音
        if (Math.random() < 0.2) { // 只在20%的步骤中播放，避免声音过多
            playSound(sounds.move);
        }
    }
    
    // 更新画面
    draw();
}

// 检查碰撞
function checkCollision(position, eating) {
    // 检查撞墙
    if (
        position.x < 0 ||
        position.y < 0 ||
        position.x >= canvas.width ||
        position.y >= canvas.height
    ) {
        return true;
    }
    
    // 检查撞到自己的身体
    // 蛇尾在非进食步骤会移走，所以允许蛇头进入旧尾部位置
    const occupiedLength = eating ? snake.length : snake.length - 1;
    for (let i = 0; i < occupiedLength; i++) {
        if (snake[i].x === position.x && snake[i].y === position.y) {
            return true;
        }
    }
    
    return false;
}

// 绘制游戏界面
function draw() {
    // 清除画布
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线
    drawGrid();
    
    // 绘制食物
    if (food) drawFood();
    
    // 绘制蛇
    drawSnake();
}

// 绘制网格
function drawGrid() {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    
    // 绘制垂直线
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 绘制食物
function drawFood() {
    ctx.fillStyle = colors.food.fill;
    ctx.strokeStyle = colors.food.border;
    ctx.lineWidth = 2;
    
    // 绘制一个圆形食物
    const radius = gridSize / 2;
    const centerX = food.x + radius;
    const centerY = food.y + radius;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 添加高光效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX - radius / 3, centerY - radius / 3, radius / 3, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制蛇
function drawSnake() {
    // 绘制蛇身
    for (let i = 1; i < snake.length; i++) {
        const segment = snake[i];
        
        // 绘制蛇身段
        ctx.fillStyle = colors.snake.body;
        ctx.strokeStyle = colors.snake.border;
        ctx.lineWidth = 2;
        ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
        ctx.strokeRect(segment.x, segment.y, gridSize, gridSize);
        
        // 添加一些细节，使每个段看起来稍微不同（纹理）
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(segment.x + 4, segment.y + 4, gridSize - 8, gridSize - 8);
    }
    
    // 绘制蛇头
    const head = snake[0];
    ctx.fillStyle = colors.snake.head;
    ctx.strokeStyle = colors.snake.border;
    ctx.lineWidth = 2;
    ctx.fillRect(head.x, head.y, gridSize, gridSize);
    ctx.strokeRect(head.x, head.y, gridSize, gridSize);
    
    // 绘制眼睛
    const eyeSize = 4;
    ctx.fillStyle = 'white';
    
    // 根据方向调整眼睛位置
    if (direction === DIRECTIONS.RIGHT) {
        ctx.fillRect(head.x + gridSize - 8, head.y + 5, eyeSize, eyeSize);
        ctx.fillRect(head.x + gridSize - 8, head.y + gridSize - 9, eyeSize, eyeSize);
    } else if (direction === DIRECTIONS.LEFT) {
        ctx.fillRect(head.x + 4, head.y + 5, eyeSize, eyeSize);
        ctx.fillRect(head.x + 4, head.y + gridSize - 9, eyeSize, eyeSize);
    } else if (direction === DIRECTIONS.UP) {
        ctx.fillRect(head.x + 5, head.y + 4, eyeSize, eyeSize);
        ctx.fillRect(head.x + gridSize - 9, head.y + 4, eyeSize, eyeSize);
    } else if (direction === DIRECTIONS.DOWN) {
        ctx.fillRect(head.x + 5, head.y + gridSize - 8, eyeSize, eyeSize);
        ctx.fillRect(head.x + gridSize - 9, head.y + gridSize - 8, eyeSize, eyeSize);
    }
    
    // 绘制黑色瞳孔
    ctx.fillStyle = 'black';
    const pupilSize = 2;
    
    if (direction === DIRECTIONS.RIGHT) {
        ctx.fillRect(head.x + gridSize - 6, head.y + 6, pupilSize, pupilSize);
        ctx.fillRect(head.x + gridSize - 6, head.y + gridSize - 8, pupilSize, pupilSize);
    } else if (direction === DIRECTIONS.LEFT) {
        ctx.fillRect(head.x + 5, head.y + 6, pupilSize, pupilSize);
        ctx.fillRect(head.x + 5, head.y + gridSize - 8, pupilSize, pupilSize);
    } else if (direction === DIRECTIONS.UP) {
        ctx.fillRect(head.x + 6, head.y + 5, pupilSize, pupilSize);
        ctx.fillRect(head.x + gridSize - 8, head.y + 5, pupilSize, pupilSize);
    } else if (direction === DIRECTIONS.DOWN) {
        ctx.fillRect(head.x + 6, head.y + gridSize - 6, pupilSize, pupilSize);
        ctx.fillRect(head.x + gridSize - 8, head.y + gridSize - 6, pupilSize, pupilSize);
    }
}

// 游戏结束处理
function gameOver(victory = false) {
    isGameOver = true;
    isRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;
    
    // 播放游戏结束声音
    if (!victory) playSound(sounds.gameOver);
    
    // 更新按钮状态
    startButton.disabled = false;
    pauseButton.disabled = true;
    
    // 显示游戏结束模态框
    finalScoreElement.textContent = score;
    document.getElementById('modalTitle').textContent = victory ? '恭喜通关！' : '游戏结束!';
    gameOverModal.style.display = 'flex';
}

// 暂停游戏
function togglePause() {
    if (!isRunning || isGameOver) return;
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? '继续' : '暂停';
}

// 每个游戏步骤只接受一次方向改变
function requestDirection(candidate) {
    if (!isRunning || isPaused || isGameOver || directionChangePending) return;
    if (candidate.x === -direction.x && candidate.y === -direction.y) return;
    if (candidate === direction) return;
    nextDirection = candidate;
    directionChangePending = true;
}
function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const candidate = {
        arrowleft: DIRECTIONS.LEFT, a: DIRECTIONS.LEFT,
        arrowup: DIRECTIONS.UP, w: DIRECTIONS.UP,
        arrowright: DIRECTIONS.RIGHT, d: DIRECTIONS.RIGHT,
        arrowdown: DIRECTIONS.DOWN, s: DIRECTIONS.DOWN
    }[key];
    if (!isRunning || isGameOver) return;
    if (candidate || e.code === 'Space') e.preventDefault();
    if (candidate) requestDirection(candidate);
    else if (e.code === 'Space' && !e.repeat) togglePause();
}

// 更新速度
function updateSpeed() {
    speed = parseInt(speedRangeElement.value);
    speedValueElement.textContent = speed;
    
    // 如果游戏正在进行，更新游戏循环
    if (isRunning && gameLoop) {
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, 1000 / speed);
    }
}

// 触控需要滑动超过阈值，避免误触
let touchStartX = 0, touchStartY = 0;
function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}
function handleTouchMove(e) {
    if (!isRunning || isPaused || isGameOver) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    requestDirection(Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT)
        : (dy > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP));
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

// 初始化函数
function init() {
    // 设置事件监听器
    document.addEventListener('keydown', handleKeyDown);
    startButton.addEventListener('click', initGame);
    pauseButton.addEventListener('click', togglePause);
    restartButton.addEventListener('click', function() {
        gameOverModal.style.display = 'none';
        initGame();
    });
    speedRangeElement.addEventListener('input', updateSpeed);
    document.querySelectorAll('[data-direction]').forEach(button => {
        button.addEventListener('click', () => requestDirection(DIRECTIONS[button.dataset.direction]));
    });
    
    // 触摸控制
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // 禁用右键菜单
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // 设置初始速度
    speed = parseInt(speedRangeElement.value);
    speedValueElement.textContent = speed;
    
    // 设置初始按钮状态
    pauseButton.disabled = true;
    
    // 初始化展示状态，避免未开始时空蛇造成报错
    snake = Array.from({ length: initialSnakeLength }, (_, i) => ({ x: 240 - i * gridSize, y: 240 }));
    generateFood();
    draw();
}

// 当页面加载完成时初始化游戏
window.addEventListener('load', init);