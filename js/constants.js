// ==========================================
// Imperium der Zeitalter – Constants & Definitions
// ==========================================

// Safety guard to prevent IndexSizeError if any dynamic radius ever drops below 0
(() => {
    if (typeof CanvasRenderingContext2D !== 'undefined') {
        const origEllipse = CanvasRenderingContext2D.prototype.ellipse;
        if (origEllipse) {
            CanvasRenderingContext2D.prototype.ellipse = function (x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) {
                return origEllipse.call(
                    this,
                    x,
                    y,
                    Math.max(0.001, radiusX || 0),
                    Math.max(0.001, radiusY || 0),
                    rotation,
                    startAngle,
                    endAngle,
                    counterclockwise
                );
            };
        }
        const origArc = CanvasRenderingContext2D.prototype.arc;
        if (origArc) {
            CanvasRenderingContext2D.prototype.arc = function (x, y, radius, startAngle, endAngle, counterclockwise) {
                return origArc.call(
                    this,
                    x,
                    y,
                    Math.max(0.001, radius || 0),
                    startAngle,
                    endAngle,
                    counterclockwise
                );
            };
        }
    }
})();

const AGES_DEF = {
    1: { name: 'I. Dunkles Zeitalter', nextCost: { food: 400, gold: 120 } },
    2: { name: 'II. Feudalzeit', nextCost: { food: 650, gold: 300 } },
    3: { name: 'III. Ritterzeit', nextCost: { food: 950, gold: 550 } },
    4: { name: 'IV. Imperialzeit', nextCost: null }
};

const BUILDINGS_DEF = {
    towncenter: {
        name: 'Dorfzentrum', icon: '🏛️', hp: 1600, radius: 46, popBonus: 10,
        cost: { wood: 275, stone: 100 }, minAge: 1, vision: 320, trains: ['villager'],
        isDropOff: { wood: true, food: true, gold: true, stone: true },
        canGarrison: true, maxGarrison: 15, attack: 14, range: 220, attackCooldown: 1.2
    },
    house: {
        name: 'Wohnhaus', icon: '🏡', hp: 360, radius: 28, popBonus: 5,
        cost: { wood: 30 }, minAge: 1, vision: 195, trains: []
    },
    mill: {
        name: 'Mühle', icon: '🥖', hp: 460, radius: 30, popBonus: 0,
        cost: { wood: 100 }, minAge: 1, vision: 190, trains: [],
        isDropOff: { food: true },
        researches: ['wheelbarrow', 'double_axe']
    },
    farm: {
        name: 'Terrassenfarm', icon: '🌾', hp: 240, radius: 28, popBonus: 0,
        cost: { wood: 60 }, minAge: 1, vision: 160, isFarm: true, trains: []
    },
    lumbercamp: {
        name: 'Holzfällerlager', icon: '🪓', hp: 460, radius: 28, popBonus: 0,
        cost: { wood: 100 }, minAge: 1, vision: 190, trains: [],
        isDropOff: { wood: true },
        researches: ['double_axe']
    },
    miningcamp: {
        name: 'Bergbaulager', icon: '⛏️', hp: 460, radius: 28, popBonus: 0,
        cost: { wood: 100 }, minAge: 1, vision: 190, trains: [],
        isDropOff: { gold: true, stone: true }
    },
    blacksmith: {
        name: 'Waffenschmiede', icon: '🔨', hp: 650, radius: 34, popBonus: 0,
        cost: { wood: 150 }, minAge: 2, vision: 210, trains: [],
        researches: ['forging', 'iron_armor', 'fletching']
    },
    barracks: {
        name: 'Kaserne', icon: '⚔️', hp: 750, radius: 38, popBonus: 0,
        cost: { wood: 140 }, minAge: 1, vision: 230, trains: ['militia', 'spearman']
    },
    archery: {
        name: 'Schießplatz', icon: '🏹', hp: 680, radius: 38, popBonus: 0,
        cost: { wood: 150, gold: 50 }, minAge: 2, vision: 240, trains: ['archer', 'skirmisher']
    },
    stable: {
        name: 'Gestüt', icon: '🐎', hp: 820, radius: 40, popBonus: 0,
        cost: { wood: 175, gold: 75 }, minAge: 3, vision: 250, trains: ['knight']
    },
    monastery: {
        name: 'Kloster', icon: '⛪', hp: 700, radius: 36, popBonus: 0,
        cost: { wood: 175 }, minAge: 3, vision: 250, trains: ['monk']
    },
    tower: {
        name: 'Wachturm', icon: '🗼', hp: 750, radius: 24, popBonus: 0,
        cost: { stone: 125, wood: 50 }, minAge: 2, vision: 330,
        attack: 16, range: 235, attackCooldown: 1.15, trains: [],
        canGarrison: true, maxGarrison: 5
    },
    castle: {
        name: 'Burg', icon: '🏰', hp: 2600, radius: 54, popBonus: 12,
        cost: { stone: 420, gold: 200 }, minAge: 3, vision: 380,
        attack: 30, range: 280, attackCooldown: 0.95, trains: ['knight', 'catapult'],
        canGarrison: true, maxGarrison: 20
    },
    wall: {
        name: 'Steinmauer', icon: '🧱', hp: 900, radius: 16, popBonus: 0,
        cost: { stone: 15 }, minAge: 1, vision: 120, trains: []
    }
};

