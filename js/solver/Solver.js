// Solver.js - Enhanced Rubik's Cube Solver with CFOP-based Layer-by-Layer Method
// Improved algorithms with phase tracking for better solutions

export class Solver {
    constructor() {
        // Corner and edge definitions (facelet indices)
        // Facelets indexed 0-53: U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)

        // Correct corner definitions based on standard cube orientation
        this.corners = [
            { facelets: [8, 9, 20], faces: ['U', 'R', 'F'], name: 'URF' },
            { facelets: [6, 18, 38], faces: ['U', 'F', 'L'], name: 'UFL' },
            { facelets: [0, 36, 47], faces: ['U', 'L', 'B'], name: 'ULB' },
            { facelets: [2, 45, 11], faces: ['U', 'B', 'R'], name: 'UBR' },
            { facelets: [29, 15, 26], faces: ['D', 'R', 'F'], name: 'DRF' },
            { facelets: [27, 24, 44], faces: ['D', 'F', 'L'], name: 'DFL' },
            { facelets: [33, 42, 53], faces: ['D', 'L', 'B'], name: 'DLB' },
            { facelets: [35, 51, 17], faces: ['D', 'B', 'R'], name: 'DBR' }
        ];

        // Edges: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
        this.edges = [
            { facelets: [5, 10], faces: ['U', 'R'], name: 'UR' },
            { facelets: [7, 19], faces: ['U', 'F'], name: 'UF' },
            { facelets: [3, 37], faces: ['U', 'L'], name: 'UL' },
            { facelets: [1, 46], faces: ['U', 'B'], name: 'UB' },
            { facelets: [32, 16], faces: ['D', 'R'], name: 'DR' },
            { facelets: [28, 25], faces: ['D', 'F'], name: 'DF' },
            { facelets: [30, 43], faces: ['D', 'L'], name: 'DL' },
            { facelets: [34, 52], faces: ['D', 'B'], name: 'DB' },
            { facelets: [23, 12], faces: ['F', 'R'], name: 'FR' },
            { facelets: [21, 41], faces: ['F', 'L'], name: 'FL' },
            { facelets: [50, 39], faces: ['B', 'L'], name: 'BL' },
            { facelets: [48, 14], faces: ['B', 'R'], name: 'BR' }
        ];

        this.faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        this.solution = [];
        this.phases = [];
    }

    /**
     * Main solve entry point
     * @param {Object} paintState - { U: [9 colors], R: [9], F: [9], D: [9], L: [9], B: [9] }
     * @returns {Object} - { success: boolean, solution: string[], phases: object[], error: string }
     */
    solve(paintState) {
        try {
            // STEP 1 & 2: Center & Color Count Validation
            const validation = this.validateState(paintState);
            if (!validation.valid) {
                return { success: false, solution: [], phases: [], error: validation.error };
            }

            // STEP 3: Map colors to standard faces (U, R, F, D, L, B)
            const colorToFace = this.mapColorsToFaces(paintState);

            // STEP 4: Convert painted colors to facelet string
            const facelets = this.toFaceletString(paintState, colorToFace);

            // STEP 5: Convert facelets to Cubies (Corner/Edge pieces)
            const cubies = this.faceletsToCubies(facelets);
            if (cubies.error) {
                return { success: false, solution: [], phases: [], error: cubies.error };
            }

            // STEP 6: Validate Global Invariants (Parity, Orientation)
            const invariantCheck = this.validateInvariants(cubies);
            if (!invariantCheck.valid) {
                return { success: false, solution: [], phases: [], error: invariantCheck.error };
            }

            // STEP 7: Solve using improved layer-by-layer
            const result = this.solveCube(facelets);

            // STEP 8: Optimize moves
            const optimized = this.optimizeMoves(result.solution);

            return {
                success: true,
                solution: optimized,
                phases: result.phases,
                error: null
            };
        } catch (e) {
            console.error('Solver error:', e);
            return { success: false, solution: [], phases: [], error: `Solver error: ${e.message}` };
        }
    }

    validateState(paintState) {
        // 1. Check Center Uniqueness
        const centers = {};
        for (const face of this.faceOrder) {
            const centerColor = paintState[face][4];
            if (centers[centerColor]) {
                const existingFace = this.getFaceName(centers[centerColor]);
                const currentFace = this.getFaceName(face);
                return { valid: false, error: `Duplicate center color '${centerColor}' on ${existingFace} and ${currentFace}. Centers must be unique.` };
            }
            centers[centerColor] = face;
        }

        if (Object.keys(centers).length !== 6) {
            return { valid: false, error: 'Must have 6 unique center colors.' };
        }

        // 2. Check Color Counts
        const colorCounts = {};
        Object.keys(centers).forEach(c => colorCounts[c] = 0);

        for (const face of this.faceOrder) {
            for (const color of paintState[face]) {
                if (colorCounts[color] === undefined) {
                    return { valid: false, error: `Sticker color '${color}' does not match any center.` };
                }
                colorCounts[color]++;
            }
        }

        for (const [color, count] of Object.entries(colorCounts)) {
            if (count > 9) {
                const faceName = this.getFaceName(centers[color]);
                return { valid: false, error: `Too many '${color}' stickers (${count}). Maximum is 9 (Center: ${faceName}).` };
            }
            if (count < 9) {
                const faceName = this.getFaceName(centers[color]);
                return { valid: false, error: `Not enough '${color}' stickers (${count}). Need 9 (Center: ${faceName}).` };
            }
        }

        return { valid: true };
    }

