/*
 * ENDLESS WORLD - Prozedurale Mittelalter-Welt
 * 
 * README:
 * =======
 * 
 * BEDIENUNG:
 * - Pfeiltasten: Figur bewegen (← → ↑ ↓)
 * - Shift: Sprint aktivieren
 * - E: Information (Biom & Koordinaten) anzeigen
 * - R: Neuen Seed generieren
 * 
 * URL PARAMETER:
 * - ?seed=12345 - Setzt festen Seed für deterministische Welt
 * - Ohne Parameter = zufälliger Seed
 * 
 * TECHNISCHE HINWEISE:
 * - Chunk-basiertes System für endlose Welt
 * - Noise-basierte prozedurale Generierung
 * - Biome basierend auf Höhe und Feuchtigkeit
 * - Tag/Nacht Zyklus überführt
 * - Kollisionserkennung für unpassierbare Bereiche
 * 
 * ERWEITERUNGSMÖGLICHKEITEN:
 * - Inventar System (Taste I)
 * - Dorfbewohner mit KI
 * - Resource Gathering
 * - Crafting System
 * - Mehr Biome und Strukturen
 */

// ============================================================================
// KONFIGURATION
// ============================================================================

const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 1024,
    CANVAS_HEIGHT: 576,
    
    // Tile System
    TILE_SIZE: 32,
    CHUNK_SIZE: 32,
    
    // Player
    PLAYER_SPEED: 2,
    PLAYER_SPRINT_MULTIPLIER: 1.8,
    PLAYER_SIZE: 16,
    LIGHT_RADIUS: 150,
    
    // Camera
    CAMERA_SMOOTH: 0.1,
    
    // World Generation
    NOISE_SCALE_HEIGHT: 0.05,
    NOISE_SCALE_MOISTURE: 0.07,
    RIVER_THRESHOLD: 0.4,
    MIN_RIVER_WIDTH: 2,
    
    // Biome Thresholds
    HEIGHT_WATER: 0.3,
    HEIGHT_SAND: 0.45,
    HEIGHT_GRASS: 0.65,
    HEIGHT_FOREST: 0.85,
    MOISTURE_GRASS: 0.5,
    MOISTURE_FIELD: 0.7,
    
    // Time Cycle
    DAY_LENGTH: 60000, // 60 Sekunden
    TRANSITION_DURATION: 10000, // 10 Sekunden für Dämmerung
};

// ============================================================================
// NOISE GENERATOR (Simplified Perlin-like)
// ============================================================================

class NoiseGenerator {
    constructor(seed) {
        this.seed = seed;
        this.perm = [];
        this.permMod12 = [];
        this.init();
    }
    
    init() {
        for (let i = 0; i < 512; i++) {
            const p = this.seededRandom(this.seed + i);
            this.perm[i] = Math.floor(p * 256);
            this.permMod12[i] = this.perm[i] % 12;
        }
    }
    
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // 2D Noise
    noise2D(x, y) {
        const p = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 0.7], [-1, 0.7], [0.7, 1], [-0.7, -1]
        ];
        
        const floorX = Math.floor(x);
        const floorY = Math.floor(y);
        const X = floorX & 255;
        const Y = floorY & 255;
        
        const fx = x - floorX;
        const fy = y - floorY;
        
        const u = this.fade(fx);
        const v = this.fade(fy);
        
        const aa = this.permMod12[this.perm[X] + Y];
        const ab = this.permMod12[this.perm[X + 1] + Y];
        const ba = this.permMod12[this.perm[X] + Y + 1];
        const bb = this.permMod12[this.perm[X + 1] + Y + 1];
        
        const gaa = p[aa];
        const gab = p[ab];
        const gba = p[ba];
        const gbb = p[bb];
        
        const l1 = this.lerp(
            this.dot(gaa, fx, fy),
            this.dot(gab, fx - 1, fy),
            u
        );
        const l2 = this.lerp(
            this.dot(gba, fx, fy - 1),
            this.dot(gbb, fx - 1, fy - 1),
            u
        );
        
        return this.lerp(l1, l2, v);
    }
    
    // Multi-Octave Noise
    fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return value / maxValue;
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function getURLParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// ============================================================================
// GAME STATE
// ============================================================================

const gameState = {
    // Canvas
    canvas: null,
    ctx: null,
    
    // World
    seed: null,
    noiseGen: null,
    chunks: new Map(),
    loadedChunks: new Set(),
    
    // Player
    player: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        sprite: 0
    },
    
    // Camera
    camera: {
        x: 0,
        y: 0
    },
    
    // Input
    keys: {},
    
    // Time
    time: 0,
    dayProgress: 0,
    
    // Info
    showInfo: false,
    
    // Performance
    fps: 60,
    lastFrameTime: 0
};

// ============================================================================
// BIOME SYSTEM
// ============================================================================

