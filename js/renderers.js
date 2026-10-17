// ==========================================
// Imperium der Zeitalter – 2.5D Isometric Rendering Subsystem
// ==========================================

class GameRendererEngine {
            worldToIso(wx, wy, wz = 0) {
                return {
                    x: wx - wy,
                    y: (wx + wy) * 0.5 - wz
                };
            }

            // Inverse 2:1 Isometric Projection: maps (ix, iy) on ground plane (wz=0) -> (wx, wy)
            isoToWorld(ix, iy) {
                return {
                    x: iy + ix * 0.5,
                    y: iy - ix * 0.5
                };
            }

            worldToScreen(wx, wy, wz = 0) {
                const iso = this.worldToIso(wx, wy, wz);
                return {
                    x: (iso.x - this.camera.x) * this.camera.zoom + this.canvas.width * 0.5,
                    y: (iso.y - this.camera.y) * this.camera.zoom + this.canvas.height * 0.5
                };
            }

            screenToWorld(sx, sy) {
                const ix = (sx - this.canvas.width * 0.5) / this.camera.zoom + this.camera.x;
                const iy = (sy - this.canvas.height * 0.5) / this.camera.zoom + this.camera.y;
                const w = this.isoToWorld(ix, iy);
                return {
                    x: Math.max(0, Math.min(this.worldSize, w.x)),
                    y: Math.max(0, Math.min(this.worldSize, w.y))
                };
            }

            generateTerrainTexture() {
                const off = document.createElement('canvas');
                off.width = this.worldSize;
                off.height = this.worldSize;
                const tctx = off.getContext('2d');

                // Lush medieval valley base gradient
                const grad = tctx.createLinearGradient(0, 0, this.worldSize, this.worldSize);
                grad.addColorStop(0, '#365826');
                grad.addColorStop(0.5, '#3f662c');
                grad.addColorStop(1, '#2f4e21');
                tctx.fillStyle = grad;
                tctx.fillRect(0, 0, this.worldSize, this.worldSize);

                // Soft organic biome patches
                for (let i = 0; i < 180; i++) {
                    const px = Math.random() * this.worldSize;
                    const py = Math.random() * this.worldSize;
                    const pr = 50 + Math.random() * 140;
                    const g = tctx.createRadialGradient(px, py, 5, px, py, pr);
                    g.addColorStop(0, i % 2 === 0 ? 'rgba(74, 118, 48, 0.26)' : 'rgba(42, 68, 28, 0.24)');
                    g.addColorStop(1, 'rgba(0,0,0,0)');
                    tctx.fillStyle = g;
                    tctx.beginPath();
                    tctx.arc(px, py, pr, 0, Math.PI * 2);
                    tctx.fill();
                }

                // Paved Royal Trade Road connecting South-West Player Valley to North-East Enemy Fortress
                tctx.save();
                tctx.strokeStyle = 'rgba(138, 118, 90, 0.48)';
                tctx.lineWidth = 46;
                tctx.lineCap = 'round';
                tctx.beginPath();
                tctx.moveTo(420, 1940);
                tctx.bezierCurveTo(950, 1620, 1380, 920, 1940, 460);
                tctx.stroke();

                tctx.strokeStyle = 'rgba(180, 160, 130, 0.35)';
                tctx.lineWidth = 28;
                tctx.setLineDash([12, 10]);
                tctx.stroke();
                tctx.restore();

                // Two Scenic Oasis Lakes
                this.lakes = [
                    { x: 760, y: 1220, rx: 125, ry: 85 },
                    { x: 1580, y: 1420, rx: 135, ry: 92 }
                ];
                this.lakes.forEach(lk => {
                    // Sandy shore
                    tctx.fillStyle = '#c2a675';
                    tctx.beginPath();
                    tctx.ellipse(lk.x, lk.y, lk.rx + 18, lk.ry + 16, -0.2, 0, Math.PI * 2);
                    tctx.fill();

                    // Shallow & deep water
                    const wg = tctx.createRadialGradient(lk.x - 15, lk.y - 15, 10, lk.x, lk.y, lk.rx);
                    wg.addColorStop(0, '#0284c7');
                    wg.addColorStop(0.7, '#0369a1');
                    wg.addColorStop(1, '#075985');
                    tctx.fillStyle = wg;
                    tctx.beginPath();
                    tctx.ellipse(lk.x, lk.y, lk.rx, lk.ry, -0.2, 0, Math.PI * 2);
                    tctx.fill();
                });

                // Fine grass blades & wildflowers
                for (let i = 0; i < 3200; i++) {
                    const gx = Math.random() * this.worldSize;
                    const gy = Math.random() * this.worldSize;
                    tctx.fillStyle = i % 9 === 0 ? '#fde047' : (i % 2 === 0 ? '#4d7c36' : '#29461b');
                    tctx.fillRect(gx, gy, 2.5, 2.5);
                }

                this.terrainCanvas = off;
            }