    getFaceName(faceCode) {
        const names = { 'U': 'Up', 'D': 'Down', 'F': 'Front', 'B': 'Back', 'L': 'Left', 'R': 'Right' };
        return names[faceCode] || faceCode;
    }

    mapColorsToFaces(paintState) {
        const colorToFace = {};
        for (const face of this.faceOrder) {
            const centerColor = paintState[face][4];
            colorToFace[centerColor] = face;
        }
        return colorToFace;
    }

    toFaceletString(paintState, colorToFace) {
        let facelets = '';
        for (const face of this.faceOrder) {
            for (let i = 0; i < 9; i++) {
                const color = paintState[face][i];
                const mappedFace = colorToFace[color];
                if (!mappedFace) {
                    throw new Error(`Unknown color "${color}" at ${face}[${i}]`);
                }
                facelets += mappedFace;
            }
        }
        return facelets;
    }

    faceletsToCubies(facelets) {
        const cornerPositions = [];
        const cornerOrientations = [];
        const edgePositions = [];
        const edgeOrientations = [];

        // Identify corners
        for (let i = 0; i < 8; i++) {
            const corner = this.corners[i];
            const colors = corner.facelets.map(idx => facelets[idx]);
            const unique = new Set(colors);
            if (unique.size !== 3) {
                return { error: `Corner piece at ${this.getCornerName(i)} has duplicate colors.` };
            }
            const found = this.findCorner(colors);
            if (found.index === -1) {
                return { error: `Impossible corner piece at ${this.getCornerName(i)} (Colors do not form a valid corner).` };
            }
            cornerPositions.push(found.index);
            cornerOrientations.push(found.orientation);
        }

        // Identify edges
        for (let i = 0; i < 12; i++) {
            const edge = this.edges[i];
            const colors = edge.facelets.map(idx => facelets[idx]);
            if (colors[0] === colors[1]) {
                return { error: `Edge piece at ${this.getEdgeName(i)} has duplicate colors.` };
            }
            const found = this.findEdge(colors);
            if (found.index === -1) {
                return { error: `Impossible edge piece at ${this.getEdgeName(i)} (Colors do not form a valid edge).` };
            }
            edgePositions.push(found.index);
            edgeOrientations.push(found.orientation);
        }

        return { cornerPositions, cornerOrientations, edgePositions, edgeOrientations };
    }

    findCorner(colors) {
        const stdCorners = [
            ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
            ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B']
        ];

        for (let i = 0; i < 8; i++) {
            const target = stdCorners[i];
            for (let o = 0; o < 3; o++) {
                if (colors[0] === target[o] &&
                    colors[1] === target[(o + 1) % 3] &&
                    colors[2] === target[(o + 2) % 3]) {
                    return { index: i, orientation: o };
                }
            }
        }
        return { index: -1, orientation: 0 };
    }

    findEdge(colors) {
        const solvedEdges = [
            ['U', 'R'], ['U', 'F'], ['U', 'L'], ['U', 'B'],
            ['D', 'R'], ['D', 'F'], ['D', 'L'], ['D', 'B'],
            ['F', 'R'], ['F', 'L'], ['B', 'L'], ['B', 'R']
        ];

        for (let i = 0; i < 12; i++) {
            const target = solvedEdges[i];
            if (colors[0] === target[0] && colors[1] === target[1]) {
                return { index: i, orientation: 0 };
            }
            if (colors[0] === target[1] && colors[1] === target[0]) {
                return { index: i, orientation: 1 };
            }
        }
        return { index: -1, orientation: 0 };
    }

    getCornerName(index) {
        const names = ['Top-Right-Front', 'Top-Front-Left', 'Top-Left-Back', 'Top-Back-Right',
            'Bottom-Right-Front', 'Bottom-Front-Left', 'Bottom-Left-Back', 'Bottom-Back-Right'];
        return names[index] || `Corner ${index}`;
    }

    getEdgeName(index) {
        const names = ['Top-Right', 'Top-Front', 'Top-Left', 'Top-Back',
            'Bottom-Right', 'Bottom-Front', 'Bottom-Left', 'Bottom-Back',
            'Front-Right', 'Front-Left', 'Back-Left', 'Back-Right'];
        return names[index] || `Edge ${index}`;
    }