const BIOMES = {
    WATER: { color: '#4287f5', deco: null, passable: false },
    SAND: { color: '#f4d03f', deco: '🌊', passable: true },
    GRASS: { color: '#76d275', deco: '🌸', passable: true },
    FIELD: { color: '#fdd835', deco: '🌾', passable: true },
    FOREST: { color: '#66bb6a', deco: '🌳', passable: true },
    HILL: { color: '#78909c', deco: '🗻', passable: true },
    RIVER: { color: '#42a5f5', deco: null, passable: false },
    BRIDGE: { color: '#8d6e63', deco: null, passable: true },
    ROCK: { color: '#757575', deco: null, passable: false }
};

function getBiome(height, moisture, river) {
    if (river) return BIOMES.RIVER;
    if (height < CONFIG.HEIGHT_WATER) return BIOMES.WATER;
    if (height < CONFIG.HEIGHT_SAND) return BIOMES.SAND;
    if (height < CONFIG.HEIGHT_GRASS) {
        if (moisture > CONFIG.MOISTURE_FIELD) return BIOMES.FIELD;
        return BIOMES.GRASS;
    }
    if (height < CONFIG.HEIGHT_FOREST) {
        if (moisture > CONFIG.MOISTURE_GRASS) return BIOMES.FOREST;
        return BIOMES.GRASS;
    }
    if (height > 0.9) return BIOMES.ROCK;
    return BIOMES.HILL;
}

// ============================================================================
// CHUNK SYSTEM
// ============================================================================

class Chunk {
    constructor(chunkX, chunkY) {
        this.x = chunkX;
        this.y = chunkY;
        this.worldX = chunkX * CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;
        this.worldY = chunkY * CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;
        this.tiles = [];
        this.generated = false;
    }
    
    generate(gameState) {
        if (this.generated) return;
        
        const { noiseGen } = gameState;
        this.tiles = [];
        
        // Generate height and moisture maps
        const heightMap = [];
        const moistureMap = [];
        const riverMap = [];
        
        for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
            heightMap[ty] = [];
            moistureMap[ty] = [];
            riverMap[ty] = [];
            
            for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
                const worldX = this.worldX + tx * CONFIG.TILE_SIZE;
                const worldY = this.worldY + ty * CONFIG.TILE_SIZE;
                
                const nx = worldX * CONFIG.NOISE_SCALE_HEIGHT;
                const ny = worldY * CONFIG.NOISE_SCALE_HEIGHT;
                
                // Multi-octave noise for terrain
                const height = noiseGen.fbm(nx, ny, 5, 0.5, 2.0);
                const moisture = noiseGen.fbm(nx * 1.3 + 1000, ny * 1.3 + 1000, 3, 0.6, 2.0);
                
                heightMap[ty][tx] = height;
                moistureMap[ty][tx] = moisture;
                
                // Simple river generation using height field
                const isRiver = Math.abs(noiseGen.noise2D(nx * 0.02, ny * 0.02)) < 0.1 && 
                               height > CONFIG.HEIGHT_SAND && height < CONFIG.HEIGHT_FOREST;
                riverMap[ty][tx] = isRiver;
            }
        }
        
        // Generate tiles
        for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
            this.tiles[ty] = [];
            for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
                const height = heightMap[ty][tx];
                const moisture = moistureMap[ty][tx];
                const river = riverMap[ty][tx] || 
                             (ty > 0 && riverMap[ty - 1][tx]) ||
                             (tx > 0 && riverMap[ty][tx - 1]);
                
                const biome = getBiome(height, moisture, river);
                
                // Check for bridges over rivers
                let tileType = biome;
                if (biome === BIOMES.RIVER) {
                    // Check if this should be a bridge
                    const hasRoad = Math.abs(noiseGen.noise2D(
                        (this.worldX + tx * CONFIG.TILE_SIZE) * 0.01,
                        (this.worldY + ty * CONFIG.TILE_SIZE) * 0.01
                    )) < 0.05;
                    if (hasRoad) tileType = BIOMES.BRIDGE;
                }
                
                this.tiles[ty][tx] = {
                    biome: tileType,
                    height,
                    moisture,
                    x: tx,
                    y: ty
                };
            }
        }
        
        this.generated = true;
    }
    
    getTile(localX, localY) {
        if (localY >= 0 && localY < this.tiles.length &&
            localX >= 0 && localX < this.tiles[localY].length) {
            return this.tiles[localY][localX];
        }
        return null;
    }
}

// ============================================================================
// CHUNK MANAGER
// ============================================================================

function getChunkKey(x, y) {
    return `${x},${y}`;
}

function worldToChunk(worldX, worldY) {
    return {
        x: Math.floor(worldX / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE)),
        y: Math.floor(worldY / (CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE))
    };
}

