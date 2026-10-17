// ==========================================
// Imperium der Zeitalter – A* NavGrid & Collision
// ==========================================

class NavGrid {
    constructor(worldSize, cellSize = 40) {
        this.worldSize = worldSize;
        this.cellSize = cellSize;
        this.cols = Math.ceil(worldSize / cellSize);
        this.rows = Math.ceil(worldSize / cellSize);
        this.staticGrid = new Uint8Array(this.cols * this.rows);
        this.dynamicGrid = new Uint8Array(this.cols * this.rows);
    }

    setStaticLakes(lakes) {
        this.staticGrid.fill(0);
        for (const lk of lakes) {
            const minX = Math.max(0, Math.floor((lk.x - lk.rx - 14) / this.cellSize));
            const maxX = Math.min(this.cols - 1, Math.ceil((lk.x + lk.rx + 14) / this.cellSize));
            const minY = Math.max(0, Math.floor((lk.y - lk.ry - 14) / this.cellSize));
            const maxY = Math.min(this.rows - 1, Math.ceil((lk.y + lk.ry + 14) / this.cellSize));
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    const wx = (x + 0.5) * this.cellSize;
                    const wy = (y + 0.5) * this.cellSize;
                    const dx = wx - lk.x;
                    const dy = wy - lk.y;
                    const cos = Math.cos(0.2);
                    const sin = Math.sin(0.2);
                    const rx = dx * cos + dy * sin;
                    const ry = -dx * sin + dy * cos;
                    if ((rx * rx) / ((lk.rx + 10) * (lk.rx + 10)) + (ry * ry) / ((lk.ry + 8) * (lk.ry + 8)) <= 1.0) {
                        this.staticGrid[y * this.cols + x] = 1;
                    }
                }
            }
        }
        this.rebuildDynamic([]);
    }

    rebuildDynamic(buildings) {
        this.dynamicGrid.set(this.staticGrid);
        for (const b of buildings) {
            if (b.hp <= 0 || b.isFarm) continue;
            const rad = Math.max(14, b.radius * 0.72);
            const minX = Math.max(0, Math.floor((b.x - rad) / this.cellSize));
            const maxX = Math.min(this.cols - 1, Math.ceil((b.x + rad) / this.cellSize));
            const minY = Math.max(0, Math.floor((b.y - rad) / this.cellSize));
            const maxY = Math.min(this.rows - 1, Math.ceil((b.y + rad) / this.cellSize));
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    this.dynamicGrid[y * this.cols + x] = 1;
                }
            }
        }
    }

    rebuildFromBuildings(buildings) {
        return this.rebuildDynamic(buildings);
    }

    isBlocked(gx, gy) {
        if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return true;
        return this.dynamicGrid[gy * this.cols + gx] === 1;
    }

    isWorldBlocked(wx, wy, radius = 0) {
        const gx = Math.floor(wx / this.cellSize);
        const gy = Math.floor(wy / this.cellSize);
        if (this.isBlocked(gx, gy)) return true;
        if (radius > 0) {
            const radCells = Math.ceil(radius / this.cellSize);
            for (let dy = -radCells; dy <= radCells; dy++) {
                for (let dx = -radCells; dx <= radCells; dx++) {
                    if (this.isBlocked(gx + dx, gy + dy)) {
                        const cellWx = (gx + dx + 0.5) * this.cellSize;
                        const cellWy = (gy + dy + 0.5) * this.cellSize;
                        if (Math.hypot(cellWx - wx, cellWy - wy) < radius + this.cellSize * 0.35) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    hasLineOfSight(x0, y0, x1, y1) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / (this.cellSize * 0.5)));
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = x0 + dx * t;
            const py = y0 + dy * t;
            if (this.isWorldBlocked(px, py, 4)) return false;
        }
        return true;
    }

    findClosestFreeCell(gx, gy, maxRadius = 3) {
        let bestDist = Infinity;
        let bestPos = { x: gx, y: gy };
        for (let r = 1; r <= maxRadius; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const nx = gx + dx, ny = gy + dy;
                    if (!this.isBlocked(nx, ny)) {
                        const d = Math.hypot(nx - gx, ny - gy);
                        if (d < bestDist) {
                            bestDist = d;
                            bestPos = { x: nx, y: ny };
                        }
                    }
                }
            }
            if (bestDist < Infinity) break;
        }
        return bestPos;
    }

    reconstructPath(cameFrom, current, startX, startY, targetX, targetY) {
        const rawPath = [];
        let curr = current;
        while (curr !== -1) {
            const cx = curr % this.cols;
            const cy = Math.floor(curr / this.cols);
            rawPath.unshift({ x: (cx + 0.5) * this.cellSize, y: (cy + 0.5) * this.cellSize });
            curr = cameFrom[curr];
        }
        rawPath[0] = { x: startX, y: startY };
        rawPath[rawPath.length - 1] = { x: targetX, y: targetY };
        return rawPath;
    }

    smoothPath(rawPath) {
        if (!rawPath || rawPath.length <= 2) return rawPath ? rawPath.slice(1) : [];
        const smoothed = [rawPath[0]];
        let curP = 0;
        while (curP < rawPath.length - 1) {
            let nextP = rawPath.length - 1;
            while (nextP > curP + 1) {
                if (this.hasLineOfSight(rawPath[curP].x, rawPath[curP].y, rawPath[nextP].x, rawPath[nextP].y)) {
                    break;
                }
                nextP--;
            }
            smoothed.push(rawPath[nextP]);
            curP = nextP;
        }
        return smoothed.slice(1);
    }

    findPath(startX, startY, targetX, targetY) {
        if (this.hasLineOfSight(startX, startY, targetX, targetY)) {
            return [{ x: targetX, y: targetY }];
        }

        const startGx = Math.max(0, Math.min(this.cols - 1, Math.floor(startX / this.cellSize)));
        const startGy = Math.max(0, Math.min(this.rows - 1, Math.floor(startY / this.cellSize)));
        let endGx = Math.max(0, Math.min(this.cols - 1, Math.floor(targetX / this.cellSize)));
        let endGy = Math.max(0, Math.min(this.rows - 1, Math.floor(targetY / this.cellSize)));

        if (this.isBlocked(endGx, endGy)) {
            const free = this.findClosestFreeCell(endGx, endGy);
            endGx = free.x;
            endGy = free.y;
        }

        const openSet = [];
        const cameFrom = new Int32Array(this.cols * this.rows).fill(-1);
        const gScore = new Float32Array(this.cols * this.rows).fill(1e9);
        const fScore = new Float32Array(this.cols * this.rows).fill(1e9);

        const startIdx = startGy * this.cols + startGx;
        const endIdx = endGy * this.cols + endGx;

        gScore[startIdx] = 0;
        fScore[startIdx] = Math.hypot(endGx - startGx, endGy - startGy);
        openSet.push(startIdx);

        let iterations = 0;
        const maxIter = 350;

        while (openSet.length > 0 && iterations++ < maxIter) {
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore[openSet[i]] < fScore[openSet[lowestIdx]]) lowestIdx = i;
            }
            const current = openSet.splice(lowestIdx, 1)[0];

            if (current === endIdx) {
                const rawPath = this.reconstructPath(cameFrom, current, startX, startY, targetX, targetY);
                return this.smoothPath(rawPath);
            }

            const cx = current % this.cols;
            const cy = Math.floor(current / this.cols);

            const neighbors = [
                { x: cx + 1, y: cy, c: 1 }, { x: cx - 1, y: cy, c: 1 },
                { x: cx, y: cy + 1, c: 1 }, { x: cx, y: cy - 1, c: 1 },
                { x: cx + 1, y: cy + 1, c: 1.414 }, { x: cx - 1, y: cy + 1, c: 1.414 },
                { x: cx + 1, y: cy - 1, c: 1.414 }, { x: cx - 1, y: cy - 1, c: 1.414 }
            ];

            for (const nb of neighbors) {
                if (nb.x < 0 || nb.x >= this.cols || nb.y < 0 || nb.y >= this.rows) continue;
                if (this.isBlocked(nb.x, nb.y)) continue;
                if (nb.c > 1 && (this.isBlocked(cx, nb.y) || this.isBlocked(nb.x, cy))) continue;

                const nbIdx = nb.y * this.cols + nb.x;
                const tentativeG = gScore[current] + nb.c;

                if (tentativeG < gScore[nbIdx]) {
                    cameFrom[nbIdx] = current;
                    gScore[nbIdx] = tentativeG;
                    fScore[nbIdx] = tentativeG + Math.hypot(endGx - nb.x, endGy - nb.y);
                    if (!openSet.includes(nbIdx)) openSet.push(nbIdx);
                }
            }
        }
        return [{ x: targetX, y: targetY }];
    }
}

if (typeof window !== 'undefined') window.NavGrid = NavGrid;
if (typeof global !== 'undefined') global.NavGrid = NavGrid;