    validateInvariants(cubies) {
        const { cornerPositions, cornerOrientations, edgePositions, edgeOrientations } = cubies;

        if (new Set(cornerPositions).size !== 8) {
            return { valid: false, error: 'Cube contains duplicate corner pieces. Check for duplicate corners.' };
        }
        if (new Set(edgePositions).size !== 12) {
            return { valid: false, error: 'Cube contains duplicate edge pieces. Check for duplicate edges.' };
        }

        const cornerOrientSum = cornerOrientations.reduce((a, b) => a + b, 0);
        if (cornerOrientSum % 3 !== 0) {
            return { valid: false, error: 'Unsolvable State: One or more corners are twisted physically.' };
        }

        const edgeOrientSum = edgeOrientations.reduce((a, b) => a + b, 0);
        if (edgeOrientSum % 2 !== 0) {
            return { valid: false, error: 'Unsolvable State: One or more edges are flipped physically.' };
        }

        const cornerParity = this.calculateParity(cornerPositions);
        const edgeParity = this.calculateParity(edgePositions);
        if (cornerParity !== edgeParity) {
            return { valid: false, error: 'Unsolvable State: Parity mismatch (likely 2 pieces swapped). Impossible to solve.' };
        }

        return { valid: true };
    }

    calculateParity(arr) {
        let parity = 0;
        const copy = [...arr];
        for (let i = 0; i < copy.length; i++) {
            while (copy[i] !== i) {
                const target = copy[i];
                [copy[i], copy[target]] = [copy[target], copy[i]];
                parity = 1 - parity;
            }
        }
        return parity;
    }

    /**
     * Enhanced Layer-by-Layer Solving
     */
    solveCube(facelets) {
        this.state = this.createState(facelets);
        this.solution = [];
        this.phases = [];

        let phaseStart = 0;

        // Phase 1: White Cross (on U face)
        this.solveWhiteCross();
        this.phases.push({
            name: 'White Cross',
            icon: '➕',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Creating the white cross on top'
        });
        phaseStart = this.solution.length;

        // Phase 2: White Corners (First Layer)
        this.solveWhiteCorners();
        this.phases.push({
            name: 'First Layer',
            icon: '🧱',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Inserting white corners'
        });
        phaseStart = this.solution.length;

        // Phase 3: Middle Layer (F2L edges)
        this.solveMiddleLayer();
        this.phases.push({
            name: 'Second Layer',
            icon: '📦',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Solving middle layer edges'
        });
        phaseStart = this.solution.length;

        // Phase 4: Yellow Cross (OLL part 1)
        this.solveYellowCross();
        this.phases.push({
            name: 'Yellow Cross',
            icon: '✚',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Creating yellow cross'
        });
        phaseStart = this.solution.length;

        // Phase 5: Yellow Face (OLL part 2)
        this.solveYellowFace();
        this.phases.push({
            name: 'Yellow Face',
            icon: '🟡',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Orienting yellow corners'
        });
        phaseStart = this.solution.length;

        // Phase 6: Position Last Layer (PLL)
        this.solveLastLayer();
        this.phases.push({
            name: 'Final Layer',
            icon: '✨',
            moves: [...this.solution.slice(phaseStart)],
            description: 'Permuting last layer'
        });

        return { solution: this.solution, phases: this.phases };
    }

    createState(facelets) {
        const state = {};
        let idx = 0;
        for (const face of this.faceOrder) {
            state[face] = [];
            for (let i = 0; i < 9; i++) {
                state[face].push(facelets[idx++]);
            }
        }
        return state;
    }

    doMoves(moveStr) {
        const moves = moveStr.split(/\s+/).filter(m => m);
        for (const move of moves) {
            this.applyMove(move);
            this.solution.push(move);
        }
    }

    applyMove(move) {
        const face = move[0];
        const prime = move.includes("'");
        const double = move.includes("2");
        const times = double ? 2 : (prime ? 3 : 1);

        for (let t = 0; t < times; t++) {
            this.rotateFace(face);
        }
    }

    rotateFace(face) {
        const f = this.state[face];
        const temp = [f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]];
        f[0] = temp[6]; f[1] = temp[3]; f[2] = temp[0];
        f[3] = temp[7]; f[4] = temp[4]; f[5] = temp[1];
        f[6] = temp[8]; f[7] = temp[5]; f[8] = temp[2];