            draw3DGlassPanel(ctx, v0, v1, v2, v3, frameCol = '#1e293b') {
                const p0 = this.worldToIso(v0.x, v0.y, v0.z);
                const p1 = this.worldToIso(v1.x, v1.y, v1.z);
                const p2 = this.worldToIso(v2.x, v2.y, v2.z);
                const p3 = this.worldToIso(v3.x, v3.y, v3.z);

                // Warm interior glow + cool sky reflection gradient
                const grad = ctx.createLinearGradient(p0.x, p2.y, p1.x, p0.y);
                grad.addColorStop(0, 'rgba(56, 189, 248, 0.78)');
                grad.addColorStop(0.45, 'rgba(254, 240, 138, 0.85)');
                grad.addColorStop(1, 'rgba(245, 158, 11, 0.92)');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fill();

                // Diagonal specular glass sheen
                ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo((p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo((p3.x + p2.x) * 0.5, (p3.y + p2.y) * 0.5);
                ctx.closePath();
                ctx.fill();

                // Architectural Mullion Frame
                ctx.strokeStyle = frameCol;
                ctx.lineWidth = 1.1;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.stroke();

                // Vertical center mullion
                ctx.beginPath();
                ctx.moveTo((p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5);
                ctx.lineTo((p3.x + p2.x) * 0.5, (p3.y + p2.y) * 0.5);
                ctx.stroke();
            }

            // Draws warm architectural interior light spilling onto a terrace or ground plane
            drawIsoLightSpill(ctx, wx, wy, wz, rx, ry, alpha = 0.38) {
                const c = this.worldToIso(wx, wy, wz);
                const rScreen = Math.max(4, rx * 1.25);
                const g = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, rScreen);
                g.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
                g.addColorStop(0.55, `rgba(251, 191, 36, ${alpha * 0.45})`);
                g.addColorStop(1, 'rgba(251, 191, 36, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, rx * 1.3, ry * 0.65, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Renders a complex, multi-polygon 3D Designer Architectural Villa with cantilevers, glazed atriums, pools & rich light/shadow
            drawDesignerHouse3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const variant = b.id % 3;
                const wx = b.x;
                const wy = b.y;
                const s = r * 1.08; // Generous architectural footprint

                // 1. Multi-Tiered Travertine & Slate Podium Terrace (with recessed shadow reveal)
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.12, s * 1.12, 3.2, '#44403c', '#292524', '#1c1917', 'rgba(0,0,0,0.45)', 14, 0.1);
                this.drawIsoBox(ctx, wx - 1, wy - 1, 3.2, s * 1.04, s * 1.04, 3.8, '#e7e5e4', '#d6d3d1', '#a8a29e', 'rgba(20,16,12,0.28)', 22, 0.18);

                // Sculptural Floating Entrance Steps on South-West Front
                for (let step = 0; step < 3; step++) {
                    const stZ = step * 2.2;
                    const stY = wy + s * 1.06 + (2 - step) * 2.4;
                    this.drawIsoBox(ctx, wx - s * 0.15, stY, stZ, s * 0.26, 1.8, 1.8, '#f5f5f4', '#d6d3d1', '#78716c', null, 20, 0.15);
                }

                // 2. Integrated Designer Infinity Reflecting Pool (South-East Terrace)
                const poolX = wx + s * 0.48;
                const poolY = wy + s * 0.36;
                const poolRx = s * 0.44;
                const poolRy = s * 0.52;
                this.drawIsoBox(ctx, poolX, poolY, 4.0, poolRx + 1.8, poolRy + 1.8, 3.8, '#cbd5e1', '#94a3b8', '#475569', null, 28, 0.25);
                // Shimmering animated water surface polygon
                const waveShimmer = 0.5 + 0.5 * Math.sin(this.gameTime * 3.2 + b.id);
                const waterCol = waveShimmer > 0.5 ? '#0ea5e9' : '#0284c7';
                this.draw3DQuad(
                    ctx,
                    { x: poolX - poolRx, y: poolY - poolRy, z: 7.4 },
                    { x: poolX + poolRx, y: poolY - poolRy, z: 7.4 },
                    { x: poolX + poolRx, y: poolY + poolRy, z: 7.4 },
                    { x: poolX - poolRx, y: poolY + poolRy, z: 7.4 },
                    waterCol, 64, 0.75, 'rgba(186,230,253,0.5)'
                );

                // Warm Cedar Hardwood Sun-Deck on South-West Terrace
                this.drawIsoBox(ctx, wx - s * 0.22, wy + s * 0.48, 6.8, s * 0.62, s * 0.42, 1.6, '#b45309', '#92400e', '#78350f', 'rgba(40,20,5,0.35)', 18, 0.14);

                if (variant === 0) {
                    // === VARIANT 0: CANTILEVERED ATRIUM & BUTTERFLY-ROOF DESIGNER VILLA ===
                    // Ground Floor Architectural Core (Natural Slate & Warm Timber Cladding)
                    const gx = wx - s * 0.18;
                    const gy = wy - s * 0.12;
                    const grx = s * 0.68;
                    const gry = s * 0.62;
                    this.drawIsoBox(ctx, gx, gy, 7.0, grx, gry, 16.5, '#f5f5f4', '#e7e5e4', '#a8a29e', 'rgba(20,16,12,0.3)', 20, 0.16);

                    // Double-Height Glazed Wintergarden / Orangerie Wing (South-East)
                    const ax = wx + s * 0.24;
                    const ay = wy + s * 0.18;
                    const arx = s * 0.42;
                    const ary = s * 0.44;
                    this.drawIsoBox(ctx, ax, ay, 7.0, arx, ary, 14.5, '#38bdf8', '#0284c7', '#0369a1', '#1e293b', 55, 0.65);

                    // Floor-to-ceiling glass curtain walls on both visible faces
                    this.draw3DGlassPanel(
                        ctx,
                        { x: ax - arx + 1.5, y: ay + ary + 0.3, z: 7.5 },
                        { x: ax + arx - 1.5, y: ay + ary + 0.3, z: 7.5 },
                        { x: ax + arx - 1.5, y: ay + ary + 0.3, z: 21.0 },
                        { x: ax - arx + 1.5, y: ay + ary + 0.3, z: 21.0 }
                    );
                    this.draw3DGlassPanel(
                        ctx,
                        { x: ax + arx + 0.3, y: ay + ary - 1.5, z: 7.5 },
                        { x: ax + arx + 0.3, y: ay - ary + 1.5, z: 7.5 },
                        { x: ax + arx + 0.3, y: ay - ary + 1.5, z: 21.0 },
                        { x: ax + arx + 0.3, y: ay + ary - 1.5, z: 21.0 }
                    );

                    // Slanted Skylight Glass Roof over Wintergarden
                    this.draw3DGlassPanel(
                        ctx,
                        { x: ax - arx, y: ay + ary, z: 21.5 },
                        { x: ax + arx, y: ay + ary, z: 21.5 },
                        { x: ax + arx, y: ay - ary, z: 26.5 },
                        { x: ax - arx, y: ay - ary, z: 26.5 }
                    );

                    // Warm interior light spilling onto the cedar sun-deck & pool
                    this.drawIsoLightSpill(ctx, ax, ay + ary + 6, 8.5, 14, 10, 0.48);

                    // Deep Under-Cantilever Cast Shadow on Lower Roof & Terrace
                    this.draw3DQuad(
                        ctx,
                        { x: wx - s * 0.72, y: wy + s * 0.1, z: 8.6 },
                        { x: wx + s * 0.35, y: wy + s * 0.1, z: 8.6 },
                        { x: wx + s * 0.35, y: wy + s * 0.78, z: 8.6 },
                        { x: wx - s * 0.72, y: wy + s * 0.78, z: 8.6 },
                        '#090807', 0, 0, null
                    );

                    // Timber Pergola / Brise-Soleil Louvers over South-West Patio
                    for (let lv = 0; lv < 5; lv++) {
                        const ly = wy + s * 0.22 + lv * 3.4;
                        this.drawIsoBox(ctx, wx - s * 0.36, ly, 20.5, s * 0.42, 0.8, 1.2, '#d97706', '#b45309', '#78350f', null, 16, 0.12);
                    }

                    // Dramatic Cantilevered Upper Studio Wing (projects forward & left with warm cedar + dark bronze trim)
                    const ux = wx - s * 0.12;
                    const uy = wy + s * 0.16;
                    const urx = s * 0.74;
                    const ury = s * 0.48;
                    this.drawIsoBox(ctx, ux, uy, 22.5, urx, ury, 13.5, '#f5f5f4', '#d97706', '#92400e', '#1e293b', 26, 0.22);

                    // Recessed Ribbon Window + Glass Balcony on Cantilevered Upper Floor
                    this.draw3DGlassPanel(
                        ctx,
                        { x: ux - urx * 0.82, y: uy + ury + 0.35, z: 24.5 },
                        { x: ux + urx * 0.78, y: uy + ury + 0.35, z: 24.5 },
                        { x: ux + urx * 0.78, y: uy + ury + 0.35, z: 33.5 },
                        { x: ux - urx * 0.82, y: uy + ury + 0.35, z: 33.5 }
                    );

                    // Sculptural Asymmetric Butterfly / Folded-Plate Designer Roof (in faction accent + architectural slate)
                    const rZ = 36.0;
                    const rOverX = urx * 1.16;
                    const rOverY = ury * 1.18;
                    const vValleyFront = { x: ux, y: uy + rOverY, z: rZ + 1.5 };
                    const vValleyBack = { x: ux, y: uy - rOverY, z: rZ + 1.5 };
                    const vLeftFront = { x: ux - rOverX, y: uy + rOverY, z: rZ + 10.5 };
                    const vLeftBack = { x: ux - rOverX, y: uy - rOverY, z: rZ + 10.5 };
                    const vRightFront = { x: ux + rOverX, y: uy + rOverY, z: rZ + 8.0 };
                    const vRightBack = { x: ux + rOverX, y: uy - rOverY, z: rZ + 8.0 };

                    // Left rising wing slope
                    this.draw3DQuad(ctx, vLeftBack, vLeftFront, vValleyFront, vValleyBack, roofTop, 36, 0.34, 'rgba(15,23,42,0.4)');
                    // Right rising wing slope
                    this.draw3DQuad(ctx, vValleyBack, vValleyFront, vRightFront, vRightBack, roofRight, 36, 0.34, 'rgba(15,23,42,0.4)');
                    // Front V-shaped architectural fascia
                    this.draw3DTri(ctx, { x: ux - urx, y: uy + ury, z: rZ }, vValleyFront, vLeftFront, '#f8fafc', 20, 0.15);
                    this.draw3DTri(ctx, { x: ux + urx, y: uy + ury, z: rZ }, vRightFront, vValleyFront, '#cbd5e1', 20, 0.15);

                    // Tall Architectural Natural Stone Fireplace Chimney Pier piercing the roof
                    this.drawIsoBox(ctx, wx - s * 0.52, wy - s * 0.15, 7.0, 4.2, 4.2, 42.0, '#78716c', '#57534e', '#292524', 'rgba(0,0,0,0.4)', 18, 0.12);
                } else if (variant === 1) {
                    // === VARIANT 1: OCTAGONAL GLASS ROTUNDA & SKY-GARDEN PAVILION VILLA ===
                    // Rectangular Limestone Garden Wing (North-West)
                    this.drawIsoBox(ctx, wx - s * 0.25, wy - s * 0.18, 7.0, s * 0.62, s * 0.58, 15.0, '#f5f5f4', '#e7dac6', '#a89f91', 'rgba(20,16,12,0.3)', 22, 0.16);

                    // Rooftop Botanical Sky-Garden on the Limestone Wing
                    this.drawIsoBox(ctx, wx - s * 0.25, wy - s * 0.18, 22.0, s * 0.56, s * 0.52, 2.2, '#22c55e', '#16a34a', '#15803d', null, 12, 0.08);
                    // Miniature sculptural rooftop cypress trees
                    this.drawIsoCone(ctx, wx - s * 0.52, wy - s * 0.35, 24.2, 4.8, 14, '#4ade80', '#166534', 7, 18, 0.15, 0.15);
                    this.drawIsoCone(ctx, wx - s * 0.12, wy - s * 0.45, 24.2, 4.2, 11, '#22c55e', '#14532d', 7, 18, 0.15, 0.15);

                    // 10-Faceted Panoramic Rotunda Living Tower (Center-Front)
                    const rxC = wx + s * 0.08;
                    const ryC = wy + s * 0.16;
                    const rotR = s * 0.56;
                    this.drawIsoCylinder(ctx, rxC, ryC, 7.0, rotR, 14.0, '#e2e8f0', '#f8fafc', '#94a3b8', '#334155', 10, rotR);
                    // Glowing 360-degree Clerestory Glass Band around the Rotunda
                    this.drawIsoCylinder(ctx, rxC, ryC, 21.0, rotR * 0.96, 9.5, '#fef08a', '#38bdf8', '#fbbf24', '#1e293b', 10, rotR * 1.02);
                    // Cantilevered Circular Observation Ring Overhang
                    this.drawIsoCylinder(ctx, rxC, ryC, 30.5, rotR * 1.18, 3.2, '#f8fafc', '#e2e8f0', '#64748b', '#1e293b', 12, rotR * 1.14);

                    // Multi-Faceted Folded Designer Dome & Copper/Faction Lantern Spire
                    this.drawIsoPolyDome(ctx, rxC, ryC, 33.7, rotR * 1.08, rotR * 1.08, 12.5, roofLeft, 3, 10, 42, 0.45);
                    this.drawIsoCylinder(ctx, rxC, ryC, 45.0, rotR * 0.32, 6.0, '#fef08a', '#fde047', '#ca8a04', '#422006', 8, rotR * 0.28);
                    this.drawIsoCone(ctx, rxC, ryC, 51.0, rotR * 0.38, 9.0, roofTop, roofRight, 8, 45, 0.5);

                    // Warm Golden Light Spill around the Rotunda
                    this.drawIsoLightSpill(ctx, rxC - 4, ryC + rotR + 4, 8.5, 16, 11, 0.52);
                } else {
                    // === VARIANT 2: CASCADING TRIPLE-CUBE LOFT & ORIGAMI-ROOF VILLA ===
                    // Lower Cube 1 (Stone & Panoramic Glass Lounge)
                    const c1x = wx - s * 0.26, c1y = wy + s * 0.22;
                    this.drawIsoBox(ctx, c1x, c1y, 7.0, s * 0.58, s * 0.54, 14.5, '#f5f5f4', '#e7e5e4', '#a8a29e', '#334155', 22, 0.18);
                    this.draw3DGlassPanel(
                        ctx,
                        { x: c1x - s * 0.48, y: c1y + s * 0.55, z: 8.0 },
                        { x: c1x + s * 0.48, y: c1y + s * 0.55, z: 8.0 },
                        { x: c1x + s * 0.48, y: c1y + s * 0.55, z: 19.5 },
                        { x: c1x - s * 0.48, y: c1y + s * 0.55, z: 19.5 }
                    );

                    // Mid Interlocking Cube 2 (Cantilevered Dark Slate & Cedar Gallery)
                    const c2x = wx + s * 0.16, c2y = wy - s * 0.14;
                    this.drawIsoBox(ctx, c2x, c2y, 14.0, s * 0.62, s * 0.58, 15.5, '#334155', '#475569', '#1e293b', '#0f172a', 28, 0.25);
                    this.draw3DGlassPanel(
                        ctx,
                        { x: c2x + s * 0.63, y: c2y + s * 0.45, z: 16.0 },
                        { x: c2x + s * 0.63, y: c2y - s * 0.45, z: 16.0 },
                        { x: c2x + s * 0.63, y: c2y - s * 0.45, z: 27.5 },
                        { x: c2x + s * 0.63, y: c2y + s * 0.45, z: 27.5 }
                    );

                    // Upper Penthouse Cube 3 (Rotated/Offset Cantilevered Sky-Loft)
                    const c3x = wx - s * 0.06, c3y = wy - s * 0.04;
                    const c3r = s * 0.52;
                    // Cast dark AO shadow from Penthouse onto Cube 1
                    this.draw3DQuad(
                        ctx,
                        { x: c3x - c3r, y: c3y, z: 21.7 },
                        { x: c3x + c3r, y: c3y, z: 21.7 },
                        { x: c3x + c3r, y: c3y + c3r * 1.15, z: 21.7 },
                        { x: c3x - c3r, y: c3y + c3r * 1.15, z: 21.7 },
                        '#0c0a09', 0, 0, null
                    );
                    this.drawIsoBox(ctx, c3x, c3y, 24.0, c3r, c3r, 13.5, '#fef3c7', '#d97706', '#b45309', '#1e293b', 26, 0.22);
                    this.draw3DGlassPanel(
                        ctx,
                        { x: c3x - c3r * 0.8, y: c3y + c3r + 0.3, z: 25.5 },
                        { x: c3x + c3r * 0.8, y: c3y + c3r + 0.3, z: 25.5 },
                        { x: c3x + c3r * 0.8, y: c3y + c3r + 0.3, z: 35.5 },
                        { x: c3x - c3r * 0.8, y: c3y + c3r + 0.3, z: 35.5 }
                    );

                    // Sculptural Folded Origami Polygon Roof over the Penthouse
                    const oz = 37.5;
                    const or = c3r * 1.22;
                    const pNW = { x: c3x - or, y: c3y - or, z: oz };
                    const pNE = { x: c3x + or, y: c3y - or, z: oz + 4 };
                    const pSE = { x: c3x + or, y: c3y + or, z: oz };
                    const pSW = { x: c3x - or, y: c3y + or, z: oz + 5 };
                    const pPeak1 = { x: c3x - or * 0.35, y: c3y - or * 0.2, z: oz + 16 };
                    const pPeak2 = { x: c3x + or * 0.4, y: c3y + or * 0.3, z: oz + 13 };

                    this.draw3DTri(ctx, pNW, pSW, pPeak1, roofTop, 38, 0.36);
                    this.draw3DTri(ctx, pNW, pPeak1, pNE, roofLeft, 38, 0.36);
                    this.draw3DTri(ctx, pSW, pPeak2, pPeak1, roofTop, 42, 0.4);
                    this.draw3DTri(ctx, pPeak1, pPeak2, pNE, roofRight, 38, 0.36);
                    this.draw3DTri(ctx, pSW, pSE, pPeak2, roofLeft, 40, 0.38);
                    this.draw3DTri(ctx, pPeak2, pSE, pNE, roofRight, 38, 0.36);

                    // Cascading Waterfall feature from Mid Cube into the Reflecting Pool
                    this.draw3DQuad(
                        ctx,
                        { x: poolX - 3.5, y: poolY - poolRy + 1, z: 7.5 },
                        { x: poolX + 3.5, y: poolY - poolRy + 1, z: 7.5 },
                        { x: poolX + 3.5, y: poolY - poolRy + 1, z: 18.5 },
                        { x: poolX - 3.5, y: poolY - poolRy + 1, z: 18.5 },
                        '#bae6fd', 60, 0.7, null
                    );

                    this.drawIsoLightSpill(ctx, c1x, c1y + s * 0.65, 8.5, 15, 10, 0.48);
                }
            }

            // 1. FARM: Terraced Permaculture Fields, Irrigated Water Channels, Glass Orangerie & Dual-Rotor Aero-Turbine
            drawDesignerFarm3DIso(ctx, b) {
                const wx = b.x, wy = b.y;
                const isPlayer = b.faction === 'player';
                const accentTop = isPlayer ? '#3b82f6' : '#ef4444';
                const accentDark = isPlayer ? '#1d4ed8' : '#b91c1c';

                // Stepped Contour Stone Plinth
                this.drawIsoBox(ctx, wx, wy, 0, 29, 29, 3.0, '#78716c', '#57534e', '#44403c', 'rgba(20,16,12,0.4)', 14, 0.1);
                if (!b.completed) return;

                // 3 Cascading Agricultural Contour Terraces (stepping up from South-East to North-West)
                const terraces = [
                    { ox: 7, oy: 7, rx: 20, ry: 20, z: 3.0, h: 2.5 },
                    { ox: 0, oy: 0, rx: 19, ry: 19, z: 5.5, h: 2.5 },
                    { ox: -6, oy: -6, rx: 16, ry: 16, z: 8.0, h: 2.5 }
                ];
                terraces.forEach((t, idx) => {
                    this.drawIsoBox(ctx, wx + t.ox, wy + t.oy, t.z, t.rx, t.ry, t.h, '#5c3818', '#44403c', '#292524', 'rgba(0,0,0,0.35)', 12, 0.08);
                    // Glowing Hydro-Irrigation Canal along terrace edge
                    this.draw3DQuad(
                        ctx,
                        { x: wx + t.ox - t.rx * 0.9, y: wy + t.oy + t.ry * 0.72, z: t.z + t.h + 0.2 },
                        { x: wx + t.ox + t.rx * 0.9, y: wy + t.oy + t.ry * 0.72, z: t.z + t.h + 0.2 },
                        { x: wx + t.ox + t.rx * 0.9, y: wy + t.oy + t.ry * 0.92, z: t.z + t.h + 0.2 },
                        { x: wx + t.ox - t.rx * 0.9, y: wy + t.oy + t.ry * 0.92, z: t.z + t.h + 0.2 },
                        '#0ea5e9', 60, 0.7, null
                    );
                    // Lush Golden Wheat & Botanical Strips swaying on each terrace
                    const sway = Math.sin(this.gameTime * 2.8 + idx + b.id) * 0.8;
                    for (let s = -t.ry * 0.55; s <= t.ry * 0.45; s += 5.5) {
                        const wheatCol = idx === 2 ? '#eab308' : '#facc15';
                        this.drawIsoBox(ctx, wx + t.ox + sway, wy + t.oy + s, t.z + t.h, t.rx * 0.86, 1.8, 3.6, '#fde047', wheatCol, '#ca8a04', null, 22, 0.18);
                    }
                });

                // Translucent Geodesic Glass Orangerie / Conservatory on the East Terrace
                const gx = wx + 11, gy = wy - 8, gz = 5.5;
                this.drawIsoBox(ctx, gx, gy, gz, 7.5, 9.5, 11.5, '#38bdf8', '#0284c7', '#0369a1', '#1e293b', 55, 0.65);
                this.draw3DGlassPanel(
                    ctx,
                    { x: gx - 6.8, y: gy + 9.7, z: gz + 1 },
                    { x: gx + 6.8, y: gy + 9.7, z: gz + 1 },
                    { x: gx + 6.8, y: gy + 9.7, z: gz + 11 },
                    { x: gx - 6.8, y: gy + 9.7, z: gz + 11 }
                );
                // Faceted Glass Prism Roof over Conservatory
                const gPeakFront = { x: gx, y: gy + 9.5, z: gz + 17.5 };
                const gPeakBack = { x: gx, y: gy - 9.5, z: gz + 17.5 };
                this.draw3DQuad(
                    ctx,
                    { x: gx - 7.8, y: gy - 9.5, z: gz + 11.5 },
                    { x: gx - 7.8, y: gy + 9.5, z: gz + 11.5 },
                    gPeakFront, gPeakBack,
                    '#7dd3fc', 64, 0.75, '#1e293b'
                );
                this.draw3DQuad(
                    ctx,
                    gPeakBack, gPeakFront,
                    { x: gx + 7.8, y: gy + 9.5, z: gz + 11.5 },
                    { x: gx + 7.8, y: gy - 9.5, z: gz + 11.5 },
                    '#38bdf8', 64, 0.75, '#1e293b'
                );
                this.drawIsoLightSpill(ctx, gx, gy + 11, gz + 0.5, 10, 7, 0.42);

                // Sculptural Kinetic Aero-Tower on the High North-West Terrace
                const tx = wx - 14, ty = wy - 12, tz = 10.5;
                this.drawSoftProjectedShadow(ctx, tx, ty, 9, 36);
                this.drawIsoCylinder(ctx, tx, ty, tz, 6.8, 24, '#f5f5f4', '#e7dac6', '#a89f91', '#334155', 8, 4.2);
                this.drawIsoPolyDome(ctx, tx, ty, tz + 24, 5.5, 5.5, 7.5, accentTop, 2, 8, 38, 0.4);

                // Counter-Rotating Sculptural Copper & White Wind Foil Sails
                const hub = this.worldToIso(tx + 4, ty + 4, tz + 21);
                ctx.save();
                ctx.translate(hub.x, hub.y);
                ctx.rotate(this.gameTime * 2.2);
                for (let blade = 0; blade < 6; blade++) {
                    ctx.rotate(Math.PI / 3);
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.quadraticCurveTo(8, -4, 15, 0);
                    ctx.stroke();
                    ctx.fillStyle = blade % 2 === 0 ? 'rgba(254, 243, 199, 0.82)' : accentDark;
                    ctx.beginPath();
                    ctx.moveTo(3, 0);
                    ctx.lineTo(14, -3.5);
                    ctx.lineTo(14, 1.5);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            // 2. TOWNCENTER: Neo-Classical Civic Agora, Twin Reflecting Pools, Sky-Bridge & Geodesic Golden Dome
            drawDesignerTownCenter3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const s = r * 1.12;

                // 1. Multi-Tiered Travertine & Obsidian Civic Plaza
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.12, s * 1.12, 4.0, '#44403c', '#292524', '#1c1917', 'rgba(0,0,0,0.45)', 16, 0.12);
                this.drawIsoBox(ctx, wx - 1, wy - 1, 4.0, s * 1.02, s * 1.02, 4.5, '#f5f5f4', '#e7e5e4', '#a8a29e', 'rgba(20,16,12,0.3)', 24, 0.2);

                // Grand Ceremonial Entrance Staircase (South-West Plaza Edge)
                for (let st = 0; st < 4; st++) {
                    this.drawIsoBox(ctx, wx, wy + s * 1.04 + (3 - st) * 2.2, st * 2.0, s * 0.34, 1.6, 2.0, '#ffffff', '#e7e5e4', '#78716c', null, 24, 0.2);
                }

                // Twin Illuminated Azure Reflecting Pools flanking the Forum Plaza
                const shimmer = 0.5 + 0.5 * Math.sin(this.gameTime * 3.5 + b.id);
                const poolCol = shimmer > 0.5 ? '#38bdf8' : '#0284c7';
                [[-s * 0.62, s * 0.58], [s * 0.62, s * 0.58]].forEach(([px, py]) => {
                    this.drawIsoBox(ctx, wx + px, wy + py, 5.0, s * 0.26, s * 0.28, 4.2, '#cbd5e1', '#94a3b8', '#475569', null, 28, 0.25);
                    this.draw3DQuad(
                        ctx,
                        { x: wx + px - s * 0.23, y: wy + py - s * 0.25, z: 9.3 },
                        { x: wx + px + s * 0.23, y: wy + py - s * 0.25, z: 9.3 },
                        { x: wx + px + s * 0.23, y: wy + py + s * 0.25, z: 9.3 },
                        { x: wx + px - s * 0.23, y: wy + py + s * 0.25, z: 9.3 },
                        poolCol, 64, 0.8, 'rgba(224,242,254,0.6)'
                    );
                });

                // 2. Sweeping Cantilevered Council Atrium Wing (West / Left)
                const cx = wx - s * 0.26, cy = wy - s * 0.14;
                this.drawIsoBox(ctx, cx, cy, 8.5, s * 0.56, s * 0.62, 24.0, '#f8fafc', '#e7dac6', '#a89f91', '#334155', 24, 0.2);
                this.draw3DGlassPanel(
                    ctx,
                    { x: cx - s * 0.48, y: cy + s * 0.63, z: 10.5 },
                    { x: cx + s * 0.48, y: cy + s * 0.63, z: 10.5 },
                    { x: cx + s * 0.48, y: cy + s * 0.63, z: 30.5 },
                    { x: cx - s * 0.48, y: cy + s * 0.63, z: 30.5 }
                );

                // Sculptural Folded Wing Roof over Council Hall
                const cZ = 32.5;
                this.draw3DTri(
                    ctx,
                    { x: cx - s * 0.64, y: cy - s * 0.68, z: cZ + 6 },
                    { x: cx - s * 0.64, y: cy + s * 0.68, z: cZ + 6 },
                    { x: cx + s * 0.58, y: cy, z: cZ + 18 },
                    roofTop, 38, 0.38
                );
                this.draw3DTri(
                    ctx,
                    { x: cx - s * 0.64, y: cy + s * 0.68, z: cZ + 6 },
                    { x: cx + s * 0.58, y: cy + s * 0.68, z: cZ },
                    { x: cx + s * 0.58, y: cy, z: cZ + 18 },
                    roofLeft, 38, 0.38
                );

                // 3. Monumental Central Rotunda & Faceted Golden-Crystal Geodesic Dome
                const rx = wx - s * 0.04, ry = wy - s * 0.08, rotR = s * 0.48;
                this.drawIsoCylinder(ctx, rx, ry, 8.5, rotR, 26.0, '#f8fafc', '#f1f5f9', '#94a3b8', '#334155', 12, rotR * 0.94);
                // 360-degree Illuminated Clerestory Drum
                this.drawIsoCylinder(ctx, rx, ry, 34.5, rotR * 0.92, 9.5, '#fef08a', '#38bdf8', '#fbbf24', '#1e293b', 12, rotR * 0.96);
                // Cantilevered Cornice Ring
                this.drawIsoCylinder(ctx, rx, ry, 44.0, rotR * 1.12, 3.2, '#ffffff', '#e2e8f0', '#64748b', '#1e293b', 12, rotR * 1.08);
                // Soaring Faceted Golden Geodesic Dome
                this.drawIsoPolyDome(ctx, rx, ry, 47.2, rotR * 1.02, rotR * 1.02, 22.0, '#eab308', 4, 12, 55, 0.68);
                // Crown Lantern & Spire
                this.drawIsoCylinder(ctx, rx, ry, 68.5, rotR * 0.25, 8.0, '#fef08a', '#fde047', '#ca8a04', '#422006', 8, rotR * 0.2);
                this.drawIsoCone(ctx, rx, ry, 76.5, rotR * 0.3, 12.0, roofTop, roofRight, 8, 48, 0.5);

                // 4. Classical Marble Colonnade Portico on South-Front
                for (let col = -2; col <= 2; col++) {
                    const colX = wx + col * (s * 0.18);
                    const colY = wy + s * 0.46;
                    this.drawIsoCylinder(ctx, colX, colY, 8.5, 2.6, 18.0, '#ffffff', '#f5f5f4', '#a8a29e', null, 6, 2.2);
                }
                // Cantilevered Portico Canopy
                this.drawIsoBox(ctx, wx, wy + s * 0.46, 26.5, s * 0.44, 5.5, 3.2, '#ffffff', roofLeft, roofRight, '#1e293b', 30, 0.25);

                // 5. East Astronomical Clock & Bell Tower connected by Glazed Sky-Bridge
                const tx = wx + s * 0.56, ty = wy - s * 0.18;
                // Elevated Glass Sky-Bridge
                this.drawIsoBox(ctx, (rx + tx) * 0.5, (ry + ty) * 0.5, 24.0, s * 0.28, 4.5, 6.5, '#e2e8f0', '#38bdf8', '#0284c7', '#1e293b', 50, 0.55);
                // Tall Slender Campanile Tower
                this.drawIsoBox(ctx, tx, ty, 8.5, 9.5, 9.5, 42.0, '#f8fafc', '#e7dac6', '#94a3b8', '#334155', 24, 0.2);
                this.drawIsoPyramidRoof(ctx, tx, ty, 50.5, 11.5, 11.5, 18.0, roofTop, roofRight, '#1e293b', 8);

                this.drawIsoLightSpill(ctx, wx, wy + s * 0.62, 8.8, 22, 14, 0.52);
            }

            // 3. BARRACKS: Deconstructivist Basalt & Corten-Steel War Academy with Sawtooth Titanium Roof & Arena
            drawDesignerBarracks3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const s = r * 1.08;

                // 1. Fortified Battered Obsidian & Basalt Plinth
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.1, s * 1.1, 5.5, '#334155', '#1e293b', '#0f172a', 'rgba(0,0,0,0.5)', 20, 0.18);

                // Sunken Crimson-Ochre Training Arena on South-East Quadrant
                const ax = wx + s * 0.34, ay = wy + s * 0.32;
                this.drawIsoBox(ctx, ax, ay, 5.5, s * 0.52, s * 0.52, 1.8, '#b45309', '#92400e', '#78350f', '#1e293b', 14, 0.1);
                // 3D Combat Dummies & Weapon Racks in Arena
                [[-7, -5], [6, 5]].forEach(([dx, dy]) => {
                    this.drawIsoCylinder(ctx, ax + dx, ay + dy, 7.3, 2.4, 8.5, '#fde047', '#d97706', '#78350f', null, 6, 2.0);
                    this.drawIsoBox(ctx, ax + dx, ay + dy, 12.0, 4.2, 1.2, 1.5, '#cbd5e1', '#94a3b8', '#475569', null, 35, 0.4);
                });

                // 2. Monolithic Main Hall (North-West) with Slanted Armor Cladding
                const hx = wx - s * 0.22, hy = wy - s * 0.18;
                const hrx = s * 0.64, hry = s * 0.68;
                this.drawIsoBox(ctx, hx, hy, 5.5, hrx, hry, 24.0, '#475569', '#334155', '#1e293b', '#0f172a', 28, 0.28);

                // Glowing Forge-Fire Ribbon Window along Lower Wall
                this.draw3DGlassPanel(
                    ctx,
                    { x: hx - hrx * 0.85, y: hy + hry + 0.35, z: 8.0 },
                    { x: hx + hrx * 0.85, y: hy + hry + 0.35, z: 8.0 },
                    { x: hx + hrx * 0.85, y: hy + hry + 0.35, z: 16.5 },
                    { x: hx - hrx * 0.85, y: hy + hry + 0.35, z: 16.5 },
                    '#451a03'
                );

                // 3. Dramatic Cantilevered Corten-Bronze Command Bridge projecting over the Arena
                const bx = wx + s * 0.18, by = wy + s * 0.16;
                // Cast deep shadow under the bridge onto the arena
                this.draw3DQuad(
                    ctx,
                    { x: bx - s * 0.45, y: by - s * 0.32, z: 7.5 },
                    { x: bx + s * 0.48, y: by - s * 0.32, z: 7.5 },
                    { x: bx + s * 0.48, y: by + s * 0.38, z: 7.5 },
                    { x: bx - s * 0.45, y: by + s * 0.38, z: 7.5 },
                    '#090705', 0, 0, null
                );
                this.drawIsoBox(ctx, bx, by, 19.5, s * 0.56, s * 0.36, 11.5, '#d97706', '#b45309', '#78350f', '#1e293b', 32, 0.3);
                this.draw3DGlassPanel(
                    ctx,
                    { x: bx - s * 0.46, y: by + s * 0.37, z: 21.5 },
                    { x: bx + s * 0.46, y: by + s * 0.37, z: 21.5 },
                    { x: bx + s * 0.46, y: by + s * 0.37, z: 29.0 },
                    { x: bx - s * 0.46, y: by + s * 0.37, z: 29.0 }
                );

                // 4. Jagged 3-Peak Sawtooth / Folded-Plate Designer Roof over Main Hall
                const rz = 29.5;
                const bayW = (hrx * 2) / 3;
                for (let i = 0; i < 3; i++) {
                    const x0 = hx - hrx + i * bayW;
                    const x1 = x0 + bayW;
                    const xPeak = x0 + bayW * 0.28;
                    const zPeak = rz + 14.5 - i * 1.5;

                    const pBL = { x: x0, y: hy - hry, z: rz };
                    const pFL = { x: x0, y: hy + hry, z: rz };
                    const pBR = { x: x1, y: hy - hry, z: rz };
                    const pFR = { x: x1, y: hy + hry, z: rz };
                    const rBack = { x: xPeak, y: hy - hry, z: zPeak };
                    const rFront = { x: xPeak, y: hy + hry, z: zPeak };

                    // Steep glazed/faction north-west face
                    this.draw3DQuad(ctx, pBL, pFL, rFront, rBack, roofTop, 42, 0.45, '#0f172a');
                    // Long metallic slate south-east slope
                    this.draw3DQuad(ctx, rBack, rFront, pFR, pBR, roofRight, 38, 0.4, '#0f172a');
                    // Front sawtooth gable triangle
                    this.draw3DTri(ctx, pFL, pFR, rFront, '#cbd5e1', 30, 0.3, '#1e293b');
                }

                // Warm Forge Glow spilling onto the Combat Arena
                this.drawIsoLightSpill(ctx, ax - 4, ay + 4, 7.6, 15, 11, 0.46);
            }