const UNITS_DEF = {
    villager: {
        name: 'Dorfbewohner', icon: '👷', hp: 70, speed: 84, attack: 6,
        range: 18, cooldown: 1.1, radius: 12, vision: 220, minAge: 1,
        trainTime: 5, cost: { food: 50 }, armor: { melee: 0, pierce: 0 }
    },
    militia: {
        name: 'Schwertkämpfer', icon: '🗡️', hp: 130, speed: 88, attack: 16,
        range: 20, cooldown: 0.95, radius: 13, vision: 230, minAge: 1,
        trainTime: 6, cost: { food: 60, gold: 20 }, armor: { melee: 1, pierce: 1 }
    },
    spearman: {
        name: 'Speerträger', icon: '🔱', hp: 95, speed: 90, attack: 7,
        range: 24, cooldown: 1.0, radius: 13, vision: 230, minAge: 1,
        trainTime: 6, cost: { food: 35, wood: 25 }, bonusVs: { knight: 3.8 },
        armor: { melee: 0, pierce: 0 }
    },
    archer: {
        name: 'Bogenschütze', icon: '🏹', hp: 85, speed: 92, attack: 13,
        range: 175, cooldown: 1.25, radius: 12, vision: 270, minAge: 2,
        trainTime: 7, cost: { wood: 45, gold: 35 }, projectile: 'arrow',
        armor: { melee: 0, pierce: 0 }
    },
    skirmisher: {
        name: 'Plänkler', icon: '🎯', hp: 75, speed: 94, attack: 7,
        range: 170, cooldown: 1.15, radius: 12, vision: 270, minAge: 2,
        trainTime: 7, cost: { food: 25, wood: 35 }, projectile: 'javelin',
        bonusVs: { archer: 3.2 }, armor: { melee: 0, pierce: 3 }
    },
    knight: {
        name: 'Ritter', icon: '🐎', hp: 220, speed: 128, attack: 25,
        range: 24, cooldown: 1.05, radius: 16, vision: 250, minAge: 3,
        trainTime: 10, cost: { food: 75, gold: 70 }, armor: { melee: 2, pierce: 2 }
    },
    monk: {
        name: 'Mönch', icon: '📿', hp: 60, speed: 72, attack: 0,
        range: 175, cooldown: 1.8, radius: 12, vision: 250, minAge: 3,
        trainTime: 12, cost: { gold: 100 }, isHealer: true, canConvert: true,
        armor: { melee: 0, pierce: 0 }
    },
    catapult: {
        name: 'Katapult', icon: '☄️', hp: 170, speed: 58, attack: 60,
        range: 260, cooldown: 2.8, radius: 18, vision: 290, minAge: 3,
        trainTime: 13, cost: { wood: 145, gold: 115 },
        projectile: 'boulder', splash: 50, buildingBonus: 2.4,
        armor: { melee: 0, pierce: 6 }
    }
};

const TECHS_DEF = {
    forging: {
        name: 'Schmiedekunst', icon: '⚔️', cost: { food: 150, gold: 100 },
        desc: '+2 Nahkampf-Angriff (Infanterie, Ritter & Piken)', minAge: 2
    },
    iron_armor: {
        name: 'Schuppenpanzer', icon: '🛡️', cost: { food: 100, gold: 80 },
        desc: '+2 Rüstung (Nahkampf & Pfeile) für alle Einheiten', minAge: 2
    },
    fletching: {
        name: 'Befiederung', icon: '🏹', cost: { food: 100, gold: 50 },
        desc: '+25 Reichweite & +2 Schaden für Schützen & Türme', minAge: 2
    },
    wheelbarrow: {
        name: 'Schubkarre', icon: '🛒', cost: { food: 150, wood: 50 },
        desc: '+25% Lauftempo & +5 Tragekapazität für Dorfbewohner', minAge: 2
    },
    double_axe: {
        name: 'Doppelaxt', icon: '🪓', cost: { food: 100, wood: 50 },
        desc: '+25% Holzfäller-Geschwindigkeit', minAge: 2
    }
};

const CIVS_DEF = {
    franks: {
        name: 'Franken', icon: '⚜️',
        desc: '+20% Ritter-LP, Burgen kosten 100 Stein weniger',
        color: '#3b82f6'
    },
    britons: {
        name: 'Briten', icon: '🏹',
        desc: '+30 Schussreichweite & +1 Angriff für Fernkämpfer',
        color: '#10b981'
    },
    teutons: {
        name: 'Teutonen', icon: '🛡️',
        desc: '+2 Nahkampfrüstung für Infanterie, Türme fassen bis zu 10 Einheiten',
        color: '#f59e0b'
    },
    mongols: {
        name: 'Mongolen', icon: '🐎',
        desc: '+20% Tempo für Kavallerie, Jäger & Sammler arbeiten 40% schneller',
        color: '#ef4444'
    }
};

if (typeof window !== 'undefined') {
    window.AGES_DEF = AGES_DEF;
    window.BUILDINGS_DEF = BUILDINGS_DEF;
    window.UNITS_DEF = UNITS_DEF;
    window.TECHS_DEF = TECHS_DEF;
    window.CIVS_DEF = CIVS_DEF;
}
if (typeof global !== 'undefined') {
    global.AGES_DEF = AGES_DEF;
    global.BUILDINGS_DEF = BUILDINGS_DEF;
    global.UNITS_DEF = UNITS_DEF;
    global.TECHS_DEF = TECHS_DEF;
    global.CIVS_DEF = CIVS_DEF;
}