        const adj = this.getAdjacentEdges(face);
        const buffer = adj[0].map(([f, i]) => this.state[f][i]);
        for (let i = 0; i < 4; i++) {
            const src = adj[(i + 3) % 4];
            const dst = adj[i];
            for (let j = 0; j < 3; j++) {
                if (i === 0) {
                    this.state[dst[j][0]][dst[j][1]] = buffer[j];
                } else {
                    this.state[dst[j][0]][dst[j][1]] = this.state[src[j][0]][src[j][1]];
                }
            }
        }
    }

    getAdjacentEdges(face) {
        const edges = {
            'U': [[['B', 0], ['B', 1], ['B', 2]], [['R', 0], ['R', 1], ['R', 2]], [['F', 0], ['F', 1], ['F', 2]], [['L', 0], ['L', 1], ['L', 2]]],
            'D': [[['F', 6], ['F', 7], ['F', 8]], [['R', 6], ['R', 7], ['R', 8]], [['B', 6], ['B', 7], ['B', 8]], [['L', 6], ['L', 7], ['L', 8]]],
            'R': [[['U', 8], ['U', 5], ['U', 2]], [['B', 0], ['B', 3], ['B', 6]], [['D', 8], ['D', 5], ['D', 2]], [['F', 8], ['F', 5], ['F', 2]]],
            'L': [[['U', 0], ['U', 3], ['U', 6]], [['F', 0], ['F', 3], ['F', 6]], [['D', 0], ['D', 3], ['D', 6]], [['B', 8], ['B', 5], ['B', 2]]],
            'F': [[['U', 6], ['U', 7], ['U', 8]], [['R', 0], ['R', 3], ['R', 6]], [['D', 2], ['D', 1], ['D', 0]], [['L', 8], ['L', 5], ['L', 2]]],
            'B': [[['U', 2], ['U', 1], ['U', 0]], [['L', 0], ['L', 3], ['L', 6]], [['D', 6], ['D', 7], ['D', 8]], [['R', 8], ['R', 5], ['R', 2]]]
        };
        return edges[face];
    }

    // ==================== PHASE 1: WHITE CROSS ====================
    solveWhiteCross() {
        const crossEdges = [
            { uIdx: 7, side: 'F', sideIdx: 1 },  // UF edge
            { uIdx: 5, side: 'R', sideIdx: 1 },  // UR edge
            { uIdx: 1, side: 'B', sideIdx: 1 },  // UB edge
            { uIdx: 3, side: 'L', sideIdx: 1 }   // UL edge
        ];

        for (const target of crossEdges) {
            this.solveWhiteCrossEdge(target);
        }
    }

    solveWhiteCrossEdge(target) {
        const maxAttempts = 20;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Check if already solved
            if (this.state.U[target.uIdx] === 'U' &&
                this.state[target.side][target.sideIdx] === target.side) {
                return;
            }

            // Find the U-<side> edge (white + target.side color)
            const loc = this.findEdge('U', target.side);
            if (!loc) continue;

            // Edge is in top layer with white on U - might need alignment or flip
            if (loc.face1 === 'U') {
                if (loc.idx1 === target.uIdx) {
                    // In correct position but side color wrong - flip it
                    this.doMoves(`${target.side} ${target.side}`);
                    continue;
                }
                // Wrong position in U layer - move to bottom first
                this.doMoves(`${loc.side} ${loc.side}`);
                continue;
            }

            // Edge is in top layer with white on side face
            if (loc.face2 === 'U') {
                // White is on the side, need to insert with orientation fix
                const sideWithWhite = loc.face1;
                // Move to bottom, then reinsert
                this.doMoves(`${sideWithWhite}'`);
                this.alignBottomEdge(target.side, sideWithWhite);
                continue;
            }

            // Edge is in bottom layer
            if (loc.face1 === 'D' || loc.face2 === 'D') {
                // Align with target slot
                const edgeSide = loc.side;
                this.alignBottomEdge(target.side, edgeSide);

                // Insert: rotate twice
                if (this.state.D[this.getBottomEdgeIdx(target.side)] === 'U') {
                    // White facing down - double rotation
                    this.doMoves(`${target.side} ${target.side}`);
                } else {
                    // White facing side - need different insert
                    this.doMoves(`${target.side}' U' ${this.getRightOf(target.side)} U`);
                }
                continue;
            }

            // Edge is in middle layer
            this.moveMiddleEdgeToBottom(loc, target.side);
        }
    }

    getBottomEdgeIdx(side) {
        const map = { 'F': 1, 'R': 5, 'B': 7, 'L': 3 };
        return map[side];
    }

    alignBottomEdge(targetSide, currentSide) {
        const sides = ['F', 'R', 'B', 'L'];
        const targetIdx = sides.indexOf(targetSide);
        const currentIdx = sides.indexOf(currentSide);

        if (targetIdx === currentIdx) return;

        const diff = (targetIdx - currentIdx + 4) % 4;
        if (diff === 1) this.doMoves("D'");
        else if (diff === 2) this.doMoves("D2");
        else if (diff === 3) this.doMoves("D");
    }

    moveMiddleEdgeToBottom(loc, targetSide) {
        // Middle layer edges: FR(8), FL(9), BL(10), BR(11)
        const edgeMoves = {
            'FR': "R' D' R",
            'FL': "L D L'",
            'BL': "L' D' L",
            'BR': "R D R'"
        };

        // Determine which middle edge
        const edgeName = `${loc.face1}${loc.face2}`;
        const reverseName = `${loc.face2}${loc.face1}`;

        if (edgeMoves[edgeName]) {
            this.doMoves(edgeMoves[edgeName]);
        } else if (edgeMoves[reverseName]) {
            this.doMoves(edgeMoves[reverseName]);
        }
    }

    getRightOf(side) {
        const order = ['F', 'R', 'B', 'L'];
        const idx = order.indexOf(side);
        return order[(idx + 1) % 4];
    }

    findEdge(c1, c2) {
        const positions = [
            { face1: 'U', idx1: 7, face2: 'F', idx2: 1, side: 'F' },
            { face1: 'U', idx1: 5, face2: 'R', idx2: 1, side: 'R' },
            { face1: 'U', idx1: 1, face2: 'B', idx2: 1, side: 'B' },
            { face1: 'U', idx1: 3, face2: 'L', idx2: 1, side: 'L' },
            { face1: 'D', idx1: 1, face2: 'F', idx2: 7, side: 'F' },
            { face1: 'D', idx1: 5, face2: 'R', idx2: 7, side: 'R' },
            { face1: 'D', idx1: 7, face2: 'B', idx2: 7, side: 'B' },
            { face1: 'D', idx1: 3, face2: 'L', idx2: 7, side: 'L' },
            { face1: 'F', idx1: 5, face2: 'R', idx2: 3, side: 'FR' },
            { face1: 'F', idx1: 3, face2: 'L', idx2: 5, side: 'FL' },
            { face1: 'B', idx1: 5, face2: 'L', idx2: 3, side: 'BL' },
            { face1: 'B', idx1: 3, face2: 'R', idx2: 5, side: 'BR' }
        ];

        for (const p of positions) {
            const a = this.state[p.face1][p.idx1];
            const b = this.state[p.face2][p.idx2];
            if ((a === c1 && b === c2) || (a === c2 && b === c1)) {
                return p;
            }
        }
        return null;
    }

    // ==================== PHASE 2: WHITE CORNERS ====================
    solveWhiteCorners() {
        const corners = [
            { uIdx: 8, side1: 'F', side2: 'R', idx1: 2, idx2: 0 },  // UFR
            { uIdx: 6, side1: 'L', side2: 'F', idx1: 2, idx2: 0 },  // ULF
            { uIdx: 0, side1: 'B', side2: 'L', idx1: 2, idx2: 0 },  // UBL
            { uIdx: 2, side1: 'R', side2: 'B', idx1: 2, idx2: 0 }   // URB
        ];

        for (const target of corners) {
            this.solveWhiteCorner(target);
        }
    }

    solveWhiteCorner(target) {
        const rightSide = target.side2;
        for (let attempt = 0; attempt < 30; attempt++) {
            // Check if solved
            if (this.state.U[target.uIdx] === 'U' &&
                this.state[target.side1][target.idx1] === target.side1 &&
                this.state[target.side2][target.idx2] === target.side2) {
                return;
            }

            // Check if corner is in the target position but wrong orientation
            const topColors = [
                this.state.U[target.uIdx],
                this.state[target.side1][target.idx1],
                this.state[target.side2][target.idx2]
            ];

            if (topColors.includes('U') && topColors.includes(target.side1) && topColors.includes(target.side2)) {
                // Corner in right place, wrong orientation - pop it out
                this.doMoves(`${rightSide}' D' ${rightSide}`);
                continue;
            }

            // Find the corner with U + side1 + side2 colors
            const loc = this.findCornerLocation('U', target.side1, target.side2);
            if (!loc) continue;

            // If corner is in top layer wrong slot, pop it out
            if (loc.layer === 'U') {
                // Rotate to get corner above its position, then pop
                this.doMoves(`${loc.rightSide}' D' ${loc.rightSide}`);
                continue;
            }

            // Corner is in bottom layer - align it under target slot
            this.alignBottomCorner(target.side2, loc.bottomSide);

            // Insert based on white sticker orientation
            const whitePos = this.getWhitePositionInBottomCorner(target);

            if (whitePos === 'D') {
                // White facing down - R' D2 R D R' D' R
                this.doMoves(`${rightSide}' D2 ${rightSide} D ${rightSide}' D' ${rightSide}`);
            } else if (whitePos === 'right') {
                // White facing right side - R' D' R
                this.doMoves(`${rightSide}' D' ${rightSide}`);
            } else {
                // White facing front side - D R' D' R (or F D F')
                const leftSide = target.side1;
                this.doMoves(`${leftSide} D ${leftSide}'`);
            }
        }
    }

    findCornerLocation(c1, c2, c3) {
        // Check all 8 corner positions
        const cornerPositions = [
            { layer: 'U', uIdx: 8, s1: 'F', i1: 2, s2: 'R', i2: 0, rightSide: 'R' },
            { layer: 'U', uIdx: 6, s1: 'L', i1: 2, s2: 'F', i2: 0, rightSide: 'F' },
            { layer: 'U', uIdx: 0, s1: 'B', i1: 2, s2: 'L', i2: 0, rightSide: 'L' },
            { layer: 'U', uIdx: 2, s1: 'R', i1: 2, s2: 'B', i2: 0, rightSide: 'B' },
            { layer: 'D', dIdx: 2, s1: 'F', i1: 8, s2: 'R', i2: 6, bottomSide: 'R' },
            { layer: 'D', dIdx: 0, s1: 'L', i1: 8, s2: 'F', i2: 6, bottomSide: 'F' },
            { layer: 'D', dIdx: 6, s1: 'B', i1: 8, s2: 'L', i2: 6, bottomSide: 'L' },
            { layer: 'D', dIdx: 8, s1: 'R', i1: 8, s2: 'B', i2: 6, bottomSide: 'B' }
        ];

        for (const pos of cornerPositions) {
            let colors;
            if (pos.layer === 'U') {
                colors = [
                    this.state.U[pos.uIdx],
                    this.state[pos.s1][pos.i1],
                    this.state[pos.s2][pos.i2]
                ];
            } else {
                colors = [
                    this.state.D[pos.dIdx],
                    this.state[pos.s1][pos.i1],
                    this.state[pos.s2][pos.i2]
                ];
            }

            if (colors.includes(c1) && colors.includes(c2) && colors.includes(c3)) {
                return pos;
            }
        }
        return null;
    }

    alignBottomCorner(targetSide, currentSide) {
        const sides = ['F', 'R', 'B', 'L'];
        const targetIdx = sides.indexOf(targetSide);
        const currentIdx = sides.indexOf(currentSide);

        if (targetIdx === currentIdx) return;

        const diff = (targetIdx - currentIdx + 4) % 4;
        if (diff === 1) this.doMoves("D'");
        else if (diff === 2) this.doMoves("D2");
        else if (diff === 3) this.doMoves("D");
    }

    getWhitePositionInBottomCorner(target) {
        // Bottom right corner under the target slot
        const bottomD = 2; // DFR position in D face (index 2)
        const bottomF = 8; // index 8 of F face
        const bottomR = 6; // index 6 of R face

        // Map based on target slot
        const slotMap = {
            'R': { dIdx: 2, fSide: 'F', fIdx: 8, rSide: 'R', rIdx: 6 },
            'F': { dIdx: 0, fSide: 'L', fIdx: 8, rSide: 'F', rIdx: 6 },
            'L': { dIdx: 6, fSide: 'B', fIdx: 8, rSide: 'L', rIdx: 6 },
            'B': { dIdx: 8, fSide: 'R', fIdx: 8, rSide: 'B', rIdx: 6 }
        };

        const slot = slotMap[target.side2];
        if (this.state.D[slot.dIdx] === 'U') return 'D';
        if (this.state[slot.rSide][slot.rIdx] === 'U') return 'right';
        return 'front';
    }

    // ==================== PHASE 3: MIDDLE LAYER ====================
    solveMiddleLayer() {
        const slots = [
            { edge: ['F', 'R'], fIdx: 5, sIdx: 3, fSide: 'F', sSide: 'R' },
            { edge: ['R', 'B'], fIdx: 5, sIdx: 3, fSide: 'R', sSide: 'B' },
            { edge: ['B', 'L'], fIdx: 5, sIdx: 3, fSide: 'B', sSide: 'L' },
            { edge: ['L', 'F'], fIdx: 5, sIdx: 3, fSide: 'L', sSide: 'F' }
        ];

        for (const slot of slots) {
            this.solveMiddleEdge(slot);
        }
    }

    solveMiddleEdge(slot) {
        for (let attempt = 0; attempt < 20; attempt++) {
            // Check if solved
            if (this.state[slot.fSide][slot.fIdx] === slot.fSide &&
                this.state[slot.sSide][slot.sIdx] === slot.sSide) {
                return;
            }

            // Find the edge with these two colors (neither is D/yellow)
            const loc = this.findMiddleEdge(slot.fSide, slot.sSide);
            if (!loc) continue;

            // If edge is in middle layer wrong slot, pop it out
            if (loc.layer === 'M') {
                this.popMiddleEdge(loc);
                continue;
            }

            // Edge is in top layer (D face is up after orientation)
            // Actually we're solving with U=white, D=yellow
            // Middle edges can only be found in D layer (yellow top) or middle

            // Align edge with its slot
            const edgeTopColor = this.state[loc.side][loc.topIdx];
            this.alignTopEdgeWithSide(edgeTopColor);

            // Check which way to insert
            if (loc.side === slot.fSide) {
                // Insert to the right
                this.doMoves(`D' ${slot.sSide}' D ${slot.sSide} D ${slot.fSide} D' ${slot.fSide}'`);
            } else {
                // Insert to the left  
                this.doMoves(`D ${slot.fSide} D' ${slot.fSide}' D' ${slot.sSide}' D ${slot.sSide}`);
            }
        }
    }

    findMiddleEdge(c1, c2) {
        // Check top layer (D edges since we're solving bottom-up conceptually)
        const topEdges = [
            { face: 'D', idx: 1, side: 'F', topIdx: 7, layer: 'T' },
            { face: 'D', idx: 5, side: 'R', topIdx: 7, layer: 'T' },
            { face: 'D', idx: 7, side: 'B', topIdx: 7, layer: 'T' },
            { face: 'D', idx: 3, side: 'L', topIdx: 7, layer: 'T' }
        ];

        for (const e of topEdges) {
            const col1 = this.state.D[e.idx];
            const col2 = this.state[e.side][e.topIdx];
            if ((col1 === c1 && col2 === c2) || (col1 === c2 && col2 === c1)) {
                return e;
            }
        }

        // Check middle layer
        const midEdges = [
            { s1: 'F', i1: 5, s2: 'R', i2: 3, layer: 'M' },
            { s1: 'R', i1: 5, s2: 'B', i2: 3, layer: 'M' },
            { s1: 'B', i1: 5, s2: 'L', i2: 3, layer: 'M' },
            { s1: 'L', i1: 5, s2: 'F', i2: 3, layer: 'M' }
        ];

        for (const e of midEdges) {
            const col1 = this.state[e.s1][e.i1];
            const col2 = this.state[e.s2][e.i2];
            if ((col1 === c1 && col2 === c2) || (col1 === c2 && col2 === c1)) {
                return e;
            }
        }

        return null;
    }

    popMiddleEdge(loc) {
        // Pop edge from middle to top
        if (loc.s1 === 'F' && loc.s2 === 'R') {
            this.doMoves("D' R' D R D F D' F'");
        } else if (loc.s1 === 'R' && loc.s2 === 'B') {
            this.doMoves("D' B' D B D R D' R'");
        } else if (loc.s1 === 'B' && loc.s2 === 'L') {
            this.doMoves("D' L' D L D B D' B'");
        } else {
            this.doMoves("D' F' D F D L D' L'");
        }
    }

    alignTopEdgeWithSide(sideColor) {
        const sides = ['F', 'R', 'B', 'L'];

        // Find current position
        for (let i = 0; i < 4; i++) {
            const side = sides[i];
            if (this.state[side][7] === sideColor) {
                // Need to rotate to match
                const targetIdx = sides.indexOf(sideColor);
                const currentIdx = i;
                const diff = (targetIdx - currentIdx + 4) % 4;

                if (diff === 1) this.doMoves("D'");
                else if (diff === 2) this.doMoves("D2");
                else if (diff === 3) this.doMoves("D");
                return;
            }
        }
    }

    // ==================== PHASE 4: YELLOW CROSS ====================
    solveYellowCross() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const pattern = this.getYellowCrossPattern();

            if (pattern === 'cross') return; // Done

            // Orient for algorithm based on pattern
            if (pattern === 'dot') {
                this.doMoves("F D R D' R' F'");
            } else if (pattern === 'line') {
                // Make sure line is horizontal
                if (this.state.D[3] !== 'D') {
                    this.doMoves("D");
                }
                this.doMoves("F D R D' R' F'");
            } else if (pattern === 'L') {
                // Orient L to 9 o'clock position
                this.orientYellowL();
                this.doMoves("F D R D' R' F'");
            }
        }
    }

    getYellowCrossPattern() {
        const d = this.state.D;
        const top = d[1] === 'D';
        const right = d[5] === 'D';
        const bottom = d[7] === 'D';
        const left = d[3] === 'D';

        const count = [top, right, bottom, left].filter(x => x).length;

        if (count === 4) return 'cross';
        if (count === 0) return 'dot';
        if (count === 2) {
            if ((top && bottom) || (left && right)) return 'line';
            return 'L';
        }
        return 'unknown';
    }

    orientYellowL() {
        // Rotate D until yellow is at positions 7 and 3 (bottom and left)
        for (let i = 0; i < 4; i++) {
            if (this.state.D[7] === 'D' && this.state.D[3] === 'D') return;
            this.doMoves("D");
        }
    }

    // ==================== PHASE 5: YELLOW FACE (OLL) ====================
    solveYellowFace() {
        for (let attempt = 0; attempt < 20; attempt++) {
            const yellowCorners = this.countYellowCorners();

            if (yellowCorners === 4) return; // Done

            // Position for algorithm
            this.positionForYellowCorners(yellowCorners);

            // Sune algorithm: R D R' D R D2 R'
            this.doMoves("R D R' D R D2 R'");
        }
    }

    countYellowCorners() {
        const d = this.state.D;
        let count = 0;
        if (d[0] === 'D') count++;
        if (d[2] === 'D') count++;
        if (d[6] === 'D') count++;
        if (d[8] === 'D') count++;
        return count;
    }

    positionForYellowCorners(yellowCount) {
        if (yellowCount === 0) {
            // Find corner with yellow on left face
            for (let i = 0; i < 4; i++) {
                if (this.state.L[8] === 'D') return;
                this.doMoves("D");
            }
        } else if (yellowCount === 1) {
            // Yellow corner should be at DFL (D[0])
            for (let i = 0; i < 4; i++) {
                if (this.state.D[0] === 'D') return;
                this.doMoves("D");
            }
        } else if (yellowCount === 2) {
            // Various cases - find headlights or diagonal
            for (let i = 0; i < 4; i++) {
                if (this.state.R[6] === 'D' && this.state.R[8] === 'D') return;
                this.doMoves("D");
            }
        }
    }

    // ==================== PHASE 6: LAST LAYER (PLL) ====================
    solveLastLayer() {
        // First, position corners
        this.positionLastLayerCorners();

        // Then, position edges
        this.positionLastLayerEdges();

        // Final alignment
        this.alignLastLayer();
    }

    positionLastLayerCorners() {
        for (let attempt = 0; attempt < 10; attempt++) {
            // Check if all corners are in correct positions (ignoring edges)
            if (this.cornersPositioned()) return;

            // Find a corner that's in correct position and orient
            const correctCorner = this.findCorrectlyPositionedCorner();
            if (correctCorner !== -1) {
                this.rotateDToPosition(correctCorner);
            }

            // Apply corner swap: R' F R' B2 R F' R' B2 R2
            this.doMoves("D R' D' L D R D' L'");
        }
    }

    cornersPositioned() {
        // Check each corner has correct colors (not necessarily oriented)
        const corners = [
            { d: 0, s1: 'F', i1: 6, s2: 'L', i2: 8, c1: 'F', c2: 'L' },
            { d: 2, s1: 'R', i1: 6, s2: 'F', i2: 8, c1: 'R', c2: 'F' },
            { d: 6, s1: 'L', i1: 6, s2: 'B', i2: 8, c1: 'L', c2: 'B' },
            { d: 8, s1: 'B', i1: 6, s2: 'R', i2: 8, c1: 'B', c2: 'R' }
        ];

        for (const c of corners) {
            const colors = [
                this.state.D[c.d],
                this.state[c.s1][c.i1],
                this.state[c.s2][c.i2]
            ];
            if (!colors.includes('D') || !colors.includes(c.c1) || !colors.includes(c.c2)) {
                return false;
            }
        }
        return true;
    }

    findCorrectlyPositionedCorner() {
        const corners = [
            { d: 0, s1: 'F', i1: 6, s2: 'L', i2: 8, c1: 'F', c2: 'L', pos: 0 },
            { d: 2, s1: 'R', i1: 6, s2: 'F', i2: 8, c1: 'R', c2: 'F', pos: 1 },
            { d: 6, s1: 'L', i1: 6, s2: 'B', i2: 8, c1: 'L', c2: 'B', pos: 2 },
            { d: 8, s1: 'B', i1: 6, s2: 'R', i2: 8, c1: 'B', c2: 'R', pos: 3 }
        ];

        for (const c of corners) {
            const colors = [
                this.state.D[c.d],
                this.state[c.s1][c.i1],
                this.state[c.s2][c.i2]
            ];
            if (colors.includes('D') && colors.includes(c.c1) && colors.includes(c.c2)) {
                return c.pos;
            }
        }
        return -1;
    }

    rotateDToPosition(pos) {
        // Rotate so correct corner is at back-right position
        const rotations = [2, 1, 0, 3];
        const times = rotations[pos];
        for (let i = 0; i < times; i++) {
            this.doMoves("D");
        }
    }

    positionLastLayerEdges() {
        for (let attempt = 0; attempt < 15; attempt++) {
            // Check if edges are solved
            if (this.edgesSolved()) return;

            // Find which edges need cycling
            // Use U-perm: R2 D' R' D' R D R D R D' R
            this.doMoves("R2 D R D R' D' R' D' R' D R'");
        }
    }

    edgesSolved() {
        return this.state.F[7] === 'F' &&
            this.state.R[7] === 'R' &&
            this.state.B[7] === 'B' &&
            this.state.L[7] === 'L';
    }

    alignLastLayer() {
        // Rotate D until all edges match their centers
        for (let i = 0; i < 4; i++) {
            if (this.state.F[7] === 'F' && this.state.R[7] === 'R') return;
            this.doMoves("D");
        }
    }

    // ==================== MOVE OPTIMIZATION ====================
    optimizeMoves(moves) {
        let current = [...moves];
        let changed = true;

        while (changed) {
            changed = false;
            const result = [];

            for (let i = 0; i < current.length; i++) {
                if (i === current.length - 1) {
                    result.push(current[i]);
                    continue;
                }

                const m1 = current[i];
                const m2 = current[i + 1];

                if (m1[0] === m2[0]) {
                    const combined = this.combineMoves(m1, m2);
                    if (combined) {
                        result.push(combined);
                    }
                    i++;
                    changed = true;
                } else {
                    result.push(m1);
                }
            }

            current = result;
        }

        return current;
    }

    combineMoves(m1, m2) {
        const face = m1[0];
        const v1 = m1.includes("'") ? 3 : m1.includes("2") ? 2 : 1;
        const v2 = m2.includes("'") ? 3 : m2.includes("2") ? 2 : 1;
        const total = (v1 + v2) % 4;

        if (total === 0) return null;
        if (total === 1) return face;
        if (total === 2) return face + "2";
        if (total === 3) return face + "'";
    }
}

export default Solver;