function getChunk(chunkX, chunkY, gameState) {
    const key = getChunkKey(chunkX, chunkY);
    
    if (!gameState.chunks.has(key)) {
        const chunk = new Chunk(chunkX, chunkY);
        chunk.generate(gameState);
        gameState.chunks.set(key, chunk);
    }
    
    return gameState.chunks.get(key);
}

function loadChunksAroundPlayer(gameState) {
    const { player } = gameState;
    const chunk = worldToChunk(player.x, player.y);
    const loadDistance = 3;
    
    const chunksToLoad = [];
    for (let dy = -loadDistance; dy <= loadDistance; dy++) {
        for (let dx = -loadDistance; dx <= loadDistance; dx++) {
            const cx = chunk.x + dx;
            const cy = chunk.y + dy;
            chunksToLoad.push({ x: cx, y: cy });
        }
    }
    
    chunksToLoad.forEach(({ x, y }) => {
        getChunk(x, y, gameState);
    });
}

function getTileAt(worldX, worldY, gameState) {
    const chunk = worldToChunk(worldX, worldY);
    const chunkObj = gameState.chunks.get(getChunkKey(chunk.x, chunk.y));
    
    if (!chunkObj) return null;
    
    const localX = Math.floor((worldX - chunkObj.worldX) / CONFIG.TILE_SIZE);
    const localY = Math.floor((worldY - chunkObj.worldY) / CONFIG.TILE_SIZE);
    
    return chunkObj.getTile(localX, localY);
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

function handleKeyDown(event) {
    gameState.keys[event.key] = true;
    
    if (event.key === 'e' || event.key === 'E') {
        gameState.showInfo = !gameState.showInfo;
    }
    
    if (event.key === 'r' || event.key === 'R') {
        // Generate new random seed
        const newSeed = Math.floor(Math.random() * 1000000);
        window.location.href = `?seed=${newSeed}`;
    }
}

function handleKeyUp(event) {
    gameState.keys[event.key] = false;
}

// ============================================================================
// PLAYER MOVEMENT
// ============================================================================

function updatePlayer(gameState) {
    const { player, keys } = gameState;
    
    let dx = 0;
    let dy = 0;
    let speed = CONFIG.PLAYER_SPEED;
    
    if (keys['Shift']) {
        speed *= CONFIG.PLAYER_SPRINT_MULTIPLIER;
    }
    
    if (keys['ArrowLeft']) dx -= speed;
    if (keys['ArrowRight']) dx += speed;
    if (keys['ArrowUp']) dy -= speed;
    if (keys['ArrowDown']) dy += speed;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    
    // Calculate new position
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    // Check collision
    const tile = getTileAt(newX, newY, gameState);
    if (!tile || tile.biome.passable) {
        player.x = newX;
        player.y = newY;
    }
    
    // Update sprite animation
    if (dx !== 0 || dy !== 0) {
        player.sprite = (player.sprite + 0.1) % 4;
    }
    
    // Update camera
    gameState.camera.x += (player.x - gameState.camera.x) * CONFIG.CAMERA_SMOOTH;
    gameState.camera.y += (player.y - gameState.camera.y) * CONFIG.CAMERA_SMOOTH;
}

// ============================================================================
// RENDERING
// ============================================================================

function drawTile(ctx, x, y, biome) {
    ctx.fillStyle = biome.color;
    ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    
    // Draw decoration
    if (biome.deco && Math.random() < 0.05) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            biome.deco,
            x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 + 5
        );
    }
}

function renderChunk(ctx, chunk, camera) {
    const screenX = chunk.worldX - camera.x + CONFIG.CANVAS_WIDTH / 2;
    const screenY = chunk.worldY - camera.y + CONFIG.CANVAS_HEIGHT / 2;
    
    // Skip if chunk is off screen
    const chunkPixelSize = CONFIG.CHUNK_SIZE * CONFIG.TILE_SIZE;
    if (screenX + chunkPixelSize < 0 || screenX > CONFIG.CANVAS_WIDTH ||
        screenY + chunkPixelSize < 0 || screenY > CONFIG.CANVAS_HEIGHT) {
        return;
    }
    
    // Draw tiles
    for (let ty = 0; ty < CONFIG.CHUNK_SIZE; ty++) {
        for (let tx = 0; tx < CONFIG.CHUNK_SIZE; tx++) {
            const tile = chunk.getTile(tx, ty);
            if (tile) {
                const x = screenX / CONFIG.TILE_SIZE + tx;
                const y = screenY / CONFIG.TILE_SIZE + ty;
                drawTile(ctx, x, y, tile.biome);
            }
        }
    }
}

