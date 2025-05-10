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
let highScore = localStorage.getItem('snakeHighScore') || 0;
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
    score = 0;
    scoreElement.textContent = score;
    isPaused = false;
    isGameOver = false;
    
    // 更新按钮状态
    startButton.disabled = true;
    pauseButton.disabled = false;
    
    // 根据速度设置游戏循环间隔
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, 1000 / speed);
    
    // 绘制游戏界面
    draw();
}

// 生成食物
function generateFood() {
    // 确保食物不会出现在蛇身上
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
        
        validPosition = true;
        // 检查是否与蛇身重叠
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                validPosition = false;
                break;
            }
        }
    }
}

// 游戏单步逻辑
function gameStep() {
    if (isPaused || isGameOver) return;
    
    // 更新方向
    direction = nextDirection;
    
    // 计算蛇头的下一个位置
    const head = { ...snake[0] };
    head.x += direction.x * gridSize;
    head.y += direction.y * gridSize;
    
    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // 移动蛇
    snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 增加分数
        score++;
        scoreElement.textContent = score;
        finalScoreElement.textContent = score;
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        
        // 播放吃食物的声音
        sounds.eat.currentTime = 0;
        sounds.eat.play();
        
        // 生成新食物
        generateFood();
    } else {
        // 如果没吃到食物，移除尾部
        snake.pop();
        
        // 播放移动声音
        if (Math.random() < 0.2) { // 只在20%的步骤中播放，避免声音过多
            sounds.move.currentTime = 0;
            sounds.move.play();
        }
    }
    
    // 更新画面
    draw();
}

// 检查碰撞
function checkCollision(position) {
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
    for (let i = 0; i < snake.length; i++) {
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
    drawFood();
    
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
function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    
    // 播放游戏结束声音
    sounds.gameOver.currentTime = 0;
    sounds.gameOver.play();
    
    // 更新按钮状态
    startButton.disabled = false;
    pauseButton.disabled = true;
    
    // 显示游戏结束模态框
    finalScoreElement.textContent = score;
    gameOverModal.style.display = 'flex';
}

// 暂停游戏
function togglePause() {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? '继续' : '暂停';
}

// 键盘事件监听
function handleKeyDown(e) {
    // 阻止方向键滚动页面
    if ([37, 38, 39, 40, 65, 87, 68, 83, 32].includes(e.keyCode)) {
        e.preventDefault();
    }
    
    // 如果游戏结束，忽略键盘输入
    if (isGameOver) return;
    
    // 根据按键设置下一个方向
    switch (e.keyCode) {
        // 左箭头或A键
        case 37:
        case 65:
            if (direction !== DIRECTIONS.RIGHT) nextDirection = DIRECTIONS.LEFT;
            break;
        // 上箭头或W键
        case 38:
        case 87:
            if (direction !== DIRECTIONS.DOWN) nextDirection = DIRECTIONS.UP;
            break;
        // 右箭头或D键
        case 39:
        case 68:
            if (direction !== DIRECTIONS.LEFT) nextDirection = DIRECTIONS.RIGHT;
            break;
        // 下箭头或S键
        case 40:
        case 83:
            if (direction !== DIRECTIONS.UP) nextDirection = DIRECTIONS.DOWN;
            break;
        // 空格键，用于暂停/继续游戏
        case 32:
            togglePause();
            break;
    }
}

// 更新速度
function updateSpeed() {
    speed = parseInt(speedRangeElement.value);
    speedValueElement.textContent = speed;
    
    // 如果游戏正在进行，更新游戏循环
    if (!isGameOver && !isPaused && gameLoop) {
        clearInterval(gameLoop);
        gameLoop = setInterval(gameStep, 1000 / speed);
    }
}

// 触摸控制支持
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (isGameOver) return;
    
    // 阻止页面滚动
    e.preventDefault();
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // 确定主导方向（水平或垂直）
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0 && direction !== DIRECTIONS.LEFT) {
            nextDirection = DIRECTIONS.RIGHT;
        } else if (dx < 0 && direction !== DIRECTIONS.RIGHT) {
            nextDirection = DIRECTIONS.LEFT;
        }
    } else {
        // 垂直滑动
        if (dy > 0 && direction !== DIRECTIONS.UP) {
            nextDirection = DIRECTIONS.DOWN;
        } else if (dy < 0 && direction !== DIRECTIONS.DOWN) {
            nextDirection = DIRECTIONS.UP;
        }
    }
    
    // 更新触摸起始点，使滑动更加流畅
    touchStartX = touchEndX;
    touchStartY = touchEndY;
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
    
    // 绘制初始界面
    draw();
}

// 当页面加载完成时初始化游戏
window.addEventListener('load', init);