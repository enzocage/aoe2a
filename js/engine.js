// ==========================================
// Imperium der Zeitalter – Core Game Engine & Simulation
// ==========================================

        class GameEngine extends GameRendererEngine {
            constructor() {
                super();
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.miniCanvas = document.getElementById('minimapCanvas');
                this.miniCtx = this.miniCanvas.getContext('2d');
                this.sound = new SoundSystem();

                this.worldSize = 2400;
                this.fogGridSize = 60;
                this.fogCellSize = this.worldSize / this.fogGridSize;
                this.navGrid = new NavGrid(this.worldSize, 40);
                this.townBellActive = false;
                this.playerCiv = 'franks';
                this.activeFormation = 'box';
                this.controlGroups = {};

                this.camera = { x: 0, y: 0, zoom: 0.95, vx: 0, vy: 0 };
                this.keys = {};
                this.touchMode = 'cmd';
                this.buildModeType = null;
                this.buildPreviewPos = { x: 0, y: 0 };

                this.pointer = {
                    down: false,
                    startX: 0, startY: 0,
                    curX: 0, curY: 0,
                    mode: 'cmd',
                    pinchDist: 0
                };
                this.isBoxSelecting = false;
                this.boxSelectRect = null;

                this.resize();
                window.addEventListener('resize', () => this.resize());

                this.generateTerrainTexture();
                this.bindInputEvents();
                this.initMatch();

                this.lastTimestamp = performance.now();
                requestAnimationFrame((ts) => this.loop(ts));
            }

            resize() {
                this.canvas.width = window.innerWidth || 800;
                this.canvas.height = window.innerHeight || 600;
            }


            initMatch() {
                document.getElementById('gameOverModal').classList.add('hidden');
                document.getElementById('gameOverModal').classList.remove('flex');

                this.idCounter = 1;
                this.gameTime = 0;
                this.gameOver = false;
                this.screenShake = 0;
                this.buildModeType = null;
                this.selectedIds = new Set();
                this.townBellActive = false;
                const btnBell = document.getElementById('btnTownBell');
                if (btnBell) btnBell.classList.remove('active');

                this.factions = {
                    player: {
                        wood: 250, food: 250, gold: 150, stone: 150,
                        age: 1, pop: 0, maxPop: 15,
                        blacksmithLevel: 0,
                        techs: new Set(),
                        researchingAge: false, ageProgress: 0, ageDuration: 12
                    },
                    enemy: {
                        wood: 500, food: 500, gold: 400, stone: 400,
                        age: 1, pop: 0, maxPop: 50,
                        blacksmithLevel: 0,
                        techs: new Set(),
                        nextWaveTimer: 45, waveCount: 0
                    }
                };

                this.resources = [];
                this.buildings = [];
                this.units = [];
                this.projectiles = [];
                this.particles = [];
                this.smokeParticles = [];
                this.slashEffects = [];
                this.commandMarkers = [];
                this.floatingTexts = [];
                this.stumps = [];
                this.craters = [];
                this.corpses = [];

                this.birds = Array.from({ length: 10 }, () => ({
                    x: Math.random() * this.worldSize,
                    y: Math.random() * this.worldSize,
                    vx: 18 + Math.random() * 16,
                    vy: -12 + Math.random() * 24,
                    wingPhase: Math.random() * Math.PI * 2
                }));

                this.clouds = Array.from({ length: 8 }, () => ({
                    x: Math.random() * this.worldSize,
                    y: Math.random() * this.worldSize,
                    rx: 95 + Math.random() * 70,
                    ry: 50 + Math.random() * 40,
                    speed: 10 + Math.random() * 10
                }));

                this.fog = Array.from({ length: this.fogGridSize }, () => new Uint8Array(this.fogGridSize));

                this.generateWorld();
                if (this.navGrid) this.navGrid.rebuildFromBuildings(this.buildings);
                this.updateFogOfWar();
                this.centerOnTownCenter(false);
                this.updateTopUI();
                this.updateSelectionUI();
            }

            generateWorld() {
                const spawnCluster = (type, cx, cy, count, spread, amount) => {
                    for (let i = 0; i < count; i++) {
                        const a = Math.random() * Math.PI * 2;
                        const d = Math.random() * spread;
                        const x = Math.max(70, Math.min(this.worldSize - 70, cx + Math.cos(a) * d));
                        const y = Math.max(70, Math.min(this.worldSize - 70, cy + Math.sin(a) * d));
                        this.resources.push({
                            id: this.idCounter++,
                            entityKind: 'resource',
                            type,
                            x, y,
                            radius: type === 'wood' ? 19 : 17,
                            amount,
                            maxAmount: amount,
                            hitShake: 0
                        });
                    }
                };

                // Player Home Valley (Bottom-Left: ~420, 1920)
                spawnCluster('wood', 250, 1740, 16, 110, 250);
                spawnCluster('wood', 640, 2120, 15, 105, 250);
                spawnCluster('food', 540, 1820, 6, 48, 300);
                spawnCluster('gold', 310, 2140, 5, 42, 420);
                spawnCluster('stone', 690, 1930, 5, 40, 380);

                // Middle & Expansion Resource Clusters
                const midSpots = [
                    [920, 1500, 'wood', 18], [1350, 1220, 'gold', 6], [1050, 960, 'stone', 6],
                    [1500, 1650, 'wood', 16], [850, 620, 'gold', 6], [1420, 820, 'food', 6],
                    [1180, 1340, 'wood', 14], [1680, 1120, 'stone', 5]
                ];
                midSpots.forEach(([cx, cy, t, cnt]) => {
                    spawnCluster(t, cx, cy, cnt, t === 'wood' ? 115 : 46, 360);
                });

                // Player Base
                const pTC = this.spawnBuilding('towncenter', 420, 1940, 'player', true);
                this.spawnBuilding('house', 300, 1900, 'player', true);
                const v1 = this.spawnUnit('villager', 385, 2015, 'player');
                const v2 = this.spawnUnit('villager', 425, 2025, 'player');
                const v3 = this.spawnUnit('villager', 465, 2015, 'player');
                this.spawnUnit('militia', 505, 1965, 'player');
                this.selectedIds.add(v1.id);
                this.selectedIds.add(v2.id);
                this.selectedIds.add(v3.id);

                // Enemy Base (Top-Right: ~1940, 460)
                this.spawnBuilding('towncenter', 1940, 460, 'enemy', true);
                this.spawnBuilding('castle', 1780, 580, 'enemy', true);
                this.spawnBuilding('barracks', 1820, 380, 'enemy', true);
                this.spawnBuilding('archery', 2060, 580, 'enemy', true);
                this.spawnBuilding('tower', 1710, 460, 'enemy', true);
                this.spawnBuilding('tower', 1890, 680, 'enemy', true);

                this.spawnUnit('militia', 1800, 510, 'enemy');
                this.spawnUnit('militia', 1840, 530, 'enemy');
                this.spawnUnit('archer', 1860, 490, 'enemy');
                this.spawnUnit('knight', 1750, 540, 'enemy');

                this.recalculatePop();
            }

            spawnBuilding(type, x, y, faction, completed = false) {
                const def = BUILDINGS_DEF[type];
                const b = {
                    id: this.idCounter++,
                    entityKind: 'building',
                    type,
                    faction,
                    x, y,
                    radius: def.radius,
                    hp: completed ? def.hp : Math.round(def.hp * 0.15),
                    maxHp: def.hp,
                    completed,
                    progress: completed ? 100 : 15,
                    isFarm: !!def.isFarm,
                    farmFood: def.isFarm ? 500 : 0,
                    queue: [],
                    garrison: [],
                    rallyX: x + (faction === 'player' ? 65 : -65),
                    rallyY: y + 55,
                    attackTimer: 0,
                    hurtFlash: 0
                };
                this.buildings.push(b);
                this.recalculatePop();
                return b;
            }

            spawnUnit(type, x, y, faction) {
                const def = UNITS_DEF[type];
                const fState = this.factions[faction];
                const bonusMult = 1 + (fState.age - 1) * 0.12 + (fState.blacksmithLevel || 0) * 0.1;
                let maxHp = Math.round(def.hp * bonusMult);
                let speed = def.speed;
                let attack = Math.round(def.attack * bonusMult);
                let range = def.range;
                let meleeArmor = def.meleeArmor || 0;
                let pierceArmor = def.pierceArmor || 0;
                let maxCarry = 15;

                // Civilization & Tech Bonuses
                if (faction === 'player') {
                    if (this.playerCiv === 'franks' && type === 'knight') {
                        maxHp = Math.round(maxHp * 1.2);
                    } else if (this.playerCiv === 'britons' && (type === 'archer' || type === 'skirmisher')) {
                        range += 30;
                        attack += 1;
                    } else if (this.playerCiv === 'teutons' && (type === 'militia' || type === 'spearman')) {
                        meleeArmor += 2;
                    } else if (this.playerCiv === 'mongols' && type === 'knight') {
                        speed = Math.round(speed * 1.2);
                    }

                    if (fState.techs && fState.techs.has('wheelbarrow') && type === 'villager') {
                        speed = Math.round(speed * 1.25);
                        maxCarry = 20;
                    }
                    if (fState.techs && fState.techs.has('forging') && ['militia', 'knight', 'spearman'].includes(type)) {
                        attack += 2;
                    }
                    if (fState.techs && fState.techs.has('iron_armor')) {
                        meleeArmor += 2;
                        pierceArmor += 2;
                    }
                    if (fState.techs && fState.techs.has('fletching') && ['archer', 'skirmisher'].includes(type)) {
                        attack += 2;
                        range += 25;
                    }
                }

                const u = {
                    id: this.idCounter++,
                    entityKind: 'unit',
                    type,
                    faction,
                    x, y,
                    radius: def.radius,
                    hp: maxHp,
                    maxHp,
                    speed,
                    attack,
                    range,
                    meleeArmor,
                    pierceArmor,
                    cooldown: def.cooldown,
                    attackTimer: 0,
                    state: 'idle',
                    targetX: x,
                    targetY: y,
                    targetEntityId: null,
                    path: [],
                    garrisoned: false,
                    chantTimer: 0,
                    previousState: null,
                    previousTargetEntityId: null,
                    carryType: null,
                    carryAmount: 0,
                    maxCarry,
                    facing: 1,
                    walkCycle: Math.random() * Math.PI * 2,
                    swingAnim: 0,
                    hurtFlash: 0
                };
                this.units.push(u);
                this.recalculatePop();
                return u;
            }

            recalculatePop() {
                this.factions.player.pop = this.units.filter(u => u.faction === 'player' && u.hp > 0).length;
                let maxP = 5;
                this.buildings.forEach(b => {
                    if (b.faction === 'player' && b.completed && b.hp > 0) {
                        maxP += BUILDINGS_DEF[b.type].popBonus || 0;
                    }
                });
                this.factions.player.maxPop = Math.min(60, maxP);
            }

            bindInputEvents() {
                window.addEventListener('blur', () => {
                    this.keys = {};
                });

                window.addEventListener('keydown', (e) => {
                    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

                    const key = e.key.toLowerCase();
                    this.keys[key] = true;
                    this.keys[e.code] = true;

                    // Prevent browser scrolling on arrow keys or space
                    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
                        e.preventDefault();
                    }

                    if (e.key === 'Escape') {
                        this.buildModeType = null;
                        this.updateSelectionUI();
                    } else if (e.key === '.' || e.key === ',' || e.code === 'Period' || e.code === 'Comma') {
                        e.preventDefault();
                        // Select ALL idle villagers (or idle military if no villagers are idle)
                        this.selectIdleVillager(e.key === ',' || e.code === 'Comma');
                    } else if (key === 'h' || e.key === ' ') {
                        this.centerOnTownCenter(true);
                    } else if (key === 'b') {
                        this.toggleTownBell();
                    } else if (key === 'z') {
                        this.cycleFormation();
                    } else if (key >= '1' && key <= '9') {
                        const num = key;
                        if (e.ctrlKey) {
                            e.preventDefault();
                            this.controlGroups[num] = Array.from(this.selectedIds);
                            this.sound.play('click');
                            this.showToast(`🚩 Kampfgruppe ${num} zugewiesen (${this.controlGroups[num].length} Einheiten)!`);
                        } else {
                            const grp = this.controlGroups[num];
                            if (grp && grp.length > 0) {
                                e.preventDefault();
                                const alive = this.units.filter(u => u.faction === 'player' && u.hp > 0 && grp.includes(u.id));
                                if (alive.length > 0) {
                                    this.selectedIds.clear();
                                    let sumX = 0, sumY = 0;
                                    alive.forEach(u => {
                                        this.selectedIds.add(u.id);
                                        sumX += u.x;
                                        sumY += u.y;
                                    });
                                    this.sound.play('click');
                                    this.updateSelectionUI();
                                    const now = performance.now();
                                    if (this._lastGroupPressNum === num && now - (this._lastGroupPressTime || 0) < 380) {
                                        this.centerCameraOn(sumX / alive.length, sumY / alive.length);
                                    }
                                    this._lastGroupPressNum = num;
                                    this._lastGroupPressTime = now;
                                }
                            }
                        }
                    } else if (key === 'f' || key === 'm') {
                        this.selectAllMilitary();
                    } else if (e.key === '+' || e.key === '=') {
                        this.camera.zoom = Math.min(1.75, this.camera.zoom * 1.12);
                    } else if (e.key === '-') {
                        this.camera.zoom = Math.max(0.45, this.camera.zoom * 0.9);
                    }
                });

                window.addEventListener('keyup', (e) => {
                    this.keys[e.key.toLowerCase()] = false;
                    this.keys[e.code] = false;
                });

                // Top & Left UI Buttons
                const btnCiv = document.getElementById('btnCiv');
                if (btnCiv) btnCiv.addEventListener('click', () => this.cycleCivilization());
                document.getElementById('btnAgeUp').addEventListener('click', () => this.tryAdvanceAge());
                document.getElementById('btnMusic').addEventListener('click', (e) => {
                    const on = this.sound.toggleMusic();
                    e.currentTarget.classList.toggle('active', on);
                    this.showToast(on ? '🎵 Mittelalter-Lautenmusik aktiviert' : '🎵 Musik pausiert');
                });
                document.getElementById('btnSound').addEventListener('click', (e) => {
                    this.sound.enabled = !this.sound.enabled;
                    e.currentTarget.classList.toggle('active', this.sound.enabled);
                    e.currentTarget.textContent = this.sound.enabled ? '🔊' : '🔇';
                });
                document.getElementById('btnRestart').addEventListener('click', () => this.initMatch());
                document.getElementById('btnModalRestart').addEventListener('click', () => this.initMatch());

                const btnBell = document.getElementById('btnTownBell');
                if (btnBell) btnBell.addEventListener('click', () => this.toggleTownBell());
                const btnFormation = document.getElementById('btnFormation');
                if (btnFormation) btnFormation.addEventListener('click', () => this.cycleFormation());
                document.getElementById('btnIdleVillager').addEventListener('click', () => this.selectIdleVillager(false));
                document.getElementById('btnSelectArmy').addEventListener('click', () => this.selectAllMilitary());
                document.getElementById('btnHomeTC').addEventListener('click', () => this.centerOnTownCenter(true));

                const setMode = (m) => {
                    this.touchMode = m;
                    this.buildModeType = null;
                    document.getElementById('modeCmd').classList.toggle('active', m === 'cmd');
                    document.getElementById('modeBox').classList.toggle('active', m === 'box');
                    document.getElementById('modeCam').classList.toggle('active', m === 'cam');
                    this.sound.play('click');
                };
                document.getElementById('modeCmd').addEventListener('click', () => setMode('cmd'));
                document.getElementById('modeBox').addEventListener('click', () => setMode('box'));
                document.getElementById('modeCam').addEventListener('click', () => setMode('cam'));

                // Canvas Mouse Events
                this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

                this.canvas.addEventListener('mousedown', (e) => {
                    this.sound.init();
                    const worldPos = this.screenToWorld(e.clientX, e.clientY);
                    if (e.button === 2) {
                        if (this.buildModeType) {
                            this.buildModeType = null;
                            return;
                        }
                        this.issueSmartCommand(worldPos.x, worldPos.y, e.clientX, e.clientY);
                        return;
                    }
                    this.pointer.down = true;
                    this.pointer.startX = this.pointer.curX = e.clientX;
                    this.pointer.startY = this.pointer.curY = e.clientY;
                    this.pointer.mode = e.button === 1 ? 'cam' : this.touchMode;
                });

                window.addEventListener('mousemove', (e) => {
                    const wPos = this.screenToWorld(e.clientX, e.clientY);
                    this.buildPreviewPos = wPos;
                    if (!this.pointer.down) return;

                    const dx = e.clientX - this.pointer.curX;
                    const dy = e.clientY - this.pointer.curY;
                    this.pointer.curX = e.clientX;
                    this.pointer.curY = e.clientY;
                    const dist = Math.hypot(this.pointer.curX - this.pointer.startX, this.pointer.curY - this.pointer.startY);

                    if (this.pointer.mode === 'cam') {
                        this.camera.x = Math.max(-2400, Math.min(2400, this.camera.x - dx / this.camera.zoom));
                        this.camera.y = Math.max(-200, Math.min(2600, this.camera.y - dy / this.camera.zoom));
                    } else if (dist > 14) {
                        this.isBoxSelecting = true;
                        this.boxSelectRect = {
                            x1: Math.min(this.pointer.startX, this.pointer.curX),
                            y1: Math.min(this.pointer.startY, this.pointer.curY),
                            x2: Math.max(this.pointer.startX, this.pointer.curX),
                            y2: Math.max(this.pointer.startY, this.pointer.curY)
                        };
                    }
                });

                window.addEventListener('mouseup', () => {
                    if (!this.pointer.down) return;
                    this.finishPointerInteraction();
                });

                this.canvas.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const factor = e.deltaY < 0 ? 1.12 : 0.9;
                    this.camera.zoom = Math.max(0.45, Math.min(1.75, this.camera.zoom * factor));
                }, { passive: false });

                // Canvas Touch Events
                this.canvas.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.sound.init();
                    if (e.touches.length === 2) {
                        this.pointer.mode = 'pinch';
                        this.pointer.pinchDist = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        return;
                    }
                    const t = e.touches[0];
                    this.pointer.down = true;
                    this.pointer.startX = this.pointer.curX = t.clientX;
                    this.pointer.startY = this.pointer.curY = t.clientY;
                    this.pointer.mode = this.touchMode;
                    this.buildPreviewPos = this.screenToWorld(t.clientX, t.clientY);
                }, { passive: false });

                this.canvas.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    if (e.touches.length === 2 && this.pointer.mode === 'pinch') {
                        const d = Math.hypot(
                            e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY
                        );
                        if (this.pointer.pinchDist > 10) {
                            this.camera.zoom = Math.max(0.45, Math.min(1.75, this.camera.zoom * (d / this.pointer.pinchDist)));
                        }
                        this.pointer.pinchDist = d;
                        return;
                    }
                    if (!this.pointer.down || !e.touches.length) return;
                    const t = e.touches[0];
                    const dx = t.clientX - this.pointer.curX;
                    const dy = t.clientY - this.pointer.curY;
                    this.pointer.curX = t.clientX;
                    this.pointer.curY = t.clientY;
                    this.buildPreviewPos = this.screenToWorld(t.clientX, t.clientY);

                    const totalDist = Math.hypot(this.pointer.curX - this.pointer.startX, this.pointer.curY - this.pointer.startY);
                    if (this.pointer.mode === 'cam' || (this.pointer.mode === 'cmd' && totalDist > 18)) {
                        this.camera.x = Math.max(-2400, Math.min(2400, this.camera.x - dx / this.camera.zoom));
                        this.camera.y = Math.max(-200, Math.min(2600, this.camera.y - dy / this.camera.zoom));
                    } else if (this.pointer.mode === 'box' && totalDist > 14) {
                        this.isBoxSelecting = true;
                        this.boxSelectRect = {
                            x1: Math.min(this.pointer.startX, this.pointer.curX),
                            y1: Math.min(this.pointer.startY, this.pointer.curY),
                            x2: Math.max(this.pointer.startX, this.pointer.curX),
                            y2: Math.max(this.pointer.startY, this.pointer.curY)
                        };
                    }
                }, { passive: false });

                this.canvas.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (this.pointer.down) this.finishPointerInteraction();
                }, { passive: false });

                // Minimap Navigation (Isometric Diamond -> World Coordinates)
                const moveCamFromMinimap = (clientX, clientY) => {
                    const rect = this.miniCanvas.getBoundingClientRect();
                    const rx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                    const ry = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
                    // Unproject from isometric diamond on minimap
                    const nx = (rx - 0.5) * 2; // -1 .. 1
                    const ny = ry * 2;         // 0 .. 2
                    const wx = Math.max(0, Math.min(this.worldSize, ((nx + ny) * 0.5) * this.worldSize));
                    const wy = Math.max(0, Math.min(this.worldSize, ((ny - nx) * 0.5) * this.worldSize));
                    this.centerCameraOn(wx, wy);
                };
                this.miniCanvas.addEventListener('mousedown', (e) => moveCamFromMinimap(e.clientX, e.clientY));
                this.miniCanvas.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    moveCamFromMinimap(e.touches[0].clientX, e.touches[0].clientY);
                }, { passive: false });
                this.miniCanvas.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    moveCamFromMinimap(e.touches[0].clientX, e.touches[0].clientY);
                }, { passive: false });
            }

            finishPointerInteraction() {
                const dist = Math.hypot(this.pointer.curX - this.pointer.startX, this.pointer.curY - this.pointer.startY);
                if (this.isBoxSelecting && this.boxSelectRect) {
                    const r = this.boxSelectRect;
                    this.selectedIds.clear();
                    this.units.forEach(u => {
                        if (u.faction === 'player' && u.hp > 0) {
                            const sp = this.worldToScreen(u.x, u.y, 14);
                            if (sp.x >= r.x1 && sp.x <= r.x2 && sp.y >= r.y1 && sp.y <= r.y2) {
                                this.selectedIds.add(u.id);
                            }
                        }
                    });
                    if (this.selectedIds.size > 0) this.sound.play('click');
                    this.updateSelectionUI();
                } else if (dist <= 18 && this.pointer.mode !== 'pinch') {
                    const worldPos = this.screenToWorld(this.pointer.curX, this.pointer.curY);
                    this.handleWorldTap(worldPos.x, worldPos.y, this.pointer.curX, this.pointer.curY);
                }

                this.pointer.down = false;
                this.isBoxSelecting = false;
                this.boxSelectRect = null;
            }

            handleWorldTap(wx, wy, sx, sy) {
                if (this.buildModeType) {
                    this.tryPlaceBuilding(this.buildModeType, wx, wy);
                    return;
                }

                const clickedEntity = this.findEntityAt(wx, wy, sx, sy);
                const selectedPlayerUnits = this.getSelectedUnits();

                if (clickedEntity && clickedEntity.faction === 'player') {
                    // If villagers are selected and player taps an unfinished building or farm, send ALL selected villagers to work on it
                    if (
                        selectedPlayerUnits.some(u => u.type === 'villager') &&
                        clickedEntity.entityKind === 'building' &&
                        (!clickedEntity.completed || clickedEntity.isFarm)
                    ) {
                        this.issueSmartCommand(wx, wy, sx, sy);
                        return;
                    }

                    this.selectedIds.clear();
                    this.selectedIds.add(clickedEntity.id);
                    if (clickedEntity.type === 'towncenter') this.sound.play('bell');
                    else if (clickedEntity.type === 'knight') this.sound.play('horse');
                    else this.sound.play('click');
                    this.updateSelectionUI();
                    return;
                }

                if (selectedPlayerUnits.length > 0 || this.getSelectedBuilding()) {
                    this.issueSmartCommand(wx, wy, sx, sy);
                }
            }

            issueSmartCommand(wx, wy, sx, sy) {
                const selBld = this.getSelectedBuilding();
                if (selBld && selBld.faction === 'player') {
                    selBld.rallyX = Math.max(40, Math.min(this.worldSize - 40, wx));
                    selBld.rallyY = Math.max(40, Math.min(this.worldSize - 40, wy));
                    this.addCommandMarker(selBld.rallyX, selBld.rallyY, '#60a5fa');
                    this.sound.play('click');
                    return;
                }

                const selUnits = this.getSelectedUnits();
                if (selUnits.length === 0) return;

                const target = this.findEntityAt(wx, wy, sx, sy);

                if (target) {
                    // 1. Target is a Resource Node
                    if (target.entityKind === 'resource' && target.amount > 0 && selUnits.some(u => u.type === 'villager')) {
                        const villagers = selUnits.filter(u => u.type === 'villager');
                        const nearbyCluster = this.resources
                            .filter(r => r.amount > 0 && r.type === target.type && Math.hypot(r.x - target.x, r.y - target.y) <= 130)
                            .sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));

                        villagers.forEach((v, idx) => {
                            const assignedNode = nearbyCluster.length > 0
                                ? nearbyCluster[Math.floor(idx / 2) % nearbyCluster.length]
                                : target;
                            v.state = 'gather';
                            v.targetEntityId = assignedNode.id;
                            v.path = this.navGrid.findPath(v.x, v.y, assignedNode.x, assignedNode.y);
                        });
                        this.addCommandMarker(target.x, target.y, '#fbbf24');
                        this.sound.play('order');
                        if (target.type === 'wood') this.sound.speak('Holzfäller!');
                        else if (target.type === 'food') this.sound.speak('Sammler!');
                        else this.sound.speak('Bergmann!');
                        if (villagers.length > 1) {
                            this.showToast(`⛏️ ${villagers.length} Dorfbewohner sammeln nun gemeinsam!`);
                        }
                        return;
                    }

                    // 2. Target is a Player Building (Construct, Farm, or Garrison)
                    if (target.entityKind === 'building' && target.faction === 'player') {
                        if (!target.completed && selUnits.some(u => u.type === 'villager')) {
                            selUnits.filter(u => u.type === 'villager').forEach(v => {
                                v.state = 'build';
                                v.targetEntityId = target.id;
                                v.path = this.navGrid.findPath(v.x, v.y, target.x, target.y);
                            });
                            this.addCommandMarker(target.x, target.y, '#38bdf8');
                            this.sound.play('order');
                            this.sound.speak('Baumeister!');
                            return;
                        }
                        if (target.isFarm && selUnits.some(u => u.type === 'villager')) {
                            selUnits.filter(u => u.type === 'villager').forEach(v => {
                                v.state = 'gather_farm';
                                v.targetEntityId = target.id;
                                v.path = this.navGrid.findPath(v.x, v.y, target.x, target.y);
                            });
                            this.addCommandMarker(target.x, target.y, '#facc15');
                            this.sound.play('order');
                            this.sound.speak('Bauer!');
                            return;
                        }
                        if (target.completed && (target.type === 'towncenter' || target.type === 'tower' || target.type === 'castle')) {
                            this.garrisonUnitsInBuilding(selUnits, target);
                            this.addCommandMarker(target.x, target.y, '#3b82f6');
                            this.sound.play('bell');
                            this.sound.speak('Schutz suchen!');
                            return;
                        }
                    }

                    // 3. Target is Friendly Wounded Unit (Monk Heal)
                    if (target.entityKind === 'unit' && target.faction === 'player' && target.hp < target.maxHp) {
                        const monks = selUnits.filter(u => u.type === 'monk');
                        if (monks.length > 0) {
                            monks.forEach(m => {
                                m.state = 'heal';
                                m.targetEntityId = target.id;
                                m.path = this.navGrid.findPath(m.x, m.y, target.x, target.y);
                            });
                            this.addCommandMarker(target.x, target.y, '#34d399');
                            this.sound.play('heal');
                            this.sound.speak('Segnung!');
                            return;
                        }
                    }

                    // 4. Target is an Enemy (Attack or Monk Conversion)
                    if (target.faction === 'enemy') {
                        selUnits.forEach(u => {
                            if (u.type === 'monk') {
                                u.state = 'convert';
                                u.targetEntityId = target.id;
                                u.chantTimer = 0;
                                u.path = this.navGrid.findPath(u.x, u.y, target.x, target.y);
                            } else {
                                u.state = 'attack';
                                u.targetEntityId = target.id;
                                u.path = this.navGrid.findPath(u.x, u.y, target.x, target.y);
                            }
                        });
                        this.addCommandMarker(target.x, target.y, '#ef4444');
                        this.sound.play('attack_order');
                        if (selUnits.some(u => u.type === 'monk')) {
                            this.sound.play('wololo');
                            this.sound.speak('Wololo!');
                        } else {
                            this.sound.speak(Math.random() < 0.5 ? 'Angriff!' : 'Zu den Waffen!');
                        }
                        return;
                    }
                }

                // 5. Tactical Formation Ground Move with A* Pathfinding
                const count = selUnits.length;
                const form = this.activeFormation || 'box';

                if (form === 'line') {
                    const avgX = selUnits.reduce((acc, u) => acc + u.x, 0) / count;
                    const avgY = selUnits.reduce((acc, u) => acc + u.y, 0) / count;
                    const dirX = wx - avgX, dirY = wy - avgY;
                    const dLen = Math.hypot(dirX, dirY) || 1;
                    const perpX = -dirY / dLen, perpY = dirX / dLen;
                    const spacing = 32;

                    selUnits.forEach((u, idx) => {
                        const offset = (idx - (count - 1) / 2) * spacing;
                        const destX = Math.max(40, Math.min(this.worldSize - 40, wx + perpX * offset));
                        const destY = Math.max(40, Math.min(this.worldSize - 40, wy + perpY * offset));
                        u.state = 'move';
                        u.targetEntityId = null;
                        u.targetX = destX;
                        u.targetY = destY;
                        u.path = this.navGrid.findPath(u.x, u.y, destX, destY);
                    });
                } else if (form === 'staggered') {
                    const cols = Math.ceil(Math.sqrt(count * 1.4));
                    selUnits.forEach((u, idx) => {
                        const col = idx % cols;
                        const row = Math.floor(idx / cols);
                        const staggerX = (row % 2 === 1) ? 26 : 0;
                        const ox = ((col - (cols - 1) / 2) * 54) + staggerX;
                        const oy = (row - (Math.ceil(count / cols) - 1) / 2) * 54;
                        const destX = Math.max(40, Math.min(this.worldSize - 40, wx + ox));
                        const destY = Math.max(40, Math.min(this.worldSize - 40, wy + oy));
                        u.state = 'move';
                        u.targetEntityId = null;
                        u.targetX = destX;
                        u.targetY = destY;
                        u.path = this.navGrid.findPath(u.x, u.y, destX, destY);
                    });
                } else {
                    const melees = selUnits.filter(u => ['knight', 'militia', 'spearman'].includes(u.type));
                    const vulnerable = selUnits.filter(u => !['knight', 'militia', 'spearman'].includes(u.type));
                    const orderedUnits = [...melees, ...vulnerable];
                    const cols = Math.ceil(Math.sqrt(count));
                    orderedUnits.forEach((u, idx) => {
                        const ox = ((idx % cols) - (cols - 1) / 2) * 36;
                        const oy = (Math.floor(idx / cols) - (cols - 1) / 2) * 36;
                        const destX = Math.max(40, Math.min(this.worldSize - 40, wx + ox));
                        const destY = Math.max(40, Math.min(this.worldSize - 40, wy + oy));
                        u.state = 'move';
                        u.targetEntityId = null;
                        u.targetX = destX;
                        u.targetY = destY;
                        u.path = this.navGrid.findPath(u.x, u.y, destX, destY);
                    });
                }

                this.addCommandMarker(wx, wy, '#4ade80');
                if (selUnits.some(u => u.type === 'knight')) this.sound.play('horse');
                else this.sound.play('order');

                const voicePhrases = ['Jawohl!', 'Zu Befehl!', 'Verstanden!', 'Sofort!'];
                this.sound.speak(voicePhrases[Math.floor(Math.random() * voicePhrases.length)]);
            }

            tryPlaceBuilding(type, wx, wy) {
                const def = BUILDINGS_DEF[type];
                const p = this.factions.player;
                if (p.age < def.minAge) {
                    this.showToast(`Benötigt ${AGES_DEF[def.minAge].name}!`);
                    return;
                }
                let cost = { ...def.cost };
                if (this.playerCiv === 'franks' && type === 'castle' && cost.stone) {
                    cost.stone = Math.max(100, cost.stone - 100);
                }
                if (!this.canAfford('player', cost)) {
                    this.showToast('Nicht genügend Rohstoffe für dieses Bauwerk!');
                    return;
                }
                if (this.navGrid && this.navGrid.isWorldBlocked(wx, wy)) {
                    this.showToast('Nicht auf Wasser oder unwegsamem Gelände baubar!');
                    return;
                }
                const blocked = this.buildings.some(b => b.hp > 0 && Math.hypot(b.x - wx, b.y - wy) < (b.radius + def.radius + 10));
                if (blocked) {
                    this.showToast('Bauplatz ist blockiert!');
                    return;
                }

                this.payCost('player', cost);
                const b = this.spawnBuilding(type, wx, wy, 'player', false);
                if (this.playerCiv === 'teutons' && type === 'tower') {
                    b.maxGarrison = 10;
                }
                if (this.navGrid) this.navGrid.rebuildFromBuildings(this.buildings);

                const villagers = this.getSelectedUnits().filter(u => u.type === 'villager');
                villagers.forEach(v => {
                    v.state = 'build';
                    v.targetEntityId = b.id;
                    v.path = this.navGrid.findPath(v.x, v.y, b.x, b.y);
                });
                this.buildModeType = null;
                this.sound.play('build');
                this.sound.speak('Baumeister!');
                this.updateTopUI();
                this.updateSelectionUI();
            }

            findClosestDropOff(u, resType) {
                let preferredTypes = ['towncenter'];
                if (resType === 'wood') preferredTypes = ['lumbercamp', 'towncenter'];
                else if (resType === 'gold' || resType === 'stone') preferredTypes = ['miningcamp', 'towncenter'];
                else if (resType === 'food') preferredTypes = ['mill', 'towncenter'];

                const candidates = this.buildings.filter(b =>
                    b.faction === u.faction &&
                    b.completed &&
                    b.hp > 0 &&
                    preferredTypes.includes(b.type)
                );

                if (candidates.length === 0) {
                    return this.buildings.find(b => b.faction === u.faction && b.completed && b.hp > 0 && b.type === 'towncenter') || null;
                }

                let best = candidates[0];
                let bestDist = Math.hypot(best.x - u.x, best.y - u.y);
                for (let i = 1; i < candidates.length; i++) {
                    const c = candidates[i];
                    const d = Math.hypot(c.x - u.x, c.y - u.y);
                    if (d < bestDist) {
                        bestDist = d;
                        best = c;
                    }
                }
                return best;
            }

            garrisonUnitsInBuilding(units, b) {
                if (!b || b.hp <= 0 || !b.completed) return;
                const def = BUILDINGS_DEF[b.type];
                const maxCap = def.maxGarrison || (b.type === 'castle' ? 20 : b.type === 'towncenter' ? 15 : 5);
                if (!b.garrison) b.garrison = [];

                units.forEach(u => {
                    if (u.faction === b.faction && !u.garrisoned && b.garrison.length < maxCap) {
                        b.garrison.push(u.id);
                        u.garrisoned = true;
                        u.state = 'garrisoned';
                        u.path = [];
                        this.selectedIds.delete(u.id);
                    }
                });

                this.sound.play('order');
                this.updateTopUI();
                this.updateSelectionUI();
            }

            ungarrisonBuilding(b) {
                if (!b || !b.garrison || b.garrison.length === 0) return;
                const evacuated = [...b.garrison];
                b.garrison = [];

                evacuated.forEach((id, idx) => {
                    const u = this.units.find(x => x.id === id);
                    if (u) {
                        u.garrisoned = false;
                        const ang = (idx / evacuated.length) * Math.PI * 2;
                        const dist = b.radius + 18 + Math.random() * 12;
                        u.x = Math.max(30, Math.min(this.worldSize - 30, b.x + Math.cos(ang) * dist));
                        u.y = Math.max(30, Math.min(this.worldSize - 30, b.y + Math.sin(ang) * dist));

                        if (u.previousState) {
                            u.state = u.previousState;
                            u.targetEntityId = u.previousTargetEntityId;
                            u.previousState = null;
                            u.previousTargetEntityId = null;
                            const prevTarget = this.findEntityById(u.targetEntityId);
                            if (prevTarget) {
                                u.path = this.navGrid.findPath(u.x, u.y, prevTarget.x, prevTarget.y);
                            }
                        } else {
                            u.state = 'idle';
                            u.path = [];
                        }
                    }
                });

                this.sound.play('order');
                this.sound.speak('Ausgeschwärmt!');
                this.updateTopUI();
                this.updateSelectionUI();
            }

            toggleTownBell() {
                this.townBellActive = !this.townBellActive;
                const btn = document.getElementById('btnTownBell');
                if (btn) btn.classList.toggle('active', this.townBellActive);

                if (this.townBellActive) {
                    this.sound.play('cathedral_bell');
                    this.sound.speak('Alle Bürger in Sicherheit!');
                    this.showToast('🔔 Die Alarmglocke läutet! Alle Dorfbewohner fliehen in Schutzräume!');

                    const shelters = this.buildings.filter(b =>
                        b.faction === 'player' &&
                        b.completed &&
                        b.hp > 0 &&
                        (b.type === 'towncenter' || b.type === 'tower' || b.type === 'castle')
                    );

                    if (shelters.length === 0) {
                        this.showToast('⚠️ Keine Schutzräume vorhanden!');
                        return;
                    }

                    const villagers = this.units.filter(u => u.faction === 'player' && u.type === 'villager' && u.hp > 0 && !u.garrisoned);
                    villagers.forEach(v => {
                        v.previousState = v.state;
                        v.previousTargetEntityId = v.targetEntityId;

                        let bestShelter = shelters[0];
                        let bestDist = Math.hypot(bestShelter.x - v.x, bestShelter.y - v.y);
                        shelters.forEach(s => {
                            const d = Math.hypot(s.x - v.x, s.y - v.y);
                            if (d < bestDist) {
                                bestDist = d;
                                bestShelter = s;
                            }
                        });

                        v.state = 'garrison_move';
                        v.targetEntityId = bestShelter.id;
                        v.path = this.navGrid.findPath(v.x, v.y, bestShelter.x, bestShelter.y);
                    });
                } else {
                    this.sound.play('bell');
                    this.sound.speak('Gefahr vorüber! Zurück an die Arbeit!');
                    this.showToast('🔕 Entwarnung! Bürger verlassen die Schutzräume und nehmen ihre Arbeit wieder auf.');

                    this.buildings.forEach(b => {
                        if (b.faction === 'player' && b.garrison && b.garrison.length > 0) {
                            this.ungarrisonBuilding(b);
                        }
                    });
                }
            }

            researchTech(techKey) {
                const def = TECHS_DEF[techKey];
                if (!def) return;
                const p = this.factions.player;
                if (p.age < def.minAge) {
                    this.showToast(`Benötigt ${AGES_DEF[def.minAge].name}!`);
                    return;
                }
                if (!p.techs) p.techs = new Set();
                if (p.techs.has(techKey)) {
                    this.showToast('Bereits erforscht!');
                    return;
                }
                if (!this.canAfford('player', def.cost)) {
                    this.showToast('Nicht genügend Rohstoffe!');
                    return;
                }
                this.payCost('player', def.cost);
                p.techs.add(techKey);
                p.blacksmithLevel = (p.blacksmithLevel || 0) + 1;

                if (techKey === 'forging') {
                    this.units.filter(u => u.faction === 'player' && ['militia', 'knight', 'spearman'].includes(u.type)).forEach(u => {
                        u.attack += 2;
                    });
                } else if (techKey === 'iron_armor') {
                    this.units.filter(u => u.faction === 'player').forEach(u => {
                        u.meleeArmor = (u.meleeArmor || 0) + 2;
                        u.pierceArmor = (u.pierceArmor || 0) + 2;
                    });
                } else if (techKey === 'fletching') {
                    this.units.filter(u => u.faction === 'player' && ['archer', 'skirmisher'].includes(u.type)).forEach(u => {
                        u.attack += 2;
                        u.range += 25;
                    });
                } else if (techKey === 'wheelbarrow') {
                    p.wheelbarrowResearched = true;
                    this.units.filter(u => u.faction === 'player' && u.type === 'villager').forEach(u => {
                        u.speed = Math.round(u.speed * 1.25);
                        u.maxCarry = 20;
                    });
                } else if (techKey === 'double_axe') {
                    p.woodHarvestBonus = 1.25;
                }

                this.sound.play('fanfare');
                this.sound.speak(`${def.name} erforscht!`);
                this.showToast(`✨ ${def.name} erforscht! ${def.desc}`);
                this.updateTopUI();
                this.updateSelectionUI();
            }

            loop(ts) {
                const rawDt = (ts - this.lastTimestamp) / 1000;
                const dt = Math.max(0, Math.min(0.08, isFinite(rawDt) ? rawDt : 0.016));
                this.lastTimestamp = ts;

                this.update(dt);
                this.render();

                requestAnimationFrame((nextTs) => this.loop(nextTs));
            }

            update(dt) {
                if (this.gameOver) return;
                this.gameTime += dt;

                // Smooth Inertial Keyboard Camera Panning (WASD & Arrow Keys in Screen Space)
                const moveUp = this.keys['w'] || this.keys['arrowup'] || this.keys['KeyW'] || this.keys['ArrowUp'];
                const moveDown = this.keys['s'] || this.keys['arrowdown'] || this.keys['KeyS'] || this.keys['ArrowDown'];
                const moveLeft = this.keys['a'] || this.keys['arrowleft'] || this.keys['KeyA'] || this.keys['ArrowLeft'];
                const moveRight = this.keys['d'] || this.keys['arrowright'] || this.keys['KeyD'] || this.keys['ArrowRight'];

                const targetSpeed = 680 / this.camera.zoom;
                let dirX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
                let dirY = (moveDown ? 1 : 0) - (moveUp ? 1 : 0);
                if (dirX !== 0 && dirY !== 0) {
                    dirX *= 0.7071;
                    dirY *= 0.7071;
                }

                const accel = 14 * dt;
                this.camera.vx += (dirX * targetSpeed - this.camera.vx) * Math.min(1, accel);
                this.camera.vy += (dirY * targetSpeed - this.camera.vy) * Math.min(1, accel);

                if (Math.abs(this.camera.vx) > 0.5 || Math.abs(this.camera.vy) > 0.5) {
                    this.camera.x = Math.max(-2400, Math.min(2400, this.camera.x + this.camera.vx * dt));
                    this.camera.y = Math.max(-200, Math.min(2600, this.camera.y + this.camera.vy * dt));
                }

                // Age Advancement Research
                const p = this.factions.player;
                if (p.researchingAge) {
                    p.ageProgress += dt;
                    if (p.ageProgress >= p.ageDuration) {
                        p.researchingAge = false;
                        p.ageProgress = 0;
                        p.age = Math.min(4, p.age + 1);
                        this.sound.play('fanfare');
                        this.sound.speak(`Willkommen im ${AGES_DEF[p.age].name}!`);
                        this.showToast(`🎉 Aufgestiegen in: ${AGES_DEF[p.age].name}!`);
                        this.updateSelectionUI();
                    }
                }

                // Decay resource hit shake & screen shake
                this.resources.forEach(r => { if (r.hitShake > 0) r.hitShake = Math.max(0, r.hitShake - dt * 6); });
                if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 28);

                // Update ambient birds & clouds
                this.birds.forEach(b => {
                    b.x = (b.x + b.vx * dt + this.worldSize) % this.worldSize;
                    b.y = (b.y + b.vy * dt + this.worldSize) % this.worldSize;
                    b.wingPhase += dt * 9;
                });
                this.clouds.forEach(c => {
                    c.x = (c.x + c.speed * dt) % (this.worldSize + 300);
                });
                for (let i = this.corpses.length - 1; i >= 0; i--) {
                    this.corpses[i].life -= dt;
                    if (this.corpses[i].life <= 0) this.corpses.splice(i, 1);
                }

                this.updateBuildings(dt);
                this.updateUnits(dt);
                this.updateProjectiles(dt);
                this.updateEffects(dt);
                this.updateEnemyAI(dt);
                this.updateFogOfWar();
                this.checkVictoryConditions();
                this.updateTopUI();
            }

            updateBuildings(dt) {
                let navNeedsRebuild = false;
                for (let i = this.buildings.length - 1; i >= 0; i--) {
                    const b = this.buildings[i];
                    if (b.hp <= 0) {
                        if (b.garrison && b.garrison.length > 0) {
                            this.ungarrisonBuilding(b);
                        }
                        this.spawnExplosionParticles(b.x, b.y, '#d97706', 34);
                        this.spawnExplosionParticles(b.x, b.y, '#78716c', 20);
                        this.craters.push({ x: b.x, y: b.y, r: b.radius * 0.85 });
                        this.screenShake = 14;
                        this.sound.play('siege');
                        this.selectedIds.delete(b.id);
                        this.buildings.splice(i, 1);
                        this.recalculatePop();
                        navNeedsRebuild = true;
                        if (this.selectedIds.size === 0) this.updateSelectionUI();
                        continue;
                    }

                    if (b.hurtFlash > 0) b.hurtFlash = Math.max(0, b.hurtFlash - dt * 4);
                    if (!b.completed) continue;

                    // Smoke from chimneys or burning damage
                    if (Math.random() < (b.hp < b.maxHp * 0.5 ? 0.35 : 0.08) && !b.isFarm) {
                        this.smokeParticles.push({
                            x: b.x + (Math.random() - 0.5) * b.radius * 0.6,
                            y: b.y - b.radius * 0.65,
                            vx: 6 + Math.random() * 8,
                            vy: -18 - Math.random() * 12,
                            r: 3 + Math.random() * 4,
                            alpha: 0.45,
                            color: b.hp < b.maxHp * 0.5 ? '#292524' : '#d6d3d1'
                        });
                    }

                    // Unit Training Queue
                    if (b.queue.length > 0) {
                        const item = b.queue[0];
                        item.remainingTime -= dt;
                        if (item.remainingTime <= 0) {
                            const f = this.factions[b.faction];
                            if (b.faction !== 'player' || f.pop < f.maxPop) {
                                b.queue.shift();
                                const nu = this.spawnUnit(item.unitType, b.x, b.y + b.radius + 18, b.faction);
                                nu.state = 'move';
                                nu.targetX = b.rallyX + (Math.random() - 0.5) * 28;
                                nu.targetY = b.rallyY + (Math.random() - 0.5) * 28;
                                nu.path = this.navGrid.findPath(nu.x, nu.y, nu.targetX, nu.targetY);
                                if (b.faction === 'player') {
                                    this.sound.play(item.unitType === 'knight' ? 'horse' : 'order');
                                }
                            }
                        }
                    }

                    // Defensive Towers, Castles & Town Centers Fire Arrows
                    const def = BUILDINGS_DEF[b.type];
                    const gCount = b.garrison ? b.garrison.length : 0;
                    const canAttack = def.attack || (b.type === 'towncenter' && gCount > 0);

                    if (canAttack) {
                        b.attackTimer = Math.max(0, (b.attackTimer || 0) - dt);
                        if (b.attackTimer <= 0) {
                            const range = def.range || 210;
                            const target = this.findNearestEnemy(b.x, b.y, b.faction, range);
                            if (target) {
                                b.attackTimer = def.attackCooldown || 1.35;
                                const baseArrowCount = b.type === 'towncenter' ? Math.min(5, Math.floor(gCount / 2) + 1) : 1 + Math.min(4, Math.floor(gCount / 2));
                                for (let a = 0; a < baseArrowCount; a++) {
                                    setTimeout(() => {
                                        if (target && target.hp > 0) {
                                            this.spawnProjectile('arrow', b.x + (Math.random() - 0.5) * 10, b.y - 24, target, def.attack || 6, b.faction, 0, 1.0);
                                            if (this.isWorldPosOnScreen(b.x, b.y) && a === 0) this.sound.play('bow');
                                        }
                                    }, a * 110);
                                }
                            }
                        }
                    }
                }
                if (navNeedsRebuild && this.navGrid) {
                    this.navGrid.rebuildFromBuildings(this.buildings);
                }
            }

            updateUnits(dt) {
                for (let i = this.units.length - 1; i >= 0; i--) {
                    const u = this.units[i];
                    if (u.hp <= 0) {
                        this.spawnExplosionParticles(u.x, u.y, u.faction === 'player' ? '#60a5fa' : '#f87171', 14);
                        this.corpses.push({
                            x: u.x, y: u.y,
                            type: u.type,
                            faction: u.faction,
                            facing: u.facing,
                            life: 8.0,
                            maxLife: 8.0
                        });
                        this.selectedIds.delete(u.id);
                        this.units.splice(i, 1);
                        this.recalculatePop();
                        continue;
                    }

                    if (u.garrisoned) continue; // Safe inside shelter

                    if (u.hurtFlash > 0) u.hurtFlash = Math.max(0, u.hurtFlash - dt * 5);
                    if (u.swingAnim > 0) u.swingAnim = Math.max(0, u.swingAnim - dt * 3.2);
                    u.attackTimer = Math.max(0, u.attackTimer - dt);

                    // Auto-aggro nearby enemies when idle (excluding villagers and monks)
                    if (u.state === 'idle' && u.type !== 'villager' && u.type !== 'monk') {
                        const enemy = this.findNearestEnemy(u.x, u.y, u.faction, 185);
                        if (enemy) {
                            u.state = 'attack';
                            u.targetEntityId = enemy.id;
                            u.path = this.navGrid.findPath(u.x, u.y, enemy.x, enemy.y);
                        }
                    }

                    if (u.state === 'move' || u.state === 'retreat') {
                        const d = Math.hypot(u.targetX - u.x, u.targetY - u.y);
                        if (d <= 8 && (!u.path || u.path.length === 0)) {
                            u.state = 'idle';
                        } else {
                            this.moveUnitTowards(u, u.targetX, u.targetY, dt);
                        }
                    } else if (u.state === 'garrison_move') {
                        const b = this.buildings.find(x => x.id === u.targetEntityId && x.hp > 0);
                        if (!b) {
                            u.state = 'idle';
                            continue;
                        }
                        const d = Math.hypot(b.x - u.x, b.y - u.y) - b.radius - u.radius;
                        if (d > 14) {
                            this.moveUnitTowards(u, b.x, b.y, dt);
                        } else {
                            b.garrison = b.garrison || [];
                            b.garrison.push(u.id);
                            u.garrisoned = true;
                            u.state = 'garrisoned';
                            u.path = [];
                            this.selectedIds.delete(u.id);
                            this.updateTopUI();
                            this.updateSelectionUI();
                        }
                    } else if (u.state === 'build') {
                        const b = this.buildings.find(x => x.id === u.targetEntityId && x.hp > 0);
                        if (!b || b.completed) {
                            if (b && b.completed && b.isFarm) {
                                u.state = 'gather_farm';
                            } else {
                                u.state = 'idle';
                            }
                            continue;
                        }
                        const d = Math.hypot(b.x - u.x, b.y - u.y) - b.radius - u.radius;
                        if (d > 10) {
                            this.moveUnitTowards(u, b.x, b.y, dt);
                        } else {
                            u.facing = b.x >= u.x ? 1 : -1;
                            if (u.attackTimer <= 0) {
                                u.attackTimer = 0.9;
                                u.swingAnim = 1.0;
                                b.progress = Math.min(100, b.progress + 12);
                                b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * 0.12));
                                this.spawnExplosionParticles(b.x + (Math.random() - 0.5) * 20, b.y, '#fbbf24', 4);
                                if (this.isWorldPosOnScreen(u.x, u.y)) this.sound.play('build');
                                if (b.progress >= 100) {
                                    b.completed = true;
                                    b.hp = b.maxHp;
                                    this.recalculatePop();
                                    if (this.navGrid) this.navGrid.rebuildFromBuildings(this.buildings);
                                    this.showToast(`${BUILDINGS_DEF[b.type].name} fertiggestellt!`);
                                    this.updateSelectionUI();
                                }
                            }
                        }
                    } else if (u.state === 'gather') {
                        const r = this.resources.find(x => x.id === u.targetEntityId && x.amount > 0);
                        if (!r) {
                            const nextRes = this.findNearestResource(u.x, u.y, u.carryType, 220);
                            if (nextRes && u.carryAmount < u.maxCarry) {
                                u.targetEntityId = nextRes.id;
                                u.path = this.navGrid.findPath(u.x, u.y, nextRes.x, nextRes.y);
                            } else if (u.carryAmount > 0) {
                                u.state = 'return_res';
                                u.path = [];
                            } else {
                                u.state = 'idle';
                            }
                            continue;
                        }
                        const d = Math.hypot(r.x - u.x, r.y - u.y) - r.radius - u.radius;
                        if (d > 8) {
                            this.moveUnitTowards(u, r.x, r.y, dt);
                        } else {
                            u.facing = r.x >= u.x ? 1 : -1;
                            if (u.attackTimer <= 0) {
                                u.attackTimer = 0.95;
                                u.swingAnim = 1.0;
                                r.hitShake = 1.0;
                                if (u.carryType !== r.type) {
                                    u.carryType = r.type;
                                    u.carryAmount = 0;
                                }
                                let harvestBase = 3;
                                if (r.type === 'wood' && this.factions[u.faction]?.woodHarvestBonus) {
                                    harvestBase = Math.round(harvestBase * this.factions[u.faction].woodHarvestBonus);
                                }
                                if (u.faction === 'player' && this.playerCiv === 'mongols') {
                                    harvestBase = Math.round(harvestBase * 1.4);
                                }
                                const harvested = Math.min(harvestBase, r.amount, u.maxCarry - u.carryAmount);
                                u.carryAmount += harvested;
                                r.amount -= harvested;

                                if (this.isWorldPosOnScreen(u.x, u.y)) {
                                    this.sound.play(r.type === 'wood' ? 'woodchop' : 'pickaxe');
                                }
                                this.spawnExplosionParticles(r.x, r.y, r.type === 'wood' ? '#a16207' : '#fde047', 4);

                                if (r.amount <= 0 && r.type === 'wood') {
                                    this.stumps.push({ x: r.x, y: r.y });
                                }
                                if (u.carryAmount >= u.maxCarry || r.amount <= 0) {
                                    u.state = 'return_res';
                                    u.path = [];
                                }
                            }
                        }
                    } else if (u.state === 'gather_farm') {
                        const f = this.buildings.find(x => x.id === u.targetEntityId && x.hp > 0 && x.isFarm);
                        if (!f || f.farmFood <= 0) {
                            u.state = 'idle';
                            continue;
                        }
                        const d = Math.hypot(f.x - u.x, f.y - u.y);
                        if (d > 24) {
                            this.moveUnitTowards(u, f.x, f.y, dt);
                        } else {
                            if (u.attackTimer <= 0) {
                                u.attackTimer = 0.9;
                                u.swingAnim = 1.0;
                                if (u.carryType !== 'food') {
                                    u.carryType = 'food';
                                    u.carryAmount = 0;
                                }
                                let farmGather = 3;
                                if (u.faction === 'player' && this.playerCiv === 'mongols') {
                                    farmGather = Math.round(farmGather * 1.4);
                                }
                                const gatheredFood = Math.min(farmGather, f.farmFood, u.maxCarry - u.carryAmount);
                                u.carryAmount += gatheredFood;
                                f.farmFood -= gatheredFood;
                                if (u.carryAmount >= u.maxCarry) {
                                    u.state = 'return_res';
                                    u.path = [];
                                }
                            }
                        }
                    } else if (u.state === 'return_res') {
                        const dropOff = this.findClosestDropOff(u, u.carryType);
                        if (!dropOff) {
                            u.state = 'idle';
                            continue;
                        }
                        const d = Math.hypot(dropOff.x - u.x, dropOff.y - u.y) - dropOff.radius - u.radius;
                        if (d > 12) {
                            this.moveUnitTowards(u, dropOff.x, dropOff.y, dt);
                        } else {
                            if (u.carryType && u.carryAmount > 0) {
                                this.factions[u.faction][u.carryType] += u.carryAmount;
                                if (u.faction === 'player') {
                                    const icons = { wood: '🪵', food: '🥩', gold: '🪙', stone: '🪨' };
                                    this.addFloatingText(dropOff.x, dropOff.y - 24, `+${u.carryAmount} ${icons[u.carryType] || ''}`, '#fde047');
                                }
                            }
                            u.carryAmount = 0;
                            const prevTarget = this.findEntityById(u.targetEntityId);
                            if (prevTarget && prevTarget.entityKind === 'resource' && prevTarget.amount > 0) {
                                u.state = 'gather';
                                u.path = this.navGrid.findPath(u.x, u.y, prevTarget.x, prevTarget.y);
                            } else if (prevTarget && prevTarget.isFarm && prevTarget.farmFood > 0) {
                                u.state = 'gather_farm';
                                u.path = this.navGrid.findPath(u.x, u.y, prevTarget.x, prevTarget.y);
                            } else if (u.carryType) {
                                const nextNode = this.findNearestResource(u.x, u.y, u.carryType, 260);
                                if (nextNode) {
                                    u.targetEntityId = nextNode.id;
                                    u.state = 'gather';
                                    u.path = this.navGrid.findPath(u.x, u.y, nextNode.x, nextNode.y);
                                } else {
                                    u.state = 'idle';
                                }
                            } else {
                                u.state = 'idle';
                            }
                        }
                    } else if (u.state === 'heal') {
                        const target = this.findEntityById(u.targetEntityId);
                        if (!target || target.hp <= 0 || target.hp >= target.maxHp) {
                            u.state = 'idle';
                            u.targetEntityId = null;
                            continue;
                        }
                        const dist = Math.hypot(target.x - u.x, target.y - u.y) - target.radius - u.radius;
                        if (dist > 90) {
                            this.moveUnitTowards(u, target.x, target.y, dt);
                        } else {
                            u.facing = target.x >= u.x ? 1 : -1;
                            target.hp = Math.min(target.maxHp, target.hp + 20 * dt);
                            if (Math.random() < 0.28) {
                                this.particles.push({
                                    x: target.x + (Math.random() - 0.5) * 16,
                                    y: target.y + (Math.random() - 0.5) * 16,
                                    vx: 0,
                                    vy: -15 - Math.random() * 10,
                                    size: 2.5,
                                    color: '#34d399',
                                    life: 0.4
                                });
                            }
                            u.attackTimer = Math.max(0, u.attackTimer - dt);
                            if (u.attackTimer <= 0) {
                                u.attackTimer = 1.0;
                                if (this.isWorldPosOnScreen(u.x, u.y)) this.sound.play('heal');
                            }
                            if (target.hp >= target.maxHp) {
                                this.addFloatingText(target.x, target.y - 18, 'Geheilt! ✨', '#34d399');
                                u.state = 'idle';
                                u.targetEntityId = null;
                            }
                        }
                    } else if (u.state === 'convert') {
                        const target = this.findEntityById(u.targetEntityId);
                        if (!target || target.hp <= 0 || target.faction === u.faction) {
                            u.state = 'idle';
                            u.targetEntityId = null;
                            continue;
                        }
                        const dist = Math.hypot(target.x - u.x, target.y - u.y) - target.radius - u.radius;
                        if (dist > 105) {
                            this.moveUnitTowards(u, target.x, target.y, dt);
                        } else {
                            u.facing = target.x >= u.x ? 1 : -1;
                            u.chantTimer = (u.chantTimer || 0) + dt;
                            if (Math.floor(u.chantTimer / 1.1) !== Math.floor((u.chantTimer - dt) / 1.1)) {
                                if (this.isWorldPosOnScreen(u.x, u.y)) this.sound.play('wololo');
                                this.addFloatingText(u.x, u.y - 22, 'Wololo... ✝️', '#facc15');
                            }
                            if (u.chantTimer >= 4.2) {
                                target.faction = u.faction;
                                target.state = 'idle';
                                target.targetEntityId = null;
                                target.path = [];
                                this.sound.play('fanfare');
                                this.addFloatingText(target.x, target.y - 24, 'BEKEHRT! ✝️', '#fde047');
                                this.showToast('✝️ Ein feindlicher Krieger wurde bekehrt!');
                                this.recalculatePop();
                                u.chantTimer = 0;
                                u.state = 'idle';
                                u.targetEntityId = null;
                            }
                        }
                    } else if (u.state === 'attack') {
                        const target = this.findEntityById(u.targetEntityId);
                        if (!target || target.hp <= 0) {
                            u.state = 'idle';
                            u.targetEntityId = null;
                            continue;
                        }
                        const dist = Math.hypot(target.x - u.x, target.y - u.y) - target.radius - u.radius;
                        if (dist > u.range) {
                            this.moveUnitTowards(u, target.x, target.y, dt);
                        } else {
                            u.facing = target.x >= u.x ? 1 : -1;
                            if (u.attackTimer <= 0) {
                                u.attackTimer = u.cooldown;
                                u.swingAnim = 1.0;
                                const def = UNITS_DEF[u.type];

                                // Rock-Paper-Scissors Damage Bonuses
                                let damageMult = 1.0;
                                if (u.type === 'spearman' && target.type === 'knight') damageMult = 3.8;
                                else if (u.type === 'skirmisher' && target.type === 'archer') damageMult = 3.2;

                                const armor = def.projectile ? (target.pierceArmor || 0) : (target.meleeArmor || 0);
                                const rawDmg = Math.round(u.attack * damageMult);
                                const finalDamage = Math.max(1, rawDmg - armor);

                                if (def.projectile) {
                                    this.spawnProjectile(
                                        def.projectile,
                                        u.x, u.y - 10,
                                        target,
                                        finalDamage,
                                        u.faction,
                                        def.splash || 0,
                                        def.buildingBonus || 1.0
                                    );
                                    if (this.isWorldPosOnScreen(u.x, u.y)) {
                                        if (def.projectile === 'javelin') this.sound.play('javelin');
                                        else if (def.projectile === 'boulder') this.sound.play('siege');
                                        else this.sound.play('bow');
                                    }
                                } else {
                                    target.hp -= finalDamage;
                                    target.hurtFlash = 1.0;
                                    this.slashEffects.push({
                                        x: (u.x + target.x) / 2,
                                        y: (u.y + target.y) / 2,
                                        angle: Math.atan2(target.y - u.y, target.x - u.x),
                                        life: 0.22,
                                        maxLife: 0.22
                                    });
                                    if (this.isWorldPosOnScreen(u.x, u.y)) {
                                        this.sound.play(u.type === 'spearman' ? 'spear' : 'sword');
                                    }
                                }
                                this.sound.combatIntensity = Math.min(1.0, this.sound.combatIntensity + 0.12);
                            }
                        }
                    }
                }

                // Soft collision separation between units
                for (let i = 0; i < this.units.length; i++) {
                    const a = this.units[i];
                    if (a.garrisoned) continue;
                    for (let j = i + 1; j < this.units.length; j++) {
                        const b = this.units[j];
                        if (b.garrisoned) continue;
                        const dx = b.x - a.x, dy = b.y - a.y;
                        const d = Math.hypot(dx, dy);
                        const minD = a.radius + b.radius;
                        if (d > 0 && d < minD) {
                            const push = (minD - d) * 0.35;
                            a.x -= (dx / d) * push;
                            a.y -= (dy / d) * push;
                            b.x += (dx / d) * push;
                            b.y += (dy / d) * push;
                        }
                    }
                }
            }

            moveUnitTowards(u, tx, ty, dt) {
                let wpX = tx, wpY = ty;
                if (u.path && u.path.length > 0) {
                    const wp = u.path[0];
                    const distToWp = Math.hypot(wp.x - u.x, wp.y - u.y);
                    if (distToWp <= 10) {
                        u.path.shift();
                        if (u.path.length > 0) {
                            wpX = u.path[0].x;
                            wpY = u.path[0].y;
                        }
                    } else {
                        wpX = wp.x;
                        wpY = wp.y;
                    }
                }

                const dx = wpX - u.x;
                const dy = wpY - u.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) return;

                u.facing = dx >= 0 ? 1 : -1;
                const prevCycle = u.walkCycle;
                u.walkCycle += dt * (u.type === 'knight' ? 14 : 10);
                if (Math.floor(u.walkCycle / Math.PI) !== Math.floor(prevCycle / Math.PI) && Math.random() < 0.55) {
                    this.smokeParticles.push({
                        x: u.x - u.facing * 5,
                        y: u.y + u.radius * 0.6,
                        vx: (Math.random() - 0.5) * 8,
                        vy: -4 - Math.random() * 5,
                        r: u.type === 'knight' ? 4 : 2.5,
                        alpha: 0.28,
                        color: '#a89f91'
                    });
                }

                const step = Math.min(dist, u.speed * dt);
                const nx = u.x + (dx / dist) * step;
                const ny = u.y + (dy / dist) * step;

                // Collision Avoidance using NavGrid to prevent entering water lakes
                if (this.navGrid && this.navGrid.isWorldBlocked(nx, ny)) {
                    // Try sliding on X or Y
                    if (!this.navGrid.isWorldBlocked(nx, u.y)) {
                        u.x = Math.max(20, Math.min(this.worldSize - 20, nx));
                    } else if (!this.navGrid.isWorldBlocked(u.x, ny)) {
                        u.y = Math.max(20, Math.min(this.worldSize - 20, ny));
                    } else {
                        // Recalculate A* path if stuck
                        if (!u._lastRepath || performance.now() - u._lastRepath > 750) {
                            u._lastRepath = performance.now();
                            u.path = this.navGrid.findPath(u.x, u.y, tx, ty);
                        }
                    }
                } else {
                    u.x = Math.max(20, Math.min(this.worldSize - 20, nx));
                    u.y = Math.max(20, Math.min(this.worldSize - 20, ny));
                }
            }

            spawnProjectile(type, startX, startY, target, damage, faction, splash = 0, buildingBonus = 1.0) {
                const totalDist = Math.max(10, Math.hypot(target.x - startX, target.y - startY));
                this.projectiles.push({
                    type,
                    x: startX,
                    y: startY,
                    z: 12,
                    startX,
                    startY,
                    targetId: target.id,
                    targetX: target.x,
                    targetY: target.y,
                    totalDist,
                    speed: type === 'boulder' ? 235 : 370,
                    damage,
                    faction,
                    splash,
                    buildingBonus
                });
            }

            updateProjectiles(dt) {
                for (let i = this.projectiles.length - 1; i >= 0; i--) {
                    const p = this.projectiles[i];
                    const target = this.findEntityById(p.targetId);
                    if (target && target.hp > 0) {
                        p.targetX = target.x;
                        p.targetY = target.y;
                    }
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const dist = Math.hypot(dx, dy);
                    const step = p.speed * dt;

                    const traveled = Math.hypot(p.x - p.startX, p.y - p.startY);
                    const progress = Math.min(1, traveled / p.totalDist);
                    const arcHeight = p.type === 'boulder' ? 85 : 38;
                    p.z = Math.sin(progress * Math.PI) * arcHeight;

                    if (p.type === 'boulder' && Math.random() < 0.75) {
                        this.smokeParticles.push({
                            x: p.x,
                            y: p.y - p.z,
                            vx: (Math.random() - 0.5) * 14,
                            vy: -12 - Math.random() * 10,
                            r: 4 + Math.random() * 3,
                            alpha: 0.55,
                            color: Math.random() < 0.5 ? '#fb923c' : '#57534e'
                        });
                    }

                    if (dist <= step + 8) {
                        if (p.splash > 0) {
                            this.spawnExplosionParticles(p.targetX, p.targetY, '#f97316', 28);
                            this.spawnExplosionParticles(p.targetX, p.targetY, '#fde047', 12);
                            this.craters.push({ x: p.targetX, y: p.targetY, r: 22 });
                            if (this.craters.length > 40) this.craters.shift();
                            this.addCommandMarker(p.targetX, p.targetY, '#f97316');
                            if (this.isWorldPosOnScreen(p.targetX, p.targetY)) {
                                this.sound.play('siege');
                                this.screenShake = 9;
                            }
                            [...this.units, ...this.buildings].forEach(ent => {
                                if (ent.faction !== p.faction && ent.hp > 0) {
                                    const d = Math.hypot(ent.x - p.targetX, ent.y - p.targetY) - ent.radius;
                                    if (d <= p.splash) {
                                        const mult = ent.entityKind === 'building' ? p.buildingBonus : 1.0;
                                        const finalDmg = Math.round(p.damage * mult);
                                        ent.hp -= finalDmg;
                                        ent.hurtFlash = 1.0;
                                        this.addFloatingText(ent.x, ent.y - 16, `-${finalDmg} 💥`, '#fb923c');
                                    }
                                }
                            });
                        } else if (target && target.hp > 0) {
                            const mult = target.entityKind === 'building' ? p.buildingBonus : 1.0;
                            const finalDmg = Math.round(p.damage * mult);
                            target.hp -= finalDmg;
                            target.hurtFlash = 1.0;
                            this.spawnExplosionParticles(p.targetX, p.targetY, '#fca5a5', 5);
                        }
                        this.projectiles.splice(i, 1);
                    } else {
                        p.x += (dx / dist) * step;
                        p.y += (dy / dist) * step;
                    }
                }
            }

            updateEffects(dt) {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const pt = this.particles[i];
                    pt.x += pt.vx * dt;
                    pt.y += pt.vy * dt;
                    pt.life -= dt;
                    if (pt.life <= 0) this.particles.splice(i, 1);
                }
                for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
                    const sp = this.smokeParticles[i];
                    sp.x += sp.vx * dt;
                    sp.y += sp.vy * dt;
                    sp.r += dt * 4;
                    sp.alpha -= dt * 0.42;
                    if (sp.alpha <= 0) this.smokeParticles.splice(i, 1);
                }
                for (let i = this.slashEffects.length - 1; i >= 0; i--) {
                    this.slashEffects[i].life -= dt;
                    if (this.slashEffects[i].life <= 0) this.slashEffects.splice(i, 1);
                }
                for (let i = this.commandMarkers.length - 1; i >= 0; i--) {
                    const m = this.commandMarkers[i];
                    m.radius += dt * 42;
                    m.alpha -= dt * 1.9;
                    if (m.alpha <= 0) this.commandMarkers.splice(i, 1);
                }
                for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                    const ft = this.floatingTexts[i];
                    ft.y -= dt * 24;
                    ft.life -= dt;
                    if (ft.life <= 0) this.floatingTexts.splice(i, 1);
                }
            }

            updateEnemyAI(dt) {
                const enemy = this.factions.enemy;
                if (!enemy) return;

                // 1. Tactical AI Evaluation (Retreat, Reactive Defense, Idle Engagement, Support Monks)
                enemy._tacticalTimer = (enemy._tacticalTimer || 0) + dt;
                if (enemy._tacticalTimer >= 0.5) {
                    enemy._tacticalTimer = 0;

                    // A. Reactive Defense: Protect damaged enemy structures
                    const threatenedBld = this.buildings.find(b => b.faction === 'enemy' && b.hp > 0 && b.hurtFlash > 0.3);
                    if (threatenedBld) {
                        const attacker = this.units.find(pu => pu.faction === 'player' && pu.hp > 0 && Math.hypot(pu.x - threatenedBld.x, pu.y - threatenedBld.y) <= 500);
                        if (attacker) {
                            this.units.filter(eu => eu.faction === 'enemy' && eu.hp > 0 && eu.type !== 'villager' && Math.hypot(eu.x - threatenedBld.x, eu.y - threatenedBld.y) <= 650).forEach(guard => {
                                if (guard.state === 'idle' || guard.state === 'move') {
                                    guard.state = 'attack';
                                    guard.targetEntityId = attacker.id;
                                    guard.path = this.navGrid.findPath(guard.x, guard.y, attacker.x, attacker.y);
                                }
                            });
                        }
                    }

                    // B. Tactical Retreat: Low HP units (<28%) fall back towards fortified positions
                    const defenseBld = this.buildings.find(b => b.faction === 'enemy' && (b.type === 'tower' || b.type === 'castle' || b.type === 'towncenter') && b.hp > 0);
                    if (defenseBld) {
                        this.units.filter(eu => eu.faction === 'enemy' && eu.hp > 0 && eu.type !== 'villager' && (eu.hp / eu.maxHp) < 0.28).forEach(lowHpUnit => {
                            const distToDef = Math.hypot(defenseBld.x - lowHpUnit.x, defenseBld.y - lowHpUnit.y);
                            if (distToDef > 80 && lowHpUnit.state !== 'retreat') {
                                lowHpUnit.state = 'retreat';
                                lowHpUnit.targetEntityId = null;
                                lowHpUnit.targetX = defenseBld.x + (Math.random() - 0.5) * 60;
                                lowHpUnit.targetY = defenseBld.y + (Math.random() - 0.5) * 60;
                                lowHpUnit.path = this.navGrid.findPath(lowHpUnit.x, lowHpUnit.y, lowHpUnit.targetX, lowHpUnit.targetY);
                                this.addFloatingText(lowHpUnit.x, lowHpUnit.y - 18, 'Rückzug! 🏃', '#fbbf24');
                            }
                        });
                    }

                    // C. Idle & Support Units (Monks heal allies or convert enemies; idle military seeks targets)
                    const enemyUnits = this.units.filter(eu => eu.faction === 'enemy' && eu.hp > 0);
                    enemyUnits.forEach(eu => {
                        if (eu.state === 'retreat') {
                            if (defenseBld && Math.hypot(defenseBld.x - eu.x, defenseBld.y - eu.y) <= 90) {
                                eu.state = 'idle';
                            }
                        } else if (eu.state === 'idle') {
                            if (eu.type === 'monk') {
                                // Monk Support: prioritize healing wounded friendly warriors nearby
                                const woundedAlly = enemyUnits.find(ally => ally.id !== eu.id && ally.hp < ally.maxHp && Math.hypot(ally.x - eu.x, ally.y - eu.y) <= 350);
                                if (woundedAlly) {
                                    eu.state = 'heal';
                                    eu.targetEntityId = woundedAlly.id;
                                    eu.path = this.navGrid.findPath(eu.x, eu.y, woundedAlly.x, woundedAlly.y);
                                } else {
                                    // Otherwise seek a player unit to convert
                                    const convertTarget = this.units.find(pu => pu.faction === 'player' && pu.hp > 0 && ['knight', 'spearman', 'archer'].includes(pu.type) && Math.hypot(pu.x - eu.x, pu.y - eu.y) <= 280);
                                    if (convertTarget) {
                                        eu.state = 'convert';
                                        eu.targetEntityId = convertTarget.id;
                                        eu.chantTimer = 0;
                                        eu.path = this.navGrid.findPath(eu.x, eu.y, convertTarget.x, convertTarget.y);
                                    }
                                }
                            } else if (eu.type !== 'villager') {
                                const nearPlayer = this.findNearestEnemy(eu.x, eu.y, 'enemy', 480);
                                if (nearPlayer) {
                                    eu.state = 'attack';
                                    eu.targetEntityId = nearPlayer.id;
                                    eu.path = this.navGrid.findPath(eu.x, eu.y, nearPlayer.x, nearPlayer.y);
                                }
                            }
                        }
                    });
                }

                // 2. Wave Spawner & Adaptive Counter Force Composition
                enemy.nextWaveTimer -= dt;
                if (enemy.nextWaveTimer <= 0) {
                    enemy.waveCount++;
                    enemy.nextWaveTimer = Math.max(38, 70 - enemy.waveCount * 4);
                    if (enemy.waveCount >= 2 && enemy.age < 2) enemy.age = 2;
                    if (enemy.waveCount >= 4 && enemy.age < 3) enemy.age = 3;
                    if (enemy.waveCount >= 7 && enemy.age < 4) enemy.age = 4;

                    const enemySpawnBld = this.buildings.find(b => b.faction === 'enemy' && b.hp > 0);
                    const playerTarget = this.buildings.find(b => b.faction === 'player' && b.type === 'towncenter' && b.hp > 0) ||
                        this.buildings.find(b => b.faction === 'player' && b.hp > 0) ||
                        this.units.find(u => u.faction === 'player' && u.hp > 0);

                    if (enemySpawnBld && playerTarget) {
                        // Scan player forces for strategic counter-composition
                        const playerLiving = this.units.filter(u => u.faction === 'player' && u.hp > 0);
                        const playerKnights = playerLiving.filter(u => u.type === 'knight').length;
                        const playerArchers = playerLiving.filter(u => u.type === 'archer' || u.type === 'skirmisher').length;
                        const playerInfantry = playerLiving.filter(u => u.type === 'militia' || u.type === 'spearman').length;
                        const playerHasWalls = this.buildings.some(b => b.faction === 'player' && (b.type === 'wall' || b.type === 'castle') && b.hp > 0);

                        const waveRoster = [];
                        if (enemy.age <= 1) {
                            waveRoster.push('militia', 'militia');
                        } else if (enemy.age === 2) {
                            waveRoster.push('militia', 'spearman', 'archer', 'skirmisher');
                        } else {
                            waveRoster.push('knight', 'spearman', 'archer', 'skirmisher');
                        }

                        // Adaptive counters based on player army composition
                        const countersUsed = [];
                        if (playerKnights >= 2) {
                            waveRoster.push('spearman', 'spearman');
                            countersUsed.push('Pikeniere gegen Kavallerie');
                        }
                        if (playerArchers >= 2) {
                            waveRoster.push('skirmisher', 'skirmisher', 'knight');
                            countersUsed.push('Plänkler gegen Schützen');
                        }
                        if (playerInfantry >= 3) {
                            waveRoster.push('archer', 'archer');
                            countersUsed.push('Bogenschützen gegen Infanterie');
                        }
                        if (playerHasWalls || enemy.age >= 3) {
                            waveRoster.push('catapult');
                            countersUsed.push('Belagerungskatapulte');
                        }
                        if (enemy.age >= 3 && enemy.waveCount >= 3) {
                            waveRoster.push('monk');
                            countersUsed.push('Mönche');
                        }

                        const waveSize = Math.min(10, 3 + Math.floor(enemy.waveCount * 1.1));
                        for (let i = 0; i < waveSize; i++) {
                            const unitType = waveRoster[i % waveRoster.length];
                            const u = this.spawnUnit(
                                unitType,
                                enemySpawnBld.x - 50 + (Math.random() - 0.5) * 80,
                                enemySpawnBld.y + 50 + (Math.random() - 0.5) * 80,
                                'enemy'
                            );
                            u.state = 'attack';
                            u.targetEntityId = playerTarget.id;
                            u.path = this.navGrid.findPath(u.x, u.y, playerTarget.x, playerTarget.y);
                        }

                        this.sound.play('horn');
                        const counterMsg = countersUsed.length > 0 ? ` (Taktik: ${countersUsed.slice(0, 2).join(', ')})` : '';
                        this.showToast(`⚠️ Welle ${enemy.waveCount} greift an! Feindliches Heer rückt vor!${counterMsg}`);
                    }
                }
            }

            updateFogOfWar() {
                for (let gy = 0; gy < this.fogGridSize; gy++) {
                    for (let gx = 0; gx < this.fogGridSize; gx++) {
                        if (this.fog[gy][gx] === 2) this.fog[gy][gx] = 1;
                    }
                }
                const reveal = (wx, wy, radius) => {
                    const cx = Math.floor(wx / this.fogCellSize);
                    const cy = Math.floor(wy / this.fogCellSize);
                    const rCells = Math.ceil(radius / this.fogCellSize);
                    for (let y = Math.max(0, cy - rCells); y <= Math.min(this.fogGridSize - 1, cy + rCells); y++) {
                        for (let x = Math.max(0, cx - rCells); x <= Math.min(this.fogGridSize - 1, cx + rCells); x++) {
                            if (Math.hypot(x - cx, y - cy) <= rCells) {
                                this.fog[y][x] = 2;
                            }
                        }
                    }
                };
                this.buildings.forEach(b => {
                    if (b.faction === 'player' && b.hp > 0) reveal(b.x, b.y, BUILDINGS_DEF[b.type].vision);
                });
                this.units.forEach(u => {
                    if (u.faction === 'player' && u.hp > 0) reveal(u.x, u.y, UNITS_DEF[u.type].vision);
                });
            }

            checkVictoryConditions() {
                const playerAlive = this.buildings.some(b => b.faction === 'player' && b.hp > 0) ||
                    this.units.some(u => u.faction === 'player' && u.hp > 0);
                const enemyAlive = this.buildings.some(b => b.faction === 'enemy' && b.hp > 0) ||
                    this.units.some(u => u.faction === 'enemy' && u.hp > 0);

                if (!playerAlive || !enemyAlive) {
                    this.gameOver = true;
                    const win = !enemyAlive;
                    const modal = document.getElementById('gameOverModal');
                    document.getElementById('modalIcon').textContent = win ? '🏆' : '💀';
                    document.getElementById('modalTitle').textContent = win ? 'Glorreicher Sieg!' : 'Deine Dynastie ist gefallen';
                    document.getElementById('modalDesc').textContent = win
                        ? 'Du hast alle feindlichen Festungen zerschlagen und herrschst über das Imperium der Zeitalter!'
                        : 'Die feindlichen Heere haben deine Siedlung zerstört. Versuche es erneut!';
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                    this.sound.play(win ? 'fanfare' : 'horn');
                }
            }


            updateTopUI() {
                const p = this.factions.player;
                document.getElementById('uiWood').textContent = Math.floor(p.wood);
                document.getElementById('uiFood').textContent = Math.floor(p.food);
                document.getElementById('uiGold').textContent = Math.floor(p.gold);
                document.getElementById('uiStone').textContent = Math.floor(p.stone);
                document.getElementById('uiPop').textContent = `${p.pop}/${p.maxPop}`;

                const ageNameEl = document.getElementById('uiAgeName');
                if (p.researchingAge) {
                    const pct = Math.floor((p.ageProgress / p.ageDuration) * 100);
                    ageNameEl.textContent = `Forschung... (${pct}%)`;
                } else {
                    const nextCost = AGES_DEF[p.age].nextCost;
                    ageNameEl.textContent = nextCost ? `${AGES_DEF[p.age].name} ⬆️` : AGES_DEF[p.age].name;
                }

                const idleCount = this.units.filter(u => u.faction === 'player' && u.type === 'villager' && u.state === 'idle').length;
                document.getElementById('idleBadge').textContent = idleCount;
            }

            updateSelectionUI() {
                const selUnits = this.getSelectedUnits();
                const selBld = this.getSelectedBuilding();

                const iconEl = document.getElementById('selIcon');
                const titleEl = document.getElementById('selTitle');
                const subEl = document.getElementById('selSub');
                const hpTextEl = document.getElementById('selHpText');
                const extraEl = document.getElementById('selExtraText');
                const hpBarEl = document.getElementById('selHpBar');
                const panel = document.getElementById('actionPanel');
                panel.innerHTML = '';

                if (selUnits.length > 0) {
                    const u = selUnits[0];
                    const def = UNITS_DEF[u.type];
                    iconEl.textContent = def.icon;
                    titleEl.textContent = selUnits.length === 1 ? def.name : `${selUnits.length}x Einheiten`;
                    subEl.textContent = `Angriff: ${u.attack} | Rüstung: ${u.meleeArmor || 0}/${u.pierceArmor || 0} | Tempo: ${u.speed}`;
                    hpTextEl.textContent = `LP: ${Math.ceil(u.hp)}/${u.maxHp}`;
                    extraEl.textContent = u.carryAmount > 0 ? `Trägt: ${u.carryAmount}` : '';
                    hpBarEl.style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;

                    if (selUnits.some(x => x.type === 'villager')) {
                        Object.entries(BUILDINGS_DEF).forEach(([bKey, bDef]) => {
                            const locked = this.factions.player.age < bDef.minAge;
                            const btn = document.createElement('button');
                            btn.className = 'medieval-btn rounded-xl px-3 py-1.5 h-full min-w-[88px] flex flex-col items-center justify-between shrink-0';
                            btn.disabled = locked;
                            btn.innerHTML = `
                                <span class="text-xl">${bDef.icon}</span>
                                <span class="text-[11px] font-bold leading-tight">${bDef.name}</span>
                                <span class="text-[10px] text-amber-300">${this.formatCost(bDef.cost)}</span>
                            `;
                            btn.addEventListener('click', () => {
                                this.buildModeType = bKey;
                                this.sound.play('click');
                                this.showToast(`Tippe auf das Schlachtfeld, um ${bDef.name} zu platzieren.`);
                            });
                            panel.appendChild(btn);
                        });
                    }
                } else if (selBld) {
                    const bDef = BUILDINGS_DEF[selBld.type];
                    const gCount = selBld.garrison ? selBld.garrison.length : 0;
                    iconEl.textContent = bDef.icon;
                    titleEl.textContent = bDef.name;
                    subEl.textContent = selBld.completed ? 'Einsatzbereit' : `Im Bau (${Math.floor(selBld.progress)}%)`;
                    hpTextEl.textContent = `LP: ${Math.ceil(selBld.hp)}/${selBld.maxHp}`;
                    extraEl.textContent = gCount > 0 ? `Einquartiert: ${gCount} 🛡️` : (selBld.queue.length > 0 ? `In Ausbildung: ${selBld.queue.length}` : '');
                    hpBarEl.style.width = `${Math.max(0, (selBld.hp / selBld.maxHp) * 100)}%`;

                    if (selBld.completed) {
                        if (gCount > 0) {
                            const btnUngarrison = document.createElement('button');
                            btnUngarrison.className = 'medieval-btn rounded-xl px-3 py-1.5 h-full min-w-[95px] flex flex-col items-center justify-between shrink-0 border-amber-500/80';
                            btnUngarrison.innerHTML = `
                                <span class="text-xl">🚪</span>
                                <span class="text-[11px] font-bold leading-tight">Entquartieren</span>
                                <span class="text-[10px] text-emerald-400">Freilassen</span>
                            `;
                            btnUngarrison.addEventListener('click', () => {
                                this.ungarrisonBuilding(selBld);
                            });
                            panel.appendChild(btnUngarrison);
                        }

                        if (bDef.trains && bDef.trains.length > 0) {
                            bDef.trains.forEach(uKey => {
                                const uDef = UNITS_DEF[uKey];
                                const locked = this.factions.player.age < uDef.minAge;
                                const btn = document.createElement('button');
                                btn.className = 'medieval-btn rounded-xl px-3 py-1.5 h-full min-w-[92px] flex flex-col items-center justify-between shrink-0';
                                btn.disabled = locked;
                                btn.innerHTML = `
                                    <span class="text-xl">${uDef.icon}</span>
                                    <span class="text-[11px] font-bold leading-tight">${uDef.name}</span>
                                    <span class="text-[10px] text-amber-300">${this.formatCost(uDef.cost)}</span>
                                `;
                                btn.addEventListener('click', () => this.queueUnit(selBld, uKey));
                                panel.appendChild(btn);
                            });
                        }

                        if (bDef.researches && bDef.researches.length > 0) {
                            bDef.researches.forEach(tKey => {
                                const tDef = TECHS_DEF[tKey];
                                if (!tDef) return;
                                const p = this.factions.player;
                                const researched = p.techs && p.techs.has(tKey);
                                const locked = p.age < tDef.minAge;
                                const btn = document.createElement('button');
                                btn.className = `medieval-btn rounded-xl px-3 py-1.5 h-full min-w-[95px] flex flex-col items-center justify-between shrink-0 ${researched ? 'opacity-60 border-emerald-500/70 cursor-not-allowed' : ''}`;
                                btn.disabled = locked || researched;
                                btn.innerHTML = `
                                    <span class="text-xl">${tDef.icon}</span>
                                    <span class="text-[11px] font-bold leading-tight">${tDef.name}</span>
                                    <span class="text-[10px] text-amber-300">${researched ? 'Erforscht ✅' : this.formatCost(tDef.cost)}</span>
                                `;
                                btn.title = tDef.desc;
                                btn.addEventListener('click', () => {
                                    this.researchTech(tKey);
                                });
                                panel.appendChild(btn);
                            });
                        }

                        if (selBld.type === 'towncenter' && this.factions.player.age < 4) {
                            const nextCost = AGES_DEF[this.factions.player.age].nextCost;
                            const btn = document.createElement('button');
                            btn.className = 'medieval-btn rounded-xl px-3 py-1.5 h-full min-w-[105px] flex flex-col items-center justify-between shrink-0';
                            btn.innerHTML = `
                                <span class="text-xl">👑</span>
                                <span class="text-[11px] font-bold leading-tight">Nächstes Zeitalter</span>
                                <span class="text-[10px] text-amber-300">${this.formatCost(nextCost)}</span>
                            `;
                            btn.addEventListener('click', () => this.tryAdvanceAge());
                            panel.appendChild(btn);
                        }
                    }
                } else {
                    iconEl.textContent = '🛡️';
                    titleEl.textContent = 'Keine Auswahl';
                    subEl.textContent = 'Tippe auf Einheit oder Gebäude';
                    hpTextEl.textContent = 'Bereit';
                    extraEl.textContent = '';
                    hpBarEl.style.width = '0%';
                }
            }

            queueUnit(building, unitType) {
                const uDef = UNITS_DEF[unitType];
                const p = this.factions.player;
                if (p.age < uDef.minAge) {
                    this.showToast(`Benötigt ${AGES_DEF[uDef.minAge].name}!`);
                    return;
                }
                if (p.pop >= p.maxPop) {
                    this.showToast('Bevölkerungslimit erreicht! Baue weitere Designer-Villen 🏡.');
                    return;
                }
                if (!this.canAfford('player', uDef.cost)) {
                    this.showToast('Nicht genügend Rohstoffe für diese Einheit!');
                    return;
                }
                this.payCost('player', uDef.cost);
                building.queue.push({
                    unitType,
                    totalTime: uDef.trainTime,
                    remainingTime: uDef.trainTime
                });
                this.sound.play('click');
                this.updateTopUI();
                this.updateSelectionUI();
            }

            tryAdvanceAge() {
                const p = this.factions.player;
                if (p.age >= 4 || p.researchingAge) return;
                const cost = AGES_DEF[p.age].nextCost;
                if (!this.canAfford('player', cost)) {
                    this.showToast(`Für den Aufstieg benötigt: ${this.formatCost(cost)}`);
                    return;
                }
                this.payCost('player', cost);
                p.researchingAge = true;
                p.ageProgress = 0;
                this.sound.play('bell');
                this.showToast('⏳ Zeitalter-Forschung im Dorfzentrum begonnen!');
                this.updateTopUI();
            }

            // Selects ALL idle villagers (or all idle military units) at once so a single click assigns the entire idle group!
            selectIdleVillager(preferMilitary = false) {
                const idleVillagers = this.units.filter(u => u.faction === 'player' && u.type === 'villager' && u.state === 'idle' && u.hp > 0);
                const idleMilitary = this.units.filter(u => u.faction === 'player' && u.type !== 'villager' && u.state === 'idle' && u.hp > 0);

                let targetGroup = idleVillagers;
                let groupName = 'untätige Dorfbewohner';

                if ((preferMilitary && idleMilitary.length > 0 && idleVillagers.length === 0) || (idleVillagers.length === 0 && idleMilitary.length > 0)) {
                    targetGroup = idleMilitary;
                    groupName = 'untätige Kampfeinheiten';
                }

                if (targetGroup.length === 0) {
                    this.showToast('✅ Keine untätigen Einheiten – alle arbeiten oder marschieren!');
                    return;
                }

                this.selectedIds.clear();
                let sumX = 0, sumY = 0;
                targetGroup.forEach(u => {
                    this.selectedIds.add(u.id);
                    sumX += u.x;
                    sumY += u.y;
                });

                this.centerCameraOn(sumX / targetGroup.length, sumY / targetGroup.length);
                this.sound.play('click');
                this.showToast(`💤 Alle ${targetGroup.length} ${groupName} ausgewählt! Klicke auf ein Ziel, um alle dorthin zu schicken.`);
                this.updateSelectionUI();
            }

            selectAllMilitary() {
                const army = this.units.filter(u => u.faction === 'player' && u.type !== 'villager' && u.hp > 0);
                if (army.length === 0) {
                    this.showToast('Noch keine Kampfeinheiten ausgebildet!');
                    return;
                }
                this.selectedIds.clear();
                army.forEach(u => this.selectedIds.add(u.id));
                this.sound.play('attack_order');
                this.showToast(`⚔️ ${army.length} Kampfeinheiten ausgewählt!`);
                this.updateSelectionUI();
            }

            centerOnTownCenter(alsoSelect = false) {
                const tc = this.buildings.find(b => b.faction === 'player' && b.type === 'towncenter' && b.hp > 0);
                if (tc) {
                    this.centerCameraOn(tc.x, tc.y);
                    if (alsoSelect) {
                        this.selectedIds.clear();
                        this.selectedIds.add(tc.id);
                        this.sound.play('bell');
                        this.updateSelectionUI();
                    }
                }
            }

            centerCameraOn(wx, wy) {
                const iso = this.worldToIso(wx, wy, 0);
                this.camera.x = iso.x;
                this.camera.y = iso.y;
                this.camera.vx = 0;
                this.camera.vy = 0;
            }

            findEntityAt(wx, wy, sx = null, sy = null) {
                // Check both 2D ground distance and 3D screen-projected body hitboxes
                for (const u of this.units) {
                    if (u.hp <= 0) continue;
                    if (Math.hypot(u.x - wx, u.y - wy) <= u.radius + 14) return u;
                    if (sx !== null && sy !== null) {
                        const sp = this.worldToScreen(u.x, u.y, 15);
                        if (Math.hypot(sp.x - sx, sp.y - sy) <= 22 * this.camera.zoom) return u;
                    }
                }
                for (const b of this.buildings) {
                    if (b.hp <= 0) continue;
                    if (Math.hypot(b.x - wx, b.y - wy) <= b.radius + 12) return b;
                    if (sx !== null && sy !== null) {
                        const sp = this.worldToScreen(b.x, b.y, 26);
                        if (Math.hypot(sp.x - sx, sp.y - sy) <= (b.radius * 0.95) * this.camera.zoom) return b;
                    }
                }
                for (const r of this.resources) {
                    if (r.amount <= 0) continue;
                    if (Math.hypot(r.x - wx, r.y - wy) <= r.radius + 14) return r;
                    if (sx !== null && sy !== null) {
                        const sp = this.worldToScreen(r.x, r.y, 14);
                        if (Math.hypot(sp.x - sx, sp.y - sy) <= 22 * this.camera.zoom) return r;
                    }
                }
                return null;
            }

            findNearestResource(x, y, resType, maxRange) {
                let best = null, bestDist = maxRange;
                for (const r of this.resources) {
                    if (r.amount > 0 && (!resType || r.type === resType)) {
                        const d = Math.hypot(r.x - x, r.y - y);
                        if (d <= bestDist) {
                            bestDist = d;
                            best = r;
                        }
                    }
                }
                return best;
            }

            findEntityById(id) {
                if (!id) return null;
                return this.units.find(u => u.id === id) ||
                    this.buildings.find(b => b.id === id) ||
                    this.resources.find(r => r.id === id) || null;
            }

            findNearestEnemy(x, y, myFaction, maxRange) {
                let best = null, bestDist = maxRange;
                for (const u of this.units) {
                    if (u.faction !== myFaction && u.hp > 0) {
                        const d = Math.hypot(u.x - x, u.y - y);
                        if (d <= bestDist) { bestDist = d; best = u; }
                    }
                }
                if (best) return best;
                for (const b of this.buildings) {
                    if (b.faction !== myFaction && b.hp > 0) {
                        const d = Math.hypot(b.x - x, b.y - y);
                        if (d <= bestDist) { bestDist = d; best = b; }
                    }
                }
                return best;
            }

            getSelectedUnits() {
                return this.units.filter(u => u.faction === 'player' && u.hp > 0 && this.selectedIds.has(u.id));
            }

            getSelectedBuilding() {
                return this.buildings.find(b => b.hp > 0 && this.selectedIds.has(b.id)) || null;
            }

            canAfford(faction, cost) {
                if (!cost) return true;
                const f = this.factions[faction];
                return Object.entries(cost).every(([k, val]) => (f[k] || 0) >= val);
            }

            payCost(faction, cost) {
                if (!cost) return;
                const f = this.factions[faction];
                Object.entries(cost).forEach(([k, val]) => { f[k] -= val; });
            }

            formatCost(cost) {
                if (!cost) return '';
                const icons = { wood: '🪵', food: '🥩', gold: '🪙', stone: '🪨' };
                return Object.entries(cost).map(([k, v]) => `${icons[k]}${v}`).join(' ');
            }

            showToast(msg) {
                const banner = document.getElementById('toastBanner');
                const box = document.getElementById('toastBox');
                if (!banner || !box) return;
                box.textContent = msg;
                banner.classList.remove('opacity-0', '-translate-y-2');
                banner.classList.add('opacity-100', 'translate-y-0');
                clearTimeout(this._toastTimer);
                this._toastTimer = setTimeout(() => {
                    banner.classList.add('opacity-0', '-translate-y-2');
                    banner.classList.remove('opacity-100', 'translate-y-0');
                }, 2600);
            }

            cycleCivilization() {
                const civKeys = Object.keys(CIVS_DEF);
                const currIdx = civKeys.indexOf(this.playerCiv);
                const nextIdx = (currIdx + 1) % civKeys.length;
                this.playerCiv = civKeys[nextIdx];
                const civ = CIVS_DEF[this.playerCiv];

                const iconEl = document.getElementById('uiCivIcon');
                const nameEl = document.getElementById('uiCivName');
                if (iconEl) iconEl.textContent = civ.icon;
                if (nameEl) nameEl.textContent = civ.name;

                // Dynamically update active military units for civilization perks
                if (this.playerCiv === 'franks') {
                    this.units.filter(u => u.faction === 'player' && u.type === 'knight').forEach(u => {
                        const baseHp = UNITS_DEF.knight.hp;
                        u.maxHp = Math.round(baseHp * 1.2);
                        u.hp = Math.min(u.hp, u.maxHp);
                    });
                } else if (this.playerCiv === 'britons') {
                    this.units.filter(u => u.faction === 'player' && (u.type === 'archer' || u.type === 'skirmisher')).forEach(u => {
                        u.range = UNITS_DEF[u.type].range + 30;
                    });
                } else if (this.playerCiv === 'teutons') {
                    this.units.filter(u => u.faction === 'player' && (u.type === 'militia' || u.type === 'spearman')).forEach(u => {
                        u.meleeArmor = (UNITS_DEF[u.type].meleeArmor || 0) + 2;
                    });
                } else if (this.playerCiv === 'mongols') {
                    this.units.filter(u => u.faction === 'player' && u.type === 'knight').forEach(u => {
                        u.speed = Math.round(UNITS_DEF.knight.speed * 1.2);
                    });
                }

                this.sound.play('horn');
                this.sound.speak(`Zivilisation: ${civ.name}`);
                this.showToast(`👑 Zivilisation: ${civ.icon} ${civ.name} – ${civ.desc}`);
            }

            cycleFormation() {
                const formations = ['box', 'line', 'staggered'];
                const names = {
                    box: { icon: '⛶', name: 'Kasten' },
                    line: { icon: '➖', name: 'Linie' },
                    staggered: { icon: '🔲', name: 'Gestaffelt' }
                };
                const currIdx = formations.indexOf(this.activeFormation || 'box');
                const nextIdx = (currIdx + 1) % formations.length;
                this.activeFormation = formations[nextIdx];

                const iconEl = document.getElementById('formationIcon');
                const nameEl = document.getElementById('formationName');
                if (iconEl) iconEl.textContent = names[this.activeFormation].icon;
                if (nameEl) nameEl.textContent = names[this.activeFormation].name;

                this.sound.play('click');
                this.showToast(`🛡️ Formation: ${names[this.activeFormation].icon} ${names[this.activeFormation].name} aktiviert!`);
            }
        }


// Boot the game immediately when DOM is ready
if (typeof window !== 'undefined') window.GameEngine = GameEngine;
if (typeof global !== 'undefined') global.GameEngine = GameEngine;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new GameEngine());
} else {
    new GameEngine();
}