function renderPlayer(ctx, gameState) {
    const screenX = CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_SIZE / 2;
    const screenY = CONFIG.CANVAS_HEIGHT / 2 - CONFIG.PLAYER_SIZE / 2;
    
    // Player sprite (simple colored circle)
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.arc(
        screenX + CONFIG.PLAYER_SIZE / 2,
        screenY + CONFIG.PLAYER_SIZE / 2,
        CONFIG.PLAYER_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(
        screenX + CONFIG.PLAYER_SIZE / 2,
        screenY + CONFIG.PLAYER_SIZE + 2,
        CONFIG.PLAYER_SIZE / 2,
        CONFIG.PLAYER_SIZE / 4,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function renderLight(ctx, gameState) {
    const { time, dayProgress, player } = gameState;
    
    // Determine day phase
    let brightness = 1;
    let timeText = 'Tag';
    
    if (dayProgress < 0.1) { // Dawn
        brightness = 0.7 + dayProgress * 10;
        timeText = 'Morgendämmerung';
    } else if (dayProgress < 0.45) { // Day
        brightness = 1;
        timeText = 'Tag';
    } else if (dayProgress < 0.55) { // Dusk
        brightness = 1 - (dayProgress - 0.45) * 10;
        timeText = 'Abenddämmerung';
    } else { // Night
        brightness = 0.3;
        timeText = 'Nacht';
    }
    
    // Update time display
    const timeDisplay = document.getElementById('timeDisplay');
    timeDisplay.textContent = timeText;
    timeDisplay.className = 'time-display ' + (dayProgress < 0.1 ? 'dawn' : dayProgress < 0.45 ? '' : dayProgress < 0.55 ? 'dusk' : 'night');
    
    // Apply brightness filter
    if (brightness < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - brightness})`;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
    
    // Night light circle around player
    if (brightness < 0.6) {
        const radius = CONFIG.LIGHT_RADIUS * (1 - (dayProgress - 0.5) * 2);
        const gradient = ctx.createRadialGradient(
            CONFIG.CANVAS_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT / 2,
            0,
            CONFIG.CANVAS_WIDTH / 2,
            CONFIG.CANVAS_HEIGHT / 2,
            radius
        );
        gradient.addColorStop(0, 'rgba(255,255,200,0.4)');
        gradient.addColorStop(0.7, 'rgba(255,255,200,0.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }
}

function render(gameState) {
    const { ctx, camera } = gameState;
    
    // Clear canvas
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // Render visible chunks
    gameState.chunks.forEach(chunk => {
        renderChunk(ctx, chunk, camera);
    });
    
    // Render player
    renderPlayer(ctx, gameState);
    
    // Render lighting and day/night cycle
    renderLight(ctx, gameState);
    
    // Render info overlay
    if (gameState.showInfo) {
        const tile = getTileAt(gameState.player.x, gameState.player.y, gameState);
        const biomeName = tile ? Object.keys(BIOMES).find(k => BIOMES[k] === tile.biome) : 'UNKNOWN';
        
        document.getElementById('biomeInfo').textContent = `Biom: ${biomeName}`;
        document.getElementById('positionInfo').textContent = 
            `Position: (${Math.floor(gameState.player.x)}, ${Math.floor(gameState.player.y)})`;
        document.getElementById('info').classList.add('show');
    } else {
        document.getElementById('info').classList.remove('show');
    }
}

// ============================================================================
// UPDATE
// ============================================================================

function update(gameState, deltaTime) {
    // Update time
    gameState.time += deltaTime;
    gameState.dayProgress = (gameState.time % CONFIG.DAY_LENGTH) / CONFIG.DAY_LENGTH;
    
    // Update player
    updatePlayer(gameState);
    
    // Load chunks around player
    loadChunksAroundPlayer(gameState);
    
    // Update FPS
    gameState.fps = Math.round(1000 / deltaTime);
    document.getElementById('fpsInfo').textContent = `FPS: ${gameState.fps}`;
}

// ============================================================================
// GAME LOOP
// ============================================================================

function gameLoop(timestamp) {
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;
    
    update(gameState, deltaTime);
    render(gameState);
    
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function initGame() {
    // Initialize canvas
    gameState.canvas = document.getElementById('gameCanvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    gameState.canvas.width = CONFIG.CANVAS_WIDTH;
    gameState.canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Get seed from URL or generate random
    const seedParam = getURLParam('seed');
    gameState.seed = seedParam ? parseInt(seedParam) : Math.floor(Math.random() * 1000000);
    document.getElementById('seedInfo').textContent = `Seed: ${gameState.seed}`;
    
    // Initialize noise generator
    gameState.noiseGen = new NoiseGenerator(gameState.seed);
    
    // Initialize input
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Start game loop
    gameState.lastFrameTime = performance.now();
    gameLoop(gameState.lastFrameTime);
    
    console.log('Endless World initialized with seed:', gameState.seed);
    console.log('Controls: Arrow keys to move, Shift to sprint, E for info, R for new seed');
}

// Start game when page loads
window.addEventListener('load', initGame);