            // 4. ARCHERY: Sweeping Parabolic Glulam-Timber Shell Roof, Water Moat & Illuminated Targets
            drawDesignerArchery3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const s = r * 1.08;

                // 1. Limestone Terrace & Azure Target Reflection Moat
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.1, s * 1.1, 4.5, '#e7e5e4', '#d6d3d1', '#78716c', 'rgba(20,16,12,0.35)', 20, 0.16);

                // Long Reflecting Water Moat separating Shooting Deck from Targets
                const mx = wx + s * 0.22, my = wy;
                this.drawIsoBox(ctx, mx, my, 2.5, s * 0.22, s * 0.88, 3.0, '#0284c7', '#0369a1', '#075985', null, 50, 0.6);
                this.draw3DQuad(
                    ctx,
                    { x: mx - s * 0.19, y: my - s * 0.84, z: 5.6 },
                    { x: mx + s * 0.19, y: my - s * 0.84, z: 5.6 },
                    { x: mx + s * 0.19, y: my + s * 0.84, z: 5.6 },
                    { x: mx - s * 0.19, y: my + s * 0.84, z: 5.6 },
                    '#38bdf8', 64, 0.78, 'rgba(186,230,253,0.5)'
                );

                // 3D Illuminated Bullseye Targets along East Bank
                for (let t = -1; t <= 1; t++) {
                    const ty = wy + t * (s * 0.54);
                    const tx = wx + s * 0.72;
                    this.drawIsoBox(ctx, tx, ty, 4.5, 2.5, 4.5, 11.0, '#fde047', roofLeft, '#78350f', '#1e293b', 24, 0.2);
                }

                // 2. Glazed Archers' Gallery & Cedar Shooting Deck (West Side)
                const gx = wx - s * 0.34, gy = wy;
                this.drawIsoBox(ctx, gx, gy, 4.5, s * 0.48, s * 0.82, 15.0, '#f5f5f4', '#d97706', '#92400e', '#1e293b', 24, 0.2);
                this.draw3DGlassPanel(
                    ctx,
                    { x: gx - s * 0.42, y: gy + s * 0.83, z: 6.0 },
                    { x: gx + s * 0.42, y: gy + s * 0.83, z: 6.0 },
                    { x: gx + s * 0.42, y: gy + s * 0.83, z: 18.0 },
                    { x: gx - s * 0.42, y: gy + s * 0.83, z: 18.0 }
                );

                // 3. Soaring Sweeping Parabolic Shell Roof (built from 6 curved/stepped 3D quad segments!)
                const segs = 6;
                const yMin = wy - s * 0.92, yMax = wy + s * 0.92;
                const xStart = wx - s * 0.88, xEnd = wx + s * 0.36;
                for (let i = 0; i < segs; i++) {
                    const t0 = i / segs;
                    const t1 = (i + 1) / segs;
                    const x0 = xStart + (xEnd - xStart) * t0;
                    const x1 = xStart + (xEnd - xStart) * t1;
                    // Parabolic arch profile that rises dramatically toward the East firing line
                    const z0 = 18.5 + Math.sin(t0 * Math.PI * 0.82) * 22.0;
                    const z1 = 18.5 + Math.sin(t1 * Math.PI * 0.82) * 22.0;

                    const col = i % 2 === 0 ? roofTop : roofLeft;
                    this.draw3DQuad(
                        ctx,
                        { x: x0, y: yMin, z: z0 },
                        { x: x0, y: yMax, z: z0 },
                        { x: x1, y: yMax, z: z1 },
                        { x: x1, y: yMin, z: z1 },
                        col, 38, 0.36, 'rgba(15,23,42,0.32)'
                    );
                    // Exposed Glulam Timber Arch Rib along the South-West Front
                    this.draw3DQuad(
                        ctx,
                        { x: x0, y: yMax + 0.4, z: z0 - 2.2 },
                        { x: x1, y: yMax + 0.4, z: z1 - 2.2 },
                        { x: x1, y: yMax + 0.4, z: z1 },
                        { x: x0, y: yMax + 0.4, z: z0 },
                        '#f59e0b', 28, 0.25, null
                    );
                }

                this.drawIsoLightSpill(ctx, mx - 6, my + s * 0.3, 5.8, 16, 11, 0.45);
            }

            // 5. STABLE: Curved Equestrian Hippodrome, Vaulted Copper-Cedar Stalls, Rotunda & Dressage Paddock
            drawDesignerStable3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const s = r * 1.1;

                // 1. Groomed Golden-Sand Hippodrome Arena & Stone Podium
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.08, s * 1.08, 4.0, '#d6c7b2', '#a89f91', '#78716c', 'rgba(20,16,12,0.35)', 16, 0.12);

                // White & Cedar Equestrian Paddock Fencing + Show-Jumping Obstacles (South-East)
                const px = wx + s * 0.28, py = wy + s * 0.28;
                this.drawIsoBox(ctx, px, py + s * 0.56, 4.0, s * 0.52, 1.4, 4.2, '#ffffff', '#e7e5e4', '#94a3b8', null, 20, 0.15);
                this.drawIsoBox(ctx, px + s * 0.52, py, 4.0, 1.4, s * 0.56, 4.2, '#ffffff', '#e7e5e4', '#94a3b8', null, 20, 0.15);
                // Show-jump hurdle inside arena
                this.drawIsoBox(ctx, px, py, 4.0, 8.5, 1.2, 4.5, roofTop, '#ffffff', roofRight, null, 24, 0.2);

                // 2. Luxury Cedar & Limestone Stall Wing (North-West) with Barrel-Vaulted Roof
                const sx = wx - s * 0.24, sy = wy - s * 0.22;
                const srx = s * 0.66, sry = s * 0.54;
                this.drawIsoBox(ctx, sx, sy, 4.0, srx, sry, 18.0, '#f5f5f4', '#b45309', '#78350f', '#1e293b', 24, 0.2);

                // Illuminated Glazed Stall Doors & Hayloft Clerestory
                this.draw3DGlassPanel(
                    ctx,
                    { x: sx - srx * 0.78, y: sy + sry + 0.35, z: 5.5 },
                    { x: sx + srx * 0.78, y: sy + sry + 0.35, z: 5.5 },
                    { x: sx + srx * 0.78, y: sy + sry + 0.35, z: 19.5 },
                    { x: sx - srx * 0.78, y: sy + sry + 0.35, z: 19.5 }
                );

                // Multi-Faceted Barrel-Vaulted Roof with Central Skylight Spine
                const vZ = 22.0;
                this.drawIsoGableRoof(ctx, sx, sy, vZ, srx * 1.12, sry * 1.12, 18.0, roofTop, roofRight, '#d97706');
                this.draw3DGlassPanel(
                    ctx,
                    { x: sx - srx * 0.25, y: sy + sry * 1.05, z: vZ + 12 },
                    { x: sx + srx * 0.25, y: sy + sry * 1.05, z: vZ + 12 },
                    { x: sx + srx * 0.25, y: sy - sry * 1.05, z: vZ + 12 },
                    { x: sx - srx * 0.25, y: sy - sry * 1.05, z: vZ + 12 }
                );

                // 3. Circular Equestrian Lunging Rotunda Pavilion (South-West Corner)
                const lx = wx - s * 0.38, ly = wy + s * 0.38, lr = s * 0.44;
                this.drawIsoCylinder(ctx, lx, ly, 4.0, lr, 14.5, '#f5f5f4', '#d97706', '#78350f', '#1e293b', 10, lr * 0.96);
                this.drawIsoCylinder(ctx, lx, ly, 18.5, lr * 1.02, 5.5, '#fef08a', '#38bdf8', '#fbbf24', '#1e293b', 10, lr * 1.04);
                this.drawIsoCone(ctx, lx, ly, 24.0, lr * 1.16, 16.5, roofLeft, roofRight, 10, 36, 0.35);

                this.drawIsoLightSpill(ctx, px - 4, py - 2, 4.4, 16, 12, 0.48);
            }

            // 6. TOWER: Stepped Obsidian & Marble Sentinel Obelisk with Cantilevered Sky-Rings & Levitating Prism Crystal
            drawDesignerTower3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const tr = r * 0.92;

                // 1. Flared Octagonal Obsidian & Slate Bastion Base
                this.drawIsoCylinder(ctx, wx, wy, 0, tr * 1.24, 12.0, '#475569', '#334155', '#0f172a', '#090d16', 8, tr * 1.02);

                // 4 Angled Structural Flying Buttress Fins
                const finAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
                finAngles.forEach(a => {
                    const ca = Math.cos(a), sa = Math.sin(a);
                    this.draw3DTri(
                        ctx,
                        { x: wx + ca * tr * 1.38, y: wy + sa * tr * 1.38, z: 0 },
                        { x: wx + ca * tr * 0.85, y: wy + sa * tr * 0.85, z: 0 },
                        { x: wx + ca * tr * 0.78, y: wy + sa * tr * 0.78, z: 38.0 },
                        roofLeft, 34, 0.32, '#0f172a'
                    );
                });

                // 2. Three Tapered Polygonal Tower Tiers separated by Glowing Cantilevered Sky-Decks
                const tiers = [
                    { z: 12.0, h: 18.0, rBot: tr * 0.96, rTop: tr * 0.82 },
                    { z: 33.5, h: 16.5, rBot: tr * 0.80, rTop: tr * 0.68 },
                    { z: 53.5, h: 14.5, rBot: tr * 0.66, rTop: tr * 0.54 }
                ];
                tiers.forEach(t => {
                    // Main marble/travertine shaft tier
                    this.drawIsoCylinder(ctx, wx, wy, t.z, t.rBot, t.h, '#f8fafc', '#e2e8f0', '#94a3b8', '#1e293b', 8, t.rTop);
                    // Glowing panoramic observation band + cantilevered ring
                    this.drawIsoCylinder(ctx, wx, wy, t.z + t.h, t.rTop * 1.24, 3.5, '#fef08a', '#38bdf8', roofTop, '#0f172a', 8, t.rTop * 1.18);
                });

                // 3. Levitating 3D Octahedron Sentinel Crystal at the Summit (z = 72..98)
                const bob = Math.sin(this.gameTime * 3.8 + b.id) * 2.8;
                const cz = 82.0 + bob;
                const cr = tr * 0.52;
                const cBot = { x: wx, y: wy, z: cz - 10.5 };
                const cTop = { x: wx, y: wy, z: cz + 12.5 };
                const ring = [
                    { x: wx - cr, y: wy, z: cz },
                    { x: wx, y: wy + cr, z: cz },
                    { x: wx + cr, y: wy, z: cz },
                    { x: wx, y: wy - cr, z: cz }
                ];
                for (let i = 0; i < 4; i++) {
                    const next = (i + 1) % 4;
                    this.draw3DTri(ctx, ring[i], ring[next], cTop, '#38bdf8', 64, 0.85, '#e0f2fe');
                    this.draw3DTri(ctx, ring[next], ring[i], cBot, roofTop, 64, 0.85, '#e0f2fe');
                }
            }

            // 7. CASTLE: Monumental Star-Citadel, Illuminated Azure Moat, Sky-Bridge & Flying-Buttress Cathedral Keep
            drawDesignerCastle3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                const s = r * 1.06;

                // 1. Battered Star-Fortress Glacis & Illuminated Azure Moat Channel
                this.drawIsoBox(ctx, wx, wy, 0, s * 1.16, s * 1.16, 5.0, '#475569', '#334155', '#1e293b', 'rgba(0,0,0,0.5)', 18, 0.14);
                // Shimmering Water Moat on Top of Outer Glacis
                this.draw3DQuad(
                    ctx,
                    { x: wx - s * 1.08, y: wy - s * 1.08, z: 5.2 },
                    { x: wx + s * 1.08, y: wy - s * 1.08, z: 5.2 },
                    { x: wx + s * 1.08, y: wy + s * 1.08, z: 5.2 },
                    { x: wx - s * 1.08, y: wy + s * 1.08, z: 5.2 },
                    '#0284c7', 64, 0.75, '#38bdf8'
                );
                // Inner Citadel Island Bastion
                this.drawIsoBox(ctx, wx, wy, 5.2, s * 0.94, s * 0.94, 8.0, '#e2e8f0', '#cbd5e1', '#64748b', '#1e293b', 22, 0.18);

                // Monumental Viaduct Drawbridge crossing the South-West Moat
                this.drawIsoBox(ctx, wx, wy + s * 1.02, 5.2, s * 0.24, s * 0.22, 6.5, '#f8fafc', '#d97706', '#78350f', '#1e293b', 22, 0.18);

                // 2. Sculpted Curtain Walls & Glazed Command Galleries
                this.drawIsoBox(ctx, wx, wy, 13.2, s * 0.82, s * 0.82, 28.0, '#f8fafc', '#e2e8f0', '#94a3b8', '#1e293b', 24, 0.2);
                this.drawIsoBattlements(ctx, wx, wy, 41.2, s * 0.84, s * 0.84, 5.0, '#f1f5f9');

                // 3. Soaring Cathedral-Keep (Bergfried) with Flying Buttresses & Stained-Glass Rose/Lancet Windows
                const kx = wx - 3, ky = wy - 3, kr = s * 0.46;
                this.drawIsoBox(ctx, kx, ky, 41.2, kr, kr, 38.0, '#ffffff', '#f1f5f9', '#94a3b8', '#1e293b', 28, 0.25);

                // Tall Illuminated Lancet Glass Windows on Keep Faces
                this.draw3DGlassPanel(
                    ctx,
                    { x: kx - kr * 0.55, y: ky + kr + 0.4, z: 45.0 },
                    { x: kx + kr * 0.55, y: ky + kr + 0.4, z: 45.0 },
                    { x: kx + kr * 0.55, y: ky + kr + 0.4, z: 74.0 },
                    { x: kx - kr * 0.55, y: ky + kr + 0.4, z: 74.0 }
                );
                this.draw3DGlassPanel(
                    ctx,
                    { x: kx + kr + 0.4, y: ky + kr * 0.55, z: 45.0 },
                    { x: kx + kr + 0.4, y: ky - kr * 0.55, z: 45.0 },
                    { x: kx + kr + 0.4, y: ky - kr * 0.55, z: 74.0 },
                    { x: kx + kr + 0.4, y: ky + kr * 0.55, z: 74.0 }
                );

                // 4 Architectural Flying Buttress Arches bracing the Cathedral Keep
                [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([bx, by]) => {
                    this.draw3DTri(
                        ctx,
                        { x: kx + bx * kr * 1.65, y: ky + by * kr * 1.65, z: 41.2 },
                        { x: kx + bx * kr * 1.02, y: ky + by * kr * 1.02, z: 41.2 },
                        { x: kx + bx * kr * 1.02, y: ky + by * kr * 1.02, z: 72.0 },
                        '#cbd5e1', 30, 0.28, '#334155'
                    );
                });

                // Crown Gallery & Towering Multi-Faceted Spire on Keep
                this.drawIsoCylinder(ctx, kx, ky, 79.2, kr * 0.88, 12.0, '#fef08a', '#f8fafc', '#94a3b8', '#1e293b', 10, kr * 0.72);
                this.drawIsoCone(ctx, kx, ky, 91.2, kr * 0.96, 30.0, roofTop, roofRight, 10, 46, 0.48);

                // 4. Four Asymmetric Polygonal Corner Turrets with Sky-Lanterns & Spires
                const tcOff = s * 0.84;
                const cornerDefs = [
                    [-tcOff, -tcOff, 46],
                    [tcOff, -tcOff, 50],
                    [-tcOff, tcOff, 52],
                    [tcOff, tcOff, 48]
                ];
                cornerDefs.forEach(([ox, oy, th]) => {
                    this.drawIsoCylinder(ctx, wx + ox, wy + oy, 13.2, 11.0, th, '#f8fafc', '#e2e8f0', '#64748b', '#1e293b', 10, 9.5);
                    this.drawIsoCylinder(ctx, wx + ox, wy + oy, 13.2 + th, 12.8, 5.5, '#fef08a', '#38bdf8', roofLeft, '#0f172a', 10, 12.5);
                    this.drawIsoCone(ctx, wx + ox, wy + oy, 18.7 + th, 13.5, 22.0, roofTop, roofRight, 10, 40, 0.38);
                });

                // High Glazed Sky-Bridge linking the two Southern Front Turrets
                this.drawIsoBox(ctx, wx, wy + tcOff, 46.0, tcOff * 0.78, 4.2, 7.5, '#f8fafc', '#38bdf8', '#0284c7', '#1e293b', 55, 0.65);
                this.drawIsoLightSpill(ctx, wx, wy + s * 0.98, 12.0, 22, 14, 0.5);
            }

            // Holzfällerlager (Lumber Camp) with stacked cut timber logs, open timber shed and axe stump
            drawDesignerLumberCamp3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                this.drawIsoGroundEllipse(ctx, wx, wy, r * 1.05, '#854d0e', 1.8, 'rgba(161, 98, 7, 0.25)');
                this.drawIsoBox(ctx, wx, wy, 0, r * 0.82, r * 0.72, 3.8, '#78350f', '#451a03', '#291003');
                this.drawIsoBox(ctx, wx - 2, wy - 2, 3.8, r * 0.72, r * 0.62, 13.5, '#b45309', '#92400e', '#78350f');
                this.drawIsoCone(ctx, wx - 2, wy - 2, 17.0, r * 0.88, 13.5, roofTop, roofRight, 4, 25, 0.28);
                const logOff = r * 0.42;
                [[-logOff, logOff, 0], [-logOff + 3, logOff + 3, 4], [-logOff - 3, logOff + 2, 8]].forEach(([lx, ly, lz]) => {
                    this.drawIsoCylinder(ctx, wx + lx, wy + ly, lz, 3.5, 14.0, '#a16207', '#78350f', '#451a03', null, 6, 3.2);
                });
                const stp = this.worldToIso(wx + r * 0.45, wy - r * 0.2, 5.0);
                ctx.fillStyle = '#78350f';
                ctx.fillRect(stp.x - 3, stp.y - 3, 6, 6);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(stp.x - 1, stp.y - 8, 3, 6);
            }

            // Bergbaulager (Mining Camp) with rough stone masonry, ore carts and gleaming gold/stone piles
            drawDesignerMiningCamp3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                this.drawIsoGroundEllipse(ctx, wx, wy, r * 1.05, '#78716c', 1.8, 'rgba(120, 113, 108, 0.25)');
                this.drawIsoBox(ctx, wx, wy, 0, r * 0.84, r * 0.74, 12.0, '#d6d3d1', '#a8a29e', '#78716c');
                this.drawIsoCone(ctx, wx, wy, 12.0, r * 0.9, 12.5, roofTop, roofRight, 4, 30, 0.32);
                this.drawIsoBox(ctx, wx + r * 0.45, wy + r * 0.35, 0, 7.5, 5.5, 4.5, '#eab308', '#ca8a04', '#a16207');
                this.drawIsoBox(ctx, wx - r * 0.45, wy - r * 0.25, 0, 6.0, 5.0, 4.0, '#cbd5e1', '#94a3b8', '#64748b');
                const pickPos = this.worldToIso(wx - r * 0.5, wy + r * 0.4, 0);
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(pickPos.x, pickPos.y);
                ctx.lineTo(pickPos.x + 4, pickPos.y - 12);
                ctx.stroke();
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(pickPos.x + 1, pickPos.y - 10);
                ctx.lineTo(pickPos.x + 7, pickPos.y - 14);
                ctx.stroke();
            }

            // Mühle (Mill) with octagonal stone masonry base, timber millhouse and animated rotating sails
            drawDesignerMill3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                this.drawIsoGroundEllipse(ctx, wx, wy, r * 1.08, '#a16207', 1.5, 'rgba(202, 138, 4, 0.2)');
                this.drawIsoCylinder(ctx, wx, wy, 0, r * 0.78, 13.0, '#d6d3d1', '#a8a29e', '#78716c', null, 8);
                this.drawIsoCylinder(ctx, wx, wy, 13.0, r * 0.65, 11.0, '#b45309', '#92400e', '#78350f', null, 8);
                this.drawIsoCone(ctx, wx, wy, 24.0, r * 0.75, 15.0, roofTop, roofRight, 8, 35, 0.38);

                const hubPos = this.worldToIso(wx, wy + r * 0.68, 18.0);
                const sailRot = this.gameTime * 2.2;
                ctx.save();
                ctx.translate(hubPos.x, hubPos.y);
                for (let i = 0; i < 4; i++) {
                    const ang = sailRot + (i * Math.PI) / 2;
                    ctx.save();
                    ctx.rotate(ang);
                    ctx.strokeStyle = '#451a03';
                    ctx.lineWidth = 2.0;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, -22);
                    ctx.stroke();
                    ctx.fillStyle = '#fef3c7';
                    ctx.beginPath();
                    ctx.rect(1.5, -20, 6, 15);
                    ctx.fill();
                    ctx.restore();
                }
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                const sPos = this.worldToIso(wx - r * 0.4, wy + r * 0.5, 0);
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.ellipse(sPos.x, sPos.y, 4.5, 3.0, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Kloster (Monastery) with gothic ashlar stone chapel, arched window, bell tower & cross
            drawDesignerMonastery3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                this.drawIsoBox(ctx, wx, wy, 0, r * 0.88, r * 0.64, 21.0, '#f8fafc', '#cbd5e1', '#94a3b8');
                this.drawIsoCone(ctx, wx, wy, 21.0, r * 0.92, 17.0, '#334155', '#1e293b', 4, 45, 0.45);

                const twX = wx - r * 0.42;
                const twY = wy - r * 0.12;
                this.drawIsoBox(ctx, twX, twY, 0, 7.5, 7.5, 34.0, '#f1f5f9', '#94a3b8', '#64748b');
                this.drawIsoCone(ctx, twX, twY, 34.0, 8.5, 15.0, roofTop, roofRight, 4, 38, 0.42);

                const crossPos = this.worldToIso(twX, twY, 51.0);
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(crossPos.x, crossPos.y + 4); ctx.lineTo(crossPos.x, crossPos.y - 7);
                ctx.moveTo(crossPos.x - 4, crossPos.y - 3); ctx.lineTo(crossPos.x + 4, crossPos.y - 3);
                ctx.stroke();

                const winPos = this.worldToIso(wx, wy + r * 0.65, 12.0);
                ctx.fillStyle = '#38bdf8';
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(winPos.x, winPos.y, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Waffenschmiede (Blacksmith) with fieldstone walls, smoking brick chimney, glowing hearth & anvil
            drawDesignerBlacksmith3DIso(ctx, b, r, roofTop, roofLeft, roofRight) {
                const wx = b.x, wy = b.y;
                this.drawIsoBox(ctx, wx, wy, 0, r * 0.85, r * 0.72, 13.5, '#78716c', '#57534e', '#44403c');
                this.drawIsoCone(ctx, wx, wy, 13.5, r * 0.92, 13.0, '#ea580c', '#c2410c', 4, 30, 0.32);

                const chimX = wx - r * 0.48;
                const chimY = wy - r * 0.32;
                this.drawIsoBox(ctx, chimX, chimY, 0, 5.5, 5.5, 26.0, '#44403c', '#292524', '#1c1917');

                this.drawIsoBox(ctx, wx + r * 0.45, wy + r * 0.42, 0, 5.0, 4.0, 5.5, '#1e293b', '#0f172a', '#020617');
                const anvTop = this.worldToIso(wx + r * 0.45, wy + r * 0.42, 6.0);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(anvTop.x - 3.5, anvTop.y - 2, 7, 3);

                this.drawIsoLightSpill(ctx, chimX + 4, chimY + 4, 4.0, 16, 10, 0.65);
            }

            // Steinmauer (Stone Wall) with limestone crenellations, merlons and arrow slit
            drawDesignerWall3DIso(ctx, b, r) {
                const wx = b.x, wy = b.y;
                this.drawIsoBox(ctx, wx, wy, 0, r * 0.95, r * 0.95, 14.0, '#94a3b8', '#64748b', '#475569');
                const halfR = r * 0.45;
                [[-halfR, -halfR], [halfR, -halfR], [-halfR, halfR], [halfR, halfR]].forEach(([ox, oy]) => {
                    this.drawIsoBox(ctx, wx + ox, wy + oy, 14.0, 3.5, 3.5, 4.5, '#cbd5e1', '#94a3b8', '#64748b');
                });
                const slitPos = this.worldToIso(wx, wy + r * 0.85, 7.0);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(slitPos.x - 1, slitPos.y - 3, 2, 6);
            }

            parseHexColor(hex) {
                if (!this._colorCache) this._colorCache = {};
                if (this._colorCache[hex]) return this._colorCache[hex];
                const clean = (hex || '#888888').replace('#', '');
                const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
                const rgb = { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
                this._colorCache[hex] = rgb;
                return rgb;
            }

            // Computes realistic 3D Lambertian diffuse + Hemisphere Sky + AO + Blinn-Phong Specular lighting for a 3D surface normal
            computePolygonLitColor(baseHex, nx, ny, nz, worldZ = 15, shininess = 0, specStrength = 0) {
                const base = this.parseHexColor(baseHex);
                const nLen = Math.hypot(nx, ny, nz) || 1;
                nx /= nLen; ny /= nLen; nz /= nLen;

                // Directional sun vector (shining from top-left-front onto the isometric scene)
                const lx = -0.45, ly = 0.55, lz = 0.703;
                // Isometric camera view vector
                const vx = 0.577, vy = 0.577, vz = 0.577;
                // Halfway vector H for Blinn-Phong specular highlights
                const hx = 0.088, hy = 0.785, hz = 0.613;

                const dotNL = nx * lx + ny * ly + nz * lz;
                const diffuse = Math.max(0, dotNL) * 0.72;
                const bounceLight = Math.max(0, -dotNL) * 0.09; // Warm ground bounce into shadow side
                const skyHemisphere = 0.34 + 0.16 * (nz * 0.5 + 0.5);
                // Ambient Occlusion darkens polygons close to ground level (z = 0)
                const ao = Math.min(1.0, 0.72 + Math.max(0, worldZ) / 52 * 0.28);

                let lightIntensity = (skyHemisphere + diffuse + bounceLight) * ao;
                let spec = 0;
                if (shininess > 0 && dotNL > -0.1) {
                    const dotNH = Math.max(0, nx * hx + ny * hy + nz * hz);
                    spec = Math.pow(dotNH, shininess) * specStrength;
                }

                // Warm sunlight tint on lit surfaces, cool slate shadow tint on shaded surfaces
                const sunWarmthR = dotNL > 0 ? dotNL * 14 : dotNL * 8;
                const sunWarmthB = dotNL > 0 ? -dotNL * 6 : -dotNL * 14;

                const r = Math.min(255, Math.max(0, Math.round(base.r * lightIntensity + sunWarmthR + spec * 255)));
                const g = Math.min(255, Math.max(0, Math.round(base.g * lightIntensity + spec * 248)));
                const b = Math.min(255, Math.max(0, Math.round(base.b * lightIntensity + sunWarmthB + spec * 230)));
                return `rgb(${r},${g},${b})`;
            }

            // Draws a 3D Triangle in World Space with automatic surface normal calculation & Phong lighting
            draw3DTri(ctx, v0, v1, v2, baseHex, shininess = 16, specStrength = 0.15, strokeStyle = 'rgba(15,12,10,0.28)') {
                const ux = v1.x - v0.x, uy = v1.y - v0.y, uz = v1.z - v0.z;
                const wx = v2.x - v0.x, wy = v2.y - v0.y, wz = v2.z - v0.z;
                const nx = uy * wz - uz * wy;
                const ny = uz * wx - ux * wz;
                const nz = ux * wy - uy * wx;

                const avgZ = (v0.z + v1.z + v2.z) / 3;
                const litCol = this.computePolygonLitColor(baseHex, nx, ny, nz, avgZ, shininess, specStrength);

                const p0 = this.worldToIso(v0.x, v0.y, v0.z);
                const p1 = this.worldToIso(v1.x, v1.y, v1.z);
                const p2 = this.worldToIso(v2.x, v2.y, v2.z);

                ctx.fillStyle = litCol;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.closePath();
                ctx.fill();
                if (strokeStyle) {
                    ctx.strokeStyle = strokeStyle;
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
            }

            // Draws a 3D Quad in World Space with automatic surface normal & Phong lighting
            draw3DQuad(ctx, v0, v1, v2, v3, baseHex, shininess = 16, specStrength = 0.15, strokeStyle = 'rgba(15,12,10,0.28)') {
                const ux = v1.x - v0.x, uy = v1.y - v0.y, uz = v1.z - v0.z;
                const wx = v3.x - v0.x, wy = v3.y - v0.y, wz = v3.z - v0.z;
                const nx = uy * wz - uz * wy;
                const ny = uz * wx - ux * wz;
                const nz = ux * wy - uy * wx;

                const avgZ = (v0.z + v1.z + v2.z + v3.z) * 0.25;
                const litCol = this.computePolygonLitColor(baseHex, nx, ny, nz, avgZ, shininess, specStrength);

                const p0 = this.worldToIso(v0.x, v0.y, v0.z);
                const p1 = this.worldToIso(v1.x, v1.y, v1.z);
                const p2 = this.worldToIso(v2.x, v2.y, v2.z);
                const p3 = this.worldToIso(v3.x, v3.y, v3.z);

                ctx.fillStyle = litCol;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fill();
                if (strokeStyle) {
                    ctx.strokeStyle = strokeStyle;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            // Casts a multi-layered directional 3D soft shadow & ambient occlusion contact shadow on the ground plane
            drawSoftProjectedShadow(ctx, wx, wy, radius, height = 35) {
                const baseIso = this.worldToIso(wx, wy, 0);
                const tipIso = this.worldToIso(wx + height * 0.58, wy - height * 0.18, 0);
                const midX = (baseIso.x + tipIso.x) * 0.5;
                const midY = (baseIso.y + tipIso.y) * 0.5;
                const stretch = Math.hypot(tipIso.x - baseIso.x, tipIso.y - baseIso.y);
                const angle = Math.atan2(tipIso.y - baseIso.y, tipIso.x - baseIso.x);

                ctx.save();
                // Outer soft penumbra shadow stretched along sun ray
                ctx.translate(midX, midY);
                ctx.rotate(angle);
                const rx = radius * 1.15 + stretch * 0.55;
                const ry = radius * 0.62;
                const shadowGrad = ctx.createRadialGradient(0, 0, ry * 0.15, 0, 0, rx);
                shadowGrad.addColorStop(0, 'rgba(8, 10, 6, 0.48)');
                shadowGrad.addColorStop(0.65, 'rgba(8, 10, 6, 0.24)');
                shadowGrad.addColorStop(1, 'rgba(8, 10, 6, 0)');
                ctx.fillStyle = shadowGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Dark Ambient Occlusion contact ring right underneath the 3D object
                const aoGrad = ctx.createRadialGradient(baseIso.x, baseIso.y, radius * 0.1, baseIso.x, baseIso.y, radius * 1.25);
                aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
                aoGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
                aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = aoGrad;
                ctx.beginPath();
                ctx.ellipse(baseIso.x, baseIso.y, radius * 1.25, radius * 0.64, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draws a Chamfered (Beveled) Multi-Polygon 3D Box with realistic normal lighting and edge highlights
            drawIsoBox(ctx, wx, wy, wz, rx, ry, h, topCol, leftCol, rightCol, strokeCol = 'rgba(20,16,12,0.35)', shininess = 18, specStrength = 0.14) {
                const bev = Math.min(rx, ry, h) * 0.12;
                const z0 = wz;
                const z1 = wz + h - bev;
                const z2 = wz + h;

                // Main Front-Left Wall (facing +y, South-West)
                this.draw3DQuad(
                    ctx,
                    { x: wx - rx, y: wy + ry, z: z0 },
                    { x: wx + rx, y: wy + ry, z: z0 },
                    { x: wx + rx, y: wy + ry, z: z1 },
                    { x: wx - rx, y: wy + ry, z: z1 },
                    leftCol || topCol, shininess, specStrength, strokeCol
                );

                // Main Front-Right Wall (facing +x, South-East)
                this.draw3DQuad(
                    ctx,
                    { x: wx + rx, y: wy + ry, z: z0 },
                    { x: wx + rx, y: wy - ry, z: z0 },
                    { x: wx + rx, y: wy - ry, z: z1 },
                    { x: wx + rx, y: wy + ry, z: z1 },
                    rightCol || topCol, shininess, specStrength, strokeCol
                );

                // Chamfered Bevel Slopes along the top rim (catches bright specular sunlight!)
                if (bev > 0.6) {
                    const irx = rx - bev * 0.85;
                    const iry = ry - bev * 0.85;
                    // Front-Left Bevel Facet
                    this.draw3DQuad(
                        ctx,
                        { x: wx - rx, y: wy + ry, z: z1 },
                        { x: wx + rx, y: wy + ry, z: z1 },
                        { x: wx + irx, y: wy + iry, z: z2 },
                        { x: wx - irx, y: wy + iry, z: z2 },
                        topCol, shininess + 12, specStrength + 0.12, null
                    );
                    // Front-Right Bevel Facet
                    this.draw3DQuad(
                        ctx,
                        { x: wx + rx, y: wy + ry, z: z1 },
                        { x: wx + rx, y: wy - ry, z: z1 },
                        { x: wx + irx, y: wy - iry, z: z2 },
                        { x: wx + irx, y: wy + iry, z: z2 },
                        leftCol || topCol, shininess + 12, specStrength + 0.1, null
                    );
                    // Top Cap Polygon
                    this.draw3DQuad(
                        ctx,
                        { x: wx - irx, y: wy - iry, z: z2 },
                        { x: wx + irx, y: wy - iry, z: z2 },
                        { x: wx + irx, y: wy + iry, z: z2 },
                        { x: wx - irx, y: wy + iry, z: z2 },
                        topCol, shininess, specStrength, strokeCol
                    );
                } else {
                    this.draw3DQuad(
                        ctx,
                        { x: wx - rx, y: wy - ry, z: z2 },
                        { x: wx + rx, y: wy - ry, z: z2 },
                        { x: wx + rx, y: wy + ry, z: z2 },
                        { x: wx - rx, y: wy + ry, z: z2 },
                        topCol, shininess, specStrength, strokeCol
                    );
                }
            }

            // Draws a multi-faceted 3D Pyramid / Spire Roof with overhanging eaves and ridge cap
            drawIsoPyramidRoof(ctx, wx, wy, wz, rx, ry, peakH, leftCol, rightCol, strokeCol = 'rgba(20,16,12,0.32)', segments = 4) {
                const apex = { x: wx, y: wy, z: wz + peakH };
                if (segments > 4) {
                    this.drawIsoCone(ctx, wx, wy, wz, Math.max(rx, ry), peakH, leftCol, rightCol, segments, 28, 0.25);
                    return;
                }
                const c00 = { x: wx - rx, y: wy - ry, z: wz };
                const c10 = { x: wx + rx, y: wy - ry, z: wz };
                const c11 = { x: wx + rx, y: wy + ry, z: wz };
                const c01 = { x: wx - rx, y: wy + ry, z: wz };

                // Back-left & Back-right slopes (drawn first for proper occlusion)
                this.draw3DTri(ctx, c00, c01, apex, leftCol, 24, 0.2, strokeCol);
                this.draw3DTri(ctx, c10, c00, apex, rightCol, 24, 0.2, strokeCol);
                // Front-left & Front-right visible slopes
                this.draw3DTri(ctx, c01, c11, apex, leftCol, 28, 0.24, strokeCol);
                this.draw3DTri(ctx, c11, c10, apex, rightCol, 28, 0.24, strokeCol);
            }

            // Draws a detailed 3D Pitched Gable Roof with multi-faceted roof slopes, timber bargeboards, and ridge beam
            drawIsoGableRoof(ctx, wx, wy, wz, rx, ry, peakH, slopeLightCol, slopeDarkCol, gableCol, strokeCol = 'rgba(20,16,12,0.35)') {
                const p00 = { x: wx - rx, y: wy - ry, z: wz };
                const p10 = { x: wx + rx, y: wy - ry, z: wz };
                const p11 = { x: wx + rx, y: wy + ry, z: wz };
                const p01 = { x: wx - rx, y: wy + ry, z: wz };
                const ridgeBack = { x: wx, y: wy - ry * 1.04, z: wz + peakH };
                const ridgeFront = { x: wx, y: wy + ry * 1.04, z: wz + peakH };

                // Subdivide roof slopes into upper and lower pitches (mansard/curved medieval tile profile)
                const midH = wz + peakH * 0.54;
                const mLBack = { x: wx - rx * 0.46, y: wy - ry, z: midH };
                const mLFront = { x: wx - rx * 0.46, y: wy + ry, z: midH };
                const mRBack = { x: wx + rx * 0.46, y: wy - ry, z: midH };
                const mRFront = { x: wx + rx * 0.46, y: wy + ry, z: midH };

                // Left Slope (2 angled polygon tiers)
                this.draw3DQuad(ctx, p00, p01, mLFront, mLBack, slopeLightCol, 22, 0.18, strokeCol);
                this.draw3DQuad(ctx, mLBack, mLFront, ridgeFront, ridgeBack, slopeLightCol, 28, 0.24, strokeCol);

                // Right Slope (2 angled polygon tiers)
                this.draw3DQuad(ctx, mRBack, mRFront, p11, p10, slopeDarkCol, 22, 0.18, strokeCol);
                this.draw3DQuad(ctx, ridgeBack, ridgeFront, mRFront, mRBack, slopeDarkCol, 28, 0.24, strokeCol);

                // Front Triangular Gable Wall + Timber Frame Detail
                this.draw3DTri(ctx, p01, mRFront, mLFront, gableCol, 12, 0.08, strokeCol);
                this.draw3DTri(ctx, p01, p11, mRFront, gableCol, 12, 0.08, strokeCol);
                this.draw3DTri(ctx, mLFront, mRFront, ridgeFront, gableCol, 12, 0.08, strokeCol);
            }

            // Draws a True Polygonal 3D Cylinder / Frustum with N individual normal-shaded vertical facets
            drawIsoCylinder(ctx, wx, wy, wz, radius, h, topCol, sideLightCol, sideDarkCol, strokeCol = 'rgba(20,16,12,0.25)', segments = 10, topRadius = null) {
                const rBot = radius;
                const rTop = topRadius !== null ? topRadius : radius;
                const botPts = [];
                const topPts = [];

                for (let i = 0; i < segments; i++) {
                    const a = (i / segments) * Math.PI * 2;
                    const ca = Math.cos(a), sa = Math.sin(a);
                    botPts.push({ x: wx + ca * rBot, y: wy + sa * rBot, z: wz });
                    topPts.push({ x: wx + ca * rTop, y: wy + sa * rTop, z: wz + h });
                }

                // Sort lateral quad facets back-to-front by world depth (x + y)
                const faces = [];
                for (let i = 0; i < segments; i++) {
                    const next = (i + 1) % segments;
                    const cx = (botPts[i].x + botPts[next].x) * 0.5;
                    const cy = (botPts[i].y + botPts[next].y) * 0.5;
                    faces.push({ i, next, depth: cx + cy });
                }
                faces.sort((a, b) => a.depth - b.depth);

                // Draw visible front-facing facets
                faces.forEach(f => {
                    this.draw3DQuad(
                        ctx,
                        botPts[f.i],
                        botPts[f.next],
                        topPts[f.next],
                        topPts[f.i],
                        sideLightCol || topCol,
                        24, 0.18,
                        strokeCol
                    );
                });

                // Draw Polygonal Top Cap
                const topIso = topPts.map(pt => this.worldToIso(pt.x, pt.y, pt.z));
                ctx.fillStyle = this.computePolygonLitColor(topCol || sideLightCol, 0, 0, 1, wz + h, 20, 0.15);
                ctx.beginPath();
                ctx.moveTo(topIso[0].x, topIso[0].y);
                for (let i = 1; i < segments; i++) ctx.lineTo(topIso[i].x, topIso[i].y);
                ctx.closePath();
                ctx.fill();
                if (strokeCol) {
                    ctx.strokeStyle = strokeCol;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            // Draws a True Polygonal 3D Cone with N triangular facets (supports fluted branch tips for pine trees)
            drawIsoCone(ctx, wx, wy, wz, radius, h, lightCol, darkCol, segments = 10, shininess = 20, specStrength = 0.16, fluteAmp = 0) {
                const apex = { x: wx, y: wy, z: wz + h };
                const ring = [];
                for (let i = 0; i < segments; i++) {
                    const a = (i / segments) * Math.PI * 2;
                    const rMod = fluteAmp > 0 ? radius * (1 + (i % 2 === 0 ? fluteAmp : -fluteAmp * 0.6)) : radius;
                    const zDrop = fluteAmp > 0 && i % 2 === 0 ? -2.2 : 0;
                    ring.push({ x: wx + Math.cos(a) * rMod, y: wy + Math.sin(a) * rMod, z: wz + zDrop });
                }

                const faces = [];
                for (let i = 0; i < segments; i++) {
                    const next = (i + 1) % segments;
                    const depth = (ring[i].x + ring[next].x + wx) / 3 + (ring[i].y + ring[next].y + wy) / 3;
                    faces.push({ i, next, depth });
                }
                faces.sort((a, b) => a.depth - b.depth);

                faces.forEach(f => {
                    this.draw3DTri(ctx, ring[f.i], ring[f.next], apex, lightCol, shininess, specStrength, 'rgba(12,18,10,0.22)');
                });
            }

            // Draws a Multi-Polygon Geodesic 3D Dome / Boulder / Helmet / Foliage Crown
            drawIsoPolyDome(ctx, wx, wy, wz, rx, ry, h, baseHex, rings = 3, segments = 8, shininess = 24, specStrength = 0.2) {
                const quads = [];
                const tris = [];

                for (let r = 0; r < rings; r++) {
                    const phi0 = (r / rings) * (Math.PI * 0.5);
                    const phi1 = ((r + 1) / rings) * (Math.PI * 0.5);
                    const c0 = Math.cos(phi0), s0 = Math.sin(phi0);
                    const c1 = Math.cos(phi1), s1 = Math.sin(phi1);

                    for (let s = 0; s < segments; s++) {
                        const a0 = (s / segments) * Math.PI * 2;
                        const a1 = ((s + 1) / segments) * Math.PI * 2;

                        const p00 = { x: wx + Math.cos(a0) * rx * c0, y: wy + Math.sin(a0) * ry * c0, z: wz + h * s0 };
                        const p10 = { x: wx + Math.cos(a1) * rx * c0, y: wy + Math.sin(a1) * ry * c0, z: wz + h * s0 };
                        const p11 = { x: wx + Math.cos(a1) * rx * c1, y: wy + Math.sin(a1) * ry * c1, z: wz + h * s1 };
                        const p01 = { x: wx + Math.cos(a0) * rx * c1, y: wy + Math.sin(a0) * ry * c1, z: wz + h * s1 };

                        const depth = (p00.x + p10.x + p11.x + p01.x) * 0.25 + (p00.y + p10.y + p11.y + p01.y) * 0.25 + (p00.z + p11.z) * 0.2;
                        if (r === rings - 1) {
                            tris.push({ p0: p00, p1: p10, p2: { x: wx, y: wy, z: wz + h }, depth });
                        } else {
                            quads.push({ p0: p00, p1: p10, p2: p11, p3: p01, depth });
                        }
                    }
                }

                quads.sort((a, b) => a.depth - b.depth);
                tris.sort((a, b) => a.depth - b.depth);

                quads.forEach(q => this.draw3DQuad(ctx, q.p0, q.p1, q.p2, q.p3, baseHex, shininess, specStrength, 'rgba(15,15,15,0.2)'));
                tris.forEach(t => this.draw3DTri(ctx, t.p0, t.p1, t.p2, baseHex, shininess, specStrength, 'rgba(15,15,15,0.2)'));
            }

            // Draws 3D Crenellations (Battlement Merlons) along the top perimeter of walls & towers
            drawIsoBattlements(ctx, wx, wy, wz, rx, ry, merlonH, baseHex) {
                const count = 4;
                const mSize = Math.max(2.4, rx * 0.2);
                for (let i = 0; i < count; i++) {
                    const t = -0.82 + (i / (count - 1)) * 1.64;
                    // South-West edge merlons
                    this.drawIsoBox(ctx, wx + t * rx, wy + ry - mSize * 0.6, wz, mSize, mSize * 0.7, merlonH, baseHex, baseHex, baseHex);
                    // South-East edge merlons
                    this.drawIsoBox(ctx, wx + rx - mSize * 0.6, wy + t * ry, wz, mSize * 0.7, mSize, merlonH, baseHex, baseHex, baseHex);
                }
            }

            // Draws a Ground Diamond Selection / Footprint Ring
            drawIsoGroundEllipse(ctx, wx, wy, radius, strokeStyle, lineWidth = 2.5, fillStyle = null) {
                const c = this.worldToIso(wx, wy, 0);
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, radius * 1.25, radius * 0.625, 0, 0, Math.PI * 2);
                if (fillStyle) {
                    ctx.fillStyle = fillStyle;
                    ctx.fill();
                }
                if (strokeStyle) {
                    ctx.strokeStyle = strokeStyle;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
            }

            render() {
                const ctx = this.ctx;
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // Deep atmospheric void background around the 3D floating world slab
                const bgGrad = ctx.createRadialGradient(
                    this.canvas.width * 0.5, this.canvas.height * 0.5, 100,
                    this.canvas.width * 0.5, this.canvas.height * 0.5, Math.max(this.canvas.width, this.canvas.height)
                );
                bgGrad.addColorStop(0, '#181410');
                bgGrad.addColorStop(1, '#090705');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

                const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
                const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;

                ctx.save();
                ctx.translate(this.canvas.width * 0.5 + shakeX, this.canvas.height * 0.5 + shakeY);
                ctx.scale(this.camera.zoom, this.camera.zoom);
                ctx.translate(-this.camera.x, -this.camera.y);

                // 0. Multi-Polygon 3D Extruded World Slab Cliffs (tessellated rock strata along the edges of the world)
                const W = this.worldSize;
                const slabThickness = 72;
                const cliffSegs = 24;
                const segLen = W / cliffSegs;

                for (let i = 0; i < cliffSegs; i++) {
                    const p0 = i * segLen;
                    const p1 = (i + 1) * segLen;
                    const jag0 = Math.sin(i * 1.9) * 14;
                    const jag1 = Math.sin((i + 1) * 1.9) * 14;

                    // South-West Cliff Wall (wy = W)
                    const swTop0 = { x: p0, y: W, z: 0 };
                    const swTop1 = { x: p1, y: W, z: 0 };
                    const swMid0 = { x: p0 + jag0 * 0.4, y: W + 10 + jag0, z: -slabThickness * 0.48 };
                    const swMid1 = { x: p1 + jag1 * 0.4, y: W + 10 + jag1, z: -slabThickness * 0.48 };
                    const swBot0 = { x: p0, y: W + 4, z: -slabThickness };
                    const swBot1 = { x: p1, y: W + 4, z: -slabThickness };

                    this.draw3DTri(ctx, swTop0, swTop1, swMid0, '#5c4328', 10, 0.08);
                    this.draw3DTri(ctx, swTop1, swMid1, swMid0, '#543c23', 10, 0.08);
                    this.draw3DTri(ctx, swMid0, swMid1, swBot0, '#3d2b19', 8, 0.05);
                    this.draw3DTri(ctx, swMid1, swBot1, swBot0, '#332314', 8, 0.05);

                    // South-East Cliff Wall (wx = W)
                    const seTop0 = { x: W, y: p0, z: 0 };
                    const seTop1 = { x: W, y: p1, z: 0 };
                    const seMid0 = { x: W + 10 + jag0, y: p0 + jag0 * 0.4, z: -slabThickness * 0.48 };
                    const seMid1 = { x: W + 10 + jag1, y: p1 + jag1 * 0.4, z: -slabThickness * 0.48 };
                    const seBot0 = { x: W + 4, y: p0, z: -slabThickness };
                    const seBot1 = { x: W + 4, y: p1, z: -slabThickness };

                    this.draw3DTri(ctx, seTop1, seTop0, seMid1, '#473420', 10, 0.08);
                    this.draw3DTri(ctx, seTop0, seMid0, seMid1, '#3d2c1b', 10, 0.08);
                    this.draw3DTri(ctx, seMid1, seMid0, seBot1, '#2b1e12', 8, 0.05);
                    this.draw3DTri(ctx, seMid0, seBot0, seBot1, '#23180e', 8, 0.05);
                }

                // 1. Pre-baked Terrain Texture transformed into Isometric 2:1 Space
                ctx.save();
                // Affine matrix mapping (wx, wy) -> (wx - wy, 0.5 * wx + 0.5 * wy)
                ctx.transform(1, 0.5, -1, 0.5, 0, 0);

                if (this.terrainCanvas) {
                    ctx.drawImage(this.terrainCanvas, 0, 0);
                } else {
                    ctx.fillStyle = '#3b5e28';
                    ctx.fillRect(0, 0, W, W);
                }

                // Animated Water Ripples on Oasis Lakes
                if (this.lakes) {
                    this.lakes.forEach((lk, idx) => {
                        ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
                        ctx.lineWidth = 2.0;
                        for (let r = 0; r < 3; r++) {
                            const rawPhase = (Math.max(0, this.gameTime) * 0.45 + r * 0.33 + idx * 0.5) % 1;
                            const phase = (rawPhase + 1) % 1;
                            const rx = Math.max(1, lk.rx * phase * 0.9);
                            const ry = Math.max(1, lk.ry * phase * 0.9);
                            ctx.globalAlpha = Math.max(0, (1 - phase) * 0.55);
                            ctx.beginPath();
                            ctx.ellipse(lk.x, lk.y, rx, ry, -0.2, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.globalAlpha = 1.0;
                    });
                }

                // Scorch Craters on ground plane
                this.craters.forEach(cr => {
                    ctx.fillStyle = 'rgba(28, 25, 23, 0.58)';
                    ctx.beginPath();
                    ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.strokeStyle = '#d4a359';
                ctx.lineWidth = 12;
                ctx.strokeRect(0, 0, W, W);
                ctx.restore();

                // 3D Tree Stumps
                this.stumps.forEach(st => {
                    this.drawSoftProjectedShadow(ctx, st.x, st.y, 8, 8);
                    this.drawIsoCylinder(ctx, st.x, st.y, 0, 7, 8, '#b45309', '#78350f', '#451a03', 'rgba(20,12,6,0.35)', 8, 5.5);
                });

                // Fallen Unit Corpses
                this.corpses.forEach(c => {
                    const p = this.worldToIso(c.x, c.y, 0);
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, c.life / 2.5) * 0.75;
                    ctx.translate(p.x, p.y);
                    ctx.fillStyle = c.faction === 'player' ? '#1e3a8a' : '#7f1d1d';
                    ctx.beginPath();
                    ctx.ellipse(0, 2, 11, 5.5, 0.2 * c.facing, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fde68a';
                    ctx.beginPath();
                    ctx.arc(7 * c.facing, 1, 3.8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });

                // Command Rings in Isometric Perspective
                this.commandMarkers.forEach(m => {
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, m.alpha);
                    this.drawIsoGroundEllipse(ctx, m.x, m.y, m.radius, m.color, 2.6, null);
                    ctx.restore();
                });

                // 2. Depth-Sorted 3D Isometric Objects (sorted by wx + wy)
                const renderList = [];
                this.resources.forEach(r => {
                    if (r.amount > 0) renderList.push({ depth: r.x + r.y, kind: 'res', obj: r });
                });
                this.buildings.forEach(b => {
                    if (b.hp <= 0) return;
                    if (b.faction === 'enemy' && !this.isWorldPosVisible(b.x, b.y)) {
                        const gx = Math.floor(b.x / this.fogCellSize);
                        const gy = Math.floor(b.y / this.fogCellSize);
                        if (this.fog[gy]?.[gx] === 0) return;
                    }
                    renderList.push({ depth: b.x + b.y, kind: 'bld', obj: b });
                });
                this.units.forEach(u => {
                    if (u.hp <= 0 || u.garrisoned) return;
                    if (u.faction === 'enemy' && !this.isWorldPosVisible(u.x, u.y)) return;
                    renderList.push({ depth: u.x + u.y, kind: 'unit', obj: u });
                });

                renderList.sort((a, b) => a.depth - b.depth);

                renderList.forEach(item => {
                    if (item.kind === 'res') this.drawResourceNode3DIso(ctx, item.obj);
                    else if (item.kind === 'bld') this.drawBuilding3DIso(ctx, item.obj);
                    else if (item.kind === 'unit') this.drawUnit3DIso(ctx, item.obj);
                });

                // 3. Ballistic Projectiles in 3D Isometric Space
                this.projectiles.forEach(p => {
                    const gPos = this.worldToIso(p.x, p.y, 0);
                    const airPos = this.worldToIso(p.x, p.y, p.z);

                    // Ground shadow
                    ctx.fillStyle = 'rgba(0,0,0,0.45)';
                    ctx.beginPath();
                    ctx.ellipse(gPos.x, gPos.y, p.type === 'boulder' ? 8 : 4.5, p.type === 'boulder' ? 4 : 2.2, 0, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.save();
                    ctx.translate(airPos.x, airPos.y);
                    if (p.type === 'boulder') {
                        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
                        glow.addColorStop(0, 'rgba(251, 146, 60, 0.95)');
                        glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
                        ctx.fillStyle = glow;
                        ctx.beginPath();
                        ctx.arc(0, 0, 16, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#44403c';
                        ctx.beginPath();
                        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#f97316';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    } else {
                        const tIso = this.worldToIso(p.targetX, p.targetY, 10);
                        const angle = Math.atan2(tIso.y - airPos.y, tIso.x - airPos.x);
                        ctx.rotate(angle);
                        ctx.strokeStyle = '#f8fafc';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(-10, -2.5); ctx.lineTo(-6, 0); ctx.lineTo(-10, 2.5);
                        ctx.stroke();
                        ctx.strokeStyle = '#b45309';
                        ctx.lineWidth = 1.8;
                        ctx.beginPath();
                        ctx.moveTo(-8, 0);
                        ctx.lineTo(8, 0);
                        ctx.stroke();
                        ctx.fillStyle = '#e2e8f0';
                        ctx.beginPath();
                        ctx.moveTo(11, 0);
                        ctx.lineTo(5, -3.2);
                        ctx.lineTo(5, 3.2);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.restore();
                });

                // 4. Slash Arcs, Smoke & Debris in Isometric Space
                this.slashEffects.forEach(s => {
                    const pos = this.worldToIso(s.x, s.y, 16);
                    ctx.save();
                    ctx.translate(pos.x, pos.y);
                    ctx.rotate(s.angle);
                    ctx.strokeStyle = `rgba(254, 240, 138, ${s.life / s.maxLife})`;
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, 17, -0.95, 0.95);
                    ctx.stroke();
                    ctx.restore();
                });

                this.smokeParticles.forEach(sp => {
                    const pos = this.worldToIso(sp.x, sp.y, sp.z || 28);
                    ctx.fillStyle = sp.color;
                    ctx.globalAlpha = Math.max(0, sp.alpha);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, sp.r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                });

                this.particles.forEach(pt => {
                    const pos = this.worldToIso(pt.x, pt.y, 14);
                    ctx.fillStyle = pt.color;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, pt.size, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Birds & Clouds in 3D Altitude
                this.birds.forEach(b => {
                    if (!this.isWorldPosVisible(b.x, b.y)) return;
                    const gPos = this.worldToIso(b.x, b.y, 0);
                    const airPos = this.worldToIso(b.x, b.y, 75);
                    const wing = Math.sin(b.wingPhase) * 5;
                    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(gPos.x - 5, gPos.y + wing * 0.5);
                    ctx.quadraticCurveTo(gPos.x, gPos.y - 2, gPos.x + 5, gPos.y + wing * 0.5);
                    ctx.stroke();
                    ctx.strokeStyle = '#f8fafc';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    ctx.moveTo(airPos.x - 7, airPos.y + wing);
                    ctx.quadraticCurveTo(airPos.x, airPos.y - 2, airPos.x + 7, airPos.y + wing);
                    ctx.stroke();
                });

                this.clouds.forEach(c => {
                    const pos = this.worldToIso(c.x, c.y, 0);
                    ctx.fillStyle = 'rgba(10, 18, 10, 0.14)';
                    ctx.beginPath();
                    ctx.ellipse(pos.x, pos.y, c.rx * 1.2, c.ry * 0.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 5. 3D Building Placement Ghost
                if (this.buildModeType) {
                    const def = BUILDINGS_DEF[this.buildModeType];
                    const px = this.buildPreviewPos.x, py = this.buildPreviewPos.y;
                    const blocked = this.buildings.some(b => b.hp > 0 && Math.hypot(b.x - px, b.y - py) < (b.radius + def.radius + 10));
                    ctx.save();
                    ctx.globalAlpha = 0.68;
                    const r = def.radius * 0.78;
                    this.drawIsoBox(
                        ctx, px, py, 0, r, r, def.isFarm ? 4 : 36,
                        blocked ? '#f87171' : '#6ee7b7',
                        blocked ? '#ef4444' : '#34d399',
                        blocked ? '#b91c1c' : '#059669',
                        blocked ? '#fee2e2' : '#ecfdf5'
                    );
                    ctx.restore();
                }

                // 6. Floating Popups
                this.floatingTexts.forEach(ft => {
                    const pos = this.worldToIso(ft.x, ft.y, 44);
                    ctx.font = 'bold 13px Inter, sans-serif';
                    ctx.fillStyle = '#000';
                    ctx.textAlign = 'center';
                    ctx.fillText(ft.text, pos.x + 1, pos.y + 1);
                    ctx.fillStyle = ft.color;
                    ctx.fillText(ft.text, pos.x, pos.y);
                });

                // 7. Isometric Fog of War
                ctx.save();
                ctx.transform(1, 0.5, -1, 0.5, 0, 0);
                for (let gy = 0; gy < this.fogGridSize; gy++) {
                    for (let gx = 0; gx < this.fogGridSize; gx++) {
                        const state = this.fog[gy][gx];
                        if (state === 2) continue;
                        ctx.fillStyle = state === 0 ? 'rgba(10, 9, 8, 0.94)' : 'rgba(14, 12, 10, 0.45)';
                        ctx.fillRect(gx * this.fogCellSize, gy * this.fogCellSize, this.fogCellSize + 1.5, this.fogCellSize + 1.5);
                    }
                }
                ctx.restore();

                ctx.restore();

                // 8. Box Selection Overlay (Screen Space)
                if (this.isBoxSelecting && this.boxSelectRect) {
                    const r = this.boxSelectRect;
                    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
                    ctx.strokeStyle = '#4ade80';
                    ctx.lineWidth = 2;
                    ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
                    ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
                }

                this.renderMinimap();
            }

            drawResourceNode3DIso(ctx, r) {
                const gx = Math.floor(r.x / this.fogCellSize);
                const gy = Math.floor(r.y / this.fogCellSize);
                if (this.fog[gy]?.[gx] === 0) return;

                const shakeOffset = r.hitShake > 0 ? Math.sin(this.gameTime * 55) * 3.5 * r.hitShake : 0;
                const wx = r.x + shakeOffset;
                const wy = r.y;

                if (r.type === 'wood') {
                    // Long directional soft shadow + AO
                    this.drawSoftProjectedShadow(ctx, wx, wy, r.radius * 0.95, 48);

                    const sway = Math.sin(this.gameTime * 2.1 + r.id) * 2.4;
                    // Root Buttresses + Tapered 8-faceted 3D Tree Trunk
                    this.drawIsoCylinder(ctx, wx, wy, 0, 6.2, 18, '#78350f', '#78350f', '#451a03', 'rgba(20,12,6,0.35)', 8, 3.8);

                    // 4 Multi-Polygon Fluted Pine Bough Tiers (10 triangular facets per tier = 40 foliage polygons per tree!)
                    this.drawIsoCone(ctx, wx + sway * 0.15, wy - sway * 0.15, 11, 19.5, 19, '#2e6f32', '#143617', 10, 14, 0.12, 0.22);
                    this.drawIsoCone(ctx, wx + sway * 0.35, wy - sway * 0.35, 22, 16.0, 18, '#3b853f', '#1c451f', 10, 16, 0.15, 0.22);
                    this.drawIsoCone(ctx, wx + sway * 0.55, wy - sway * 0.55, 33, 12.0, 16, '#4ba14f', '#245728', 10, 18, 0.18, 0.20);
                    this.drawIsoCone(ctx, wx + sway * 0.75, wy - sway * 0.75, 43, 7.5, 14, '#65bd69', '#2e6b33', 8, 22, 0.22, 0.16);
                } else if (r.type === 'gold' || r.type === 'stone') {
                    const isGold = r.type === 'gold';
                    this.drawSoftProjectedShadow(ctx, wx, wy, r.radius * 0.95, 26);

                    // Multi-faceted Geode / Polyhedral Rock Outcrop with high specular shine on Gold
                    const mainCol = isGold ? '#eab308' : '#9ca3af';
                    const brightCol = isGold ? '#fde047' : '#cbd5e1';
                    const deepCol = isGold ? '#ca8a04' : '#64748b';
                    const shine = isGold ? 42 : 18;
                    const spec = isGold ? 0.65 : 0.22;

                    // Base boulder dome (24 polygons)
                    this.drawIsoPolyDome(ctx, wx, wy, 0, 15, 14, 15, mainCol, 3, 8, shine, spec);
                    // Secondary angled crystal spire (left-front)
                    this.drawIsoCone(ctx, wx - 6, wy + 5, 2, 8.5, 22, brightCol, deepCol, 6, shine + 10, spec + 0.15, 0.12);
                    // Tertiary crystal prism (right-front)
                    this.drawIsoCone(ctx, wx + 7, wy + 4, 1, 7.5, 16, mainCol, deepCol, 6, shine, spec, 0.1);
                } else if (r.type === 'food') {
                    this.drawSoftProjectedShadow(ctx, wx, wy, r.radius * 0.9, 18);
                    // Multi-lobed 3D Geodesic Berry Bush Clusters
                    this.drawIsoPolyDome(ctx, wx - 4, wy + 3, 0, 11, 11, 14, '#22c55e', 3, 8, 16, 0.14);
                    this.drawIsoPolyDome(ctx, wx + 5, wy - 2, 0, 10, 10, 16, '#4ade80', 3, 8, 18, 0.16);
                    this.drawIsoPolyDome(ctx, wx + 2, wy + 5, 0, 9, 9, 12, '#16a34a', 2, 7, 16, 0.12);

                    // 3D Glossy Berries with Specular Dot
                    const top = this.worldToIso(wx, wy, 12);
                    [[-7, -2], [6, -4], [0, 3], [-4, 5], [7, 2], [2, -6]].forEach(([bx, by]) => {
                        ctx.fillStyle = '#dc2626';
                        ctx.beginPath();
                        ctx.arc(top.x + bx, top.y + by, 2.8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#fecaca';
                        ctx.beginPath();
                        ctx.arc(top.x + bx - 0.8, top.y + by - 0.8, 1.0, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }

            drawBuilding3DIso(ctx, b) {
                const isSelected = this.selectedIds.has(b.id);
                const isPlayer = b.faction === 'player';
                const roofTop = isPlayer ? '#3b82f6' : '#ef4444';
                const roofLeft = isPlayer ? '#2563eb' : '#dc2626';
                const roofRight = isPlayer ? '#1d4ed8' : '#b91c1c';
                const bannerCol = isPlayer ? '#60a5fa' : '#f87171';

                if (isSelected) {
                    this.drawIsoGroundEllipse(ctx, b.x, b.y, b.radius + 8, '#4ade80', 3, 'rgba(74, 222, 128, 0.14)');

                    if (isPlayer && ['towncenter', 'barracks', 'archery', 'stable', 'castle'].includes(b.type)) {
                        const startIso = this.worldToIso(b.x, b.y, 4);
                        const rallyIso = this.worldToIso(b.rallyX, b.rallyY, 0);
                        ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
                        ctx.setLineDash([6, 4]);
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(startIso.x, startIso.y);
                        ctx.lineTo(rallyIso.x, rallyIso.y);
                        ctx.stroke();
                        ctx.setLineDash([]);

                        ctx.strokeStyle = '#fff';
                        ctx.beginPath();
                        ctx.moveTo(rallyIso.x, rallyIso.y);
                        ctx.lineTo(rallyIso.x, rallyIso.y - 20);
                        ctx.stroke();
                        ctx.fillStyle = '#3b82f6';
                        ctx.fillRect(rallyIso.x, rallyIso.y - 20, 13, 8);
                    }
                }

                // 3D Terraced Bio-Farm & Kinetic Aero-Pavilion
                if (b.isFarm) {
                    this.drawDesignerFarm3DIso(ctx, b);
                    return;
                }

                // Directional 3D Soft Shadow & Ground Ambient Occlusion
                const shadowH = b.type === 'castle' ? 96 : b.type === 'tower' ? 84 : b.type === 'towncenter' ? 76 : 48;
                this.drawSoftProjectedShadow(ctx, b.x, b.y, b.radius * 1.12, shadowH);

                // 3D Construction Scaffolding if unfinished
                if (!b.completed) {
                    const r = b.radius * 0.74;
                    const maxH = 38;
                    const curH = Math.max(6, (b.progress / 100) * maxH);
                    // Rising chamfered 3D stone core
                    this.drawIsoBox(ctx, b.x, b.y, 0, r, r, curH, '#d6d3d1', '#a8a29e', '#78716c');
                    // 3D Wooden Scaffolding Lattice
                    [[-r, -r], [r, -r], [r, r], [-r, r]].forEach(([ox, oy]) => {
                        const pBot = this.worldToIso(b.x + ox, b.y + oy, 0);
                        const pTop = this.worldToIso(b.x + ox, b.y + oy, maxH + 8);
                        ctx.strokeStyle = '#b45309';
                        ctx.lineWidth = 2.4;
                        ctx.beginPath();
                        ctx.moveTo(pBot.x, pBot.y);
                        ctx.lineTo(pTop.x, pTop.y);
                        ctx.stroke();
                    });
                    const labelPos = this.worldToIso(b.x, b.y, curH + 16);
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.fillStyle = '#fde68a';
                    ctx.textAlign = 'center';
                    ctx.fillText(`🔨 ${Math.floor(b.progress)}%`, labelPos.x, labelPos.y);
                } else {
                    const r = b.radius * 0.76;
                    ctx.save();
                    if (b.hurtFlash > 0) ctx.filter = 'brightness(1.45)';

                    if (b.type === 'castle') {
                        this.drawDesignerCastle3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'tower') {
                        this.drawDesignerTower3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'towncenter') {
                        this.drawDesignerTownCenter3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'house') {
                        this.drawDesignerHouse3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'barracks') {
                        this.drawDesignerBarracks3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'archery') {
                        this.drawDesignerArchery3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'stable') {
                        this.drawDesignerStable3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'lumbercamp') {
                        this.drawDesignerLumberCamp3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'miningcamp') {
                        this.drawDesignerMiningCamp3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'mill') {
                        this.drawDesignerMill3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'monastery') {
                        this.drawDesignerMonastery3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'blacksmith') {
                        this.drawDesignerBlacksmith3DIso(ctx, b, r, roofTop, roofLeft, roofRight);
                    } else if (b.type === 'wall') {
                        this.drawDesignerWall3DIso(ctx, b, r);
                    }

                    // Waving 3D Faction Flag on Top
                    const flagTopZ = b.type === 'castle' ? 124 : b.type === 'tower' ? 102 : b.type === 'towncenter' ? 92 : 54;
                    const flagBase = this.worldToIso(b.x, b.y, flagTopZ - 14);
                    const flagTip = this.worldToIso(b.x, b.y, flagTopZ);
                    const wave = Math.sin(this.gameTime * 6 + b.id) * 3.5;
                    ctx.strokeStyle = '#fef3c7';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(flagBase.x, flagBase.y);
                    ctx.lineTo(flagTip.x, flagTip.y);
                    ctx.stroke();

                    ctx.fillStyle = bannerCol;
                    ctx.beginPath();
                    ctx.moveTo(flagTip.x, flagTip.y);
                    ctx.lineTo(flagTip.x + 15, flagTip.y + 4 + wave);
                    ctx.lineTo(flagTip.x, flagTip.y + 10);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }

                // Floating 3D Health Bar & Training Progress Bar
                const topAnchor = this.worldToIso(b.x, b.y, b.type === 'castle' ? 128 : b.type === 'tower' ? 106 : b.type === 'towncenter' ? 96 : 80);
                if (b.hp < b.maxHp || isSelected) {
                    const bw = b.radius * 1.5;
                    const bx = topAnchor.x - bw / 2;
                    const by = topAnchor.y - 10;
                    ctx.fillStyle = 'rgba(0,0,0,0.82)';
                    ctx.fillRect(bx, by, bw, 6);
                    const ratio = Math.max(0, b.hp / b.maxHp);
                    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
                    ctx.fillRect(bx + 1, by + 1, (bw - 2) * ratio, 4);
                }

                if (b.garrison && b.garrison.length > 0) {
                    const gPos = this.worldToIso(b.x, b.y, b.type === 'castle' ? 144 : (b.type === 'towncenter' ? 114 : 96));
                    ctx.fillStyle = 'rgba(30, 58, 138, 0.9)';
                    ctx.strokeStyle = '#93c5fd';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.roundRect(gPos.x - 20, gPos.y - 12, 40, 16, 6);
                    ctx.fill();
                    ctx.stroke();
                    ctx.font = 'bold 10px Inter, sans-serif';
                    ctx.fillStyle = '#fef3c7';
                    ctx.textAlign = 'center';
                    ctx.fillText(`🛡️ ${b.garrison.length}`, gPos.x, gPos.y);
                }

                if (isPlayer && b.queue.length > 0) {
                    const item = b.queue[0];
                    const bw = b.radius * 1.35;
                    const bx = topAnchor.x - bw / 2;
                    const by = topAnchor.y - 2;
                    ctx.fillStyle = 'rgba(0,0,0,0.82)';
                    ctx.fillRect(bx, by, bw, 5);
                    const prog = 1 - (item.remainingTime / item.totalTime);
                    ctx.fillStyle = '#38bdf8';
                    ctx.fillRect(bx + 1, by + 1, (bw - 2) * prog, 3);
                }
            }

            drawUnit3DIso(ctx, u) {
                const isSelected = this.selectedIds.has(u.id);
                const isMoving = u.state === 'move' || (u.state !== 'idle' && u.swingAnim === 0);
                const legSwing = isMoving ? Math.sin(u.walkCycle) * 4.5 : 0;
                const breathBob = isMoving ? Math.abs(Math.cos(u.walkCycle)) * 2.5 : Math.sin(this.gameTime * 3.5 + u.id) * 0.8;

                if (isSelected) {
                    this.drawIsoGroundEllipse(ctx, u.x, u.y, u.radius + 5, '#4ade80', 2.4, 'rgba(74, 222, 128, 0.16)');
                }

                // Soft Directional 3D Unit Shadow + Contact AO
                this.drawSoftProjectedShadow(ctx, u.x, u.y, u.radius * 0.92, u.type === 'knight' ? 32 : 24);

                const gPos = this.worldToIso(u.x, u.y, 0);
                const teamTop = u.hurtFlash > 0 ? '#ffffff' : (u.faction === 'player' ? '#60a5fa' : '#f87171');
                const teamLeft = u.hurtFlash > 0 ? '#ffffff' : (u.faction === 'player' ? '#2563eb' : '#dc2626');
                const teamRight = u.hurtFlash > 0 ? '#ffffff' : (u.faction === 'player' ? '#1e3a8a' : '#7f1d1d');

                if (u.type === 'catapult') {
                    // 4 Polygonal 3D Wheels
                    [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([wxOff, wyOff]) => {
                        this.drawIsoCylinder(ctx, u.x + wxOff, u.y + wyOff, 0, 4.2, 4.5, '#5c3a1e', '#78350f', '#3b2310', 'rgba(0,0,0,0.4)', 6);
                    });
                    // 3D Chamfered Timber Siege Frame
                    this.drawIsoBox(ctx, u.x, u.y, 3.5, 13.5, 10.5, 7, '#b45309', '#92400e', '#451a03', 'rgba(20,12,6,0.4)');
                    this.drawIsoBox(ctx, u.x - 3, u.y, 10.5, 4.5, 8.5, 12, teamTop, teamLeft, teamRight);
                    const armBase = this.worldToIso(u.x, u.y, 19);
                    ctx.save();
                    ctx.translate(armBase.x, armBase.y);
                    ctx.scale(u.facing, 1);
                    ctx.rotate(-0.5 + Math.sin(u.swingAnim * Math.PI) * 1.25);
                    ctx.fillStyle = '#b45309';
                    ctx.fillRect(-2.5, -25, 5, 25);
                    ctx.fillStyle = '#f97316';
                    ctx.beginPath();
                    ctx.arc(0, -25, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                } else if (u.type === 'knight') {
                    // Animated 3D Horse Legs
                    ctx.strokeStyle = '#451a03';
                    ctx.lineWidth = 2.6;
                    ctx.beginPath();
                    ctx.moveTo(gPos.x - 6, gPos.y - 6); ctx.lineTo(gPos.x - 6 + legSwing, gPos.y + 2);
                    ctx.moveTo(gPos.x + 6, gPos.y - 6); ctx.lineTo(gPos.x + 6 - legSwing, gPos.y + 2);
                    ctx.stroke();

                    // Multi-Faceted Armored Warhorse Barding + Neck + Head
                    this.drawIsoPolyDome(ctx, u.x, u.y, 6 + breathBob, 11.5, 7.5, 10, teamLeft, 2, 8, 28, 0.25);
                    this.drawIsoBox(ctx, u.x + u.facing * 7, u.y - u.facing * 3, 12 + breathBob, 4.2, 4.2, 10, '#a16207', '#78350f', '#451a03');
                    // 8-Faceted Polished Steel Rider Cuirass + Geodesic 3D Helmet
                    this.drawIsoCylinder(ctx, u.x, u.y, 15 + breathBob, 5.4, 11, '#e2e8f0', '#cbd5e1', '#64748b', 'rgba(15,23,42,0.3)', 8, 4.6);
                    this.drawIsoPolyDome(ctx, u.x, u.y, 26 + breathBob, 5.2, 5.2, 6.5, '#f8fafc', 2, 8, 45, 0.55);

                    const riderTop = this.worldToIso(u.x, u.y, 28 + breathBob);
                    // Couched 3D Lance with Metallic Tip
                    ctx.save();
                    ctx.translate(riderTop.x, riderTop.y + 4);
                    ctx.scale(u.facing, 1);
                    ctx.rotate(Math.sin(u.swingAnim * Math.PI) * 0.85);
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 2.8;
                    ctx.beginPath();
                    ctx.moveTo(-6, 0);
                    ctx.lineTo(23, -5);
                    ctx.stroke();
                    ctx.restore();
                } else {
                    // 3D Humanoid Unit: Animated Legs + 8-Faceted Tapered Torso + 3D Domed Head/Helmet
                    ctx.strokeStyle = '#292524';
                    ctx.lineWidth = 2.6;
                    ctx.beginPath();
                    ctx.moveTo(gPos.x - 3, gPos.y - 7); ctx.lineTo(gPos.x - 3 + legSwing * 0.7, gPos.y + 1);
                    ctx.moveTo(gPos.x + 3, gPos.y - 7); ctx.lineTo(gPos.x + 3 - legSwing * 0.7, gPos.y + 1);
                    ctx.stroke();

                    this.drawIsoCylinder(ctx, u.x, u.y, 6 + breathBob, 6.2, 12.5, teamTop, teamLeft, teamRight, 'rgba(15,15,15,0.28)', 8, 4.8);
                    // 3D Shaded Head
                    this.drawIsoPolyDome(ctx, u.x, u.y, 18.5 + breathBob, 4.8, 4.8, 5.8, '#fde68a', 2, 7, 14, 0.1);

                    if (u.type === 'militia') {
                        // Specular Steel Kettle Helmet & 3D Heater Shield
                        this.drawIsoPolyDome(ctx, u.x, u.y, 21.5 + breathBob, 5.6, 5.6, 4.8, '#e2e8f0', 2, 8, 42, 0.5);
                        this.drawIsoBox(ctx, u.x - u.facing * 4, u.y + 3, 10 + breathBob, 2.5, 4.8, 8, '#cbd5e1', teamLeft, '#475569');
                    } else if (u.type === 'spearman') {
                        // Steel Conical Helmet & Round Buckler Shield
                        this.drawIsoPolyDome(ctx, u.x, u.y, 21.5 + breathBob, 5.2, 5.2, 4.6, '#cbd5e1', 2, 8, 40, 0.45);
                        this.drawIsoBox(ctx, u.x - u.facing * 4, u.y + 3, 10 + breathBob, 2.2, 4.0, 7, '#78350f', '#b45309', '#451a03');
                    } else if (u.type === 'skirmisher') {
                        // Feathered Hunting Leather Cap
                        this.drawIsoPolyDome(ctx, u.x, u.y, 21.5 + breathBob, 5.0, 5.0, 4.0, '#b45309', 2, 7, 20, 0.2);
                    } else if (u.type === 'monk') {
                        // Brown Franciscan Cowl & Hood
                        this.drawIsoPolyDome(ctx, u.x, u.y, 20.0 + breathBob, 5.4, 5.4, 4.8, '#78350f', 2, 8, 20, 0.2);
                        if (u.state === 'heal' || u.state === 'convert') {
                            const halo = this.worldToIso(u.x, u.y, 27 + breathBob);
                            ctx.strokeStyle = '#fde047';
                            ctx.lineWidth = 2.0;
                            ctx.beginPath();
                            ctx.ellipse(halo.x, halo.y, 8, 4, 0, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                    }

                    const headPos = this.worldToIso(u.x, u.y, 22 + breathBob);
                    // Animated Weapon / Tool in Hand
                    ctx.save();
                    ctx.translate(headPos.x + u.facing * 5, headPos.y + 6);
                    ctx.scale(u.facing, 1);
                    ctx.rotate(Math.sin(u.swingAnim * Math.PI) * 1.2);
                    if (u.type === 'militia') {
                        ctx.strokeStyle = '#f8fafc';
                        ctx.lineWidth = 2.8;
                        ctx.beginPath();
                        ctx.moveTo(0, 2); ctx.lineTo(13, -12);
                        ctx.stroke();
                    } else if (u.type === 'spearman') {
                        ctx.strokeStyle = '#78350f';
                        ctx.lineWidth = 2.4;
                        ctx.beginPath();
                        ctx.moveTo(-6, 12); ctx.lineTo(20, -18);
                        ctx.stroke();
                        ctx.fillStyle = '#f8fafc';
                        ctx.beginPath();
                        ctx.moveTo(18, -16); ctx.lineTo(26, -24); ctx.lineTo(21, -13);
                        ctx.fill();
                    } else if (u.type === 'archer') {
                        ctx.strokeStyle = '#b45309';
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.arc(2, 0, 7.5, -1.15, 1.15);
                        ctx.stroke();
                    } else if (u.type === 'skirmisher') {
                        ctx.strokeStyle = '#92400e';
                        ctx.lineWidth = 2.0;
                        ctx.beginPath();
                        ctx.moveTo(-6, 8); ctx.lineTo(16, -12);
                        ctx.stroke();
                        ctx.fillStyle = '#cbd5e1';
                        ctx.beginPath();
                        ctx.moveTo(14, -11); ctx.lineTo(20, -15); ctx.lineTo(15, -8);
                        ctx.fill();
                    } else if (u.type === 'monk') {
                        ctx.strokeStyle = '#ca8a04';
                        ctx.lineWidth = 2.4;
                        ctx.beginPath();
                        ctx.moveTo(-2, 12); ctx.lineTo(6, -16);
                        ctx.stroke();
                        ctx.fillStyle = '#fde047';
                        ctx.fillRect(4, -20, 4, 8);
                        ctx.fillRect(1, -18, 10, 3);
                    } else {
                        ctx.strokeStyle = '#78350f';
                        ctx.lineWidth = 2.2;
                        ctx.beginPath();
                        ctx.moveTo(0, 2); ctx.lineTo(9, -8);
                        ctx.stroke();
                        ctx.fillStyle = '#cbd5e1';
                        ctx.fillRect(6, -10, 5, 4);
                    }
                    ctx.restore();

                    if (u.type === 'villager' && u.carryAmount > 0) {
                        const sackCol = u.carryType === 'wood' ? '#78350f' : u.carryType === 'food' ? '#ef4444' : u.carryType === 'gold' ? '#facc15' : '#a8a29e';
                        this.drawIsoBox(ctx, u.x - u.facing * 4, u.y + 2, 11 + breathBob, 4.0, 4.0, 5.5, sackCol, sackCol, '#292524');
                    }
                }

                if (u.hp < u.maxHp || isSelected) {
                    const topBar = this.worldToIso(u.x, u.y, u.type === 'knight' ? 38 : 32);
                    const bw = 24;
                    const bx = topBar.x - bw / 2;
                    const by = topBar.y;
                    ctx.fillStyle = 'rgba(0,0,0,0.82)';
                    ctx.fillRect(bx, by, bw, 4);
                    const ratio = Math.max(0, u.hp / u.maxHp);
                    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
                    ctx.fillRect(bx, by, bw * ratio, 4);
                }
            }

            renderMinimap() {
                const mctx = this.miniCtx;
                const w = this.miniCanvas.width;
                const h = this.miniCanvas.height;

                mctx.fillStyle = '#0c0a08';
                mctx.fillRect(0, 0, w, h);

                // Helper to project world (wx, wy) onto the Isometric Diamond Minimap
                const toMiniIso = (wx, wy) => {
                    const nx = wx / this.worldSize;
                    const ny = wy / this.worldSize;
                    return {
                        x: w * 0.5 + (nx - ny) * (w * 0.46),
                        y: h * 0.06 + (nx + ny) * (h * 0.44)
                    };
                };

                // Diamond Map Background
                const c0 = toMiniIso(0, 0);
                const c1 = toMiniIso(this.worldSize, 0);
                const c2 = toMiniIso(this.worldSize, this.worldSize);
                const c3 = toMiniIso(0, this.worldSize);

                mctx.fillStyle = '#253f1c';
                mctx.strokeStyle = '#b48a48';
                mctx.lineWidth = 1.5;
                mctx.beginPath();
                mctx.moveTo(c0.x, c0.y);
                mctx.lineTo(c1.x, c1.y);
                mctx.lineTo(c2.x, c2.y);
                mctx.lineTo(c3.x, c3.y);
                mctx.closePath();
                mctx.fill();
                mctx.stroke();

                this.resources.forEach(r => {
                    if (r.amount <= 0) return;
                    const gx = Math.floor(r.x / this.fogCellSize);
                    const gy = Math.floor(r.y / this.fogCellSize);
                    if (this.fog[gy]?.[gx] === 0) return;
                    const mp = toMiniIso(r.x, r.y);
                    mctx.fillStyle = r.type === 'wood' ? '#16a34a' : r.type === 'gold' ? '#facc15' : '#a8a29e';
                    mctx.fillRect(mp.x - 1, mp.y - 1, 2, 2);
                });

                this.buildings.forEach(b => {
                    if (b.hp <= 0) return;
                    const gx = Math.floor(b.x / this.fogCellSize);
                    const gy = Math.floor(b.y / this.fogCellSize);
                    if (b.faction === 'enemy' && this.fog[gy]?.[gx] === 0) return;
                    const mp = toMiniIso(b.x, b.y);
                    mctx.fillStyle = b.faction === 'player' ? '#3b82f6' : '#ef4444';
                    mctx.fillRect(mp.x - 2.5, mp.y - 2.5, 5, 5);
                });

                this.units.forEach(u => {
                    if (u.hp <= 0 || u.garrisoned) return;
                    if (u.faction === 'enemy' && !this.isWorldPosVisible(u.x, u.y)) return;
                    const mp = toMiniIso(u.x, u.y);
                    mctx.fillStyle = u.faction === 'player' ? '#93c5fd' : '#fca5a5';
                    mctx.fillRect(mp.x - 1.5, mp.y - 1.5, 3, 3);
                });

                // Camera Viewport Box on Diamond Minimap
                const centerWorld = this.screenToWorld(this.canvas.width * 0.5, this.canvas.height * 0.5);
                const camMini = toMiniIso(centerWorld.x, centerWorld.y);
                const vw = Math.max(12, (this.canvas.width / this.camera.zoom) * 0.032);
                const vh = Math.max(8, (this.canvas.height / this.camera.zoom) * 0.032);
                mctx.strokeStyle = '#fef08a';
                mctx.lineWidth = 1.3;
                mctx.strokeRect(camMini.x - vw * 0.5, camMini.y - vh * 0.5, vw, vh);
            }

            isWorldPosVisible(wx, wy) {
                const gx = Math.floor(wx / this.fogCellSize);
                const gy = Math.floor(wy / this.fogCellSize);
                return this.fog[gy]?.[gx] === 2;
            }

            isWorldPosOnScreen(wx, wy) {
                const sp = this.worldToScreen(wx, wy, 0);
                return sp.x >= -80 && sp.x <= this.canvas.width + 80 && sp.y >= -80 && sp.y <= this.canvas.height + 80;
            }

            spawnExplosionParticles(x, y, color, count = 12) {
                for (let i = 0; i < count; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const sp = 20 + Math.random() * 65;
                    this.particles.push({
                        x, y,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp,
                        size: 2 + Math.random() * 2.5,
                        color,
                        life: 0.35 + Math.random() * 0.35
                    });
                }
            }

            addCommandMarker(x, y, color) {
                this.commandMarkers.push({ x, y, radius: 6, alpha: 1.0, color });
            }

            addFloatingText(x, y, text, color) {
                this.floatingTexts.push({ x, y, text, color, life: 1.1 });
            }

}

if (typeof window !== 'undefined') window.GameRendererEngine = GameRendererEngine;
if (typeof global !== 'undefined') global.GameRendererEngine = GameRendererEngine;
