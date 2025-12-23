// Solver.js - Core Rubik's Cube Solver Logic
// Pure logic module: validation, cubie conversion, parity checks, and solving

export class Solver {
    constructor() {
        // Corner and edge definitions (facelet indices)
        // Facelets indexed 0-53: U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
        this.cornerFacelets = [
            [0, 9, 45],   // URB
            [2, 45, 36],  // UBL -> [U2, B0, L0] -> Check this
            [6, 36, 18],  // ULF
            [8, 18, 9],   // UFR
            [27, 18, 36], // DFL
            [29, 9, 18],  // DRF
            [33, 45, 9],  // DBR
            [35, 36, 45]  // DLB
        ];
        // Correct corner definitions based on standard cube orientation:
        // U=0-8, R=9-17, F=18-26, D=27-35, L=36-44, B=45-53
        // Corners: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
        this.corners = [
            { facelets: [8, 9, 20], faces: ['U', 'R', 'F'] },   // URF
            { facelets: [6, 18, 38], faces: ['U', 'F', 'L'] },   // UFL
            { facelets: [0, 36, 47], faces: ['U', 'L', 'B'] },   // ULB
            { facelets: [2, 45, 11], faces: ['U', 'B', 'R'] },   // UBR
            { facelets: [29, 15, 26], faces: ['D', 'R', 'F'] },  // DRF
            { facelets: [27, 24, 44], faces: ['D', 'F', 'L'] },  // DFL
            { facelets: [33, 42, 53], faces: ['D', 'L', 'B'] },  // DLB
            { facelets: [35, 51, 17], faces: ['D', 'B', 'R'] }   // DBR
        ];

        // Edges: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
        this.edges = [
            { facelets: [5, 10], faces: ['U', 'R'] },   // UR
            { facelets: [7, 19], faces: ['U', 'F'] },   // UF
            { facelets: [3, 37], faces: ['U', 'L'] },   // UL
            { facelets: [1, 46], faces: ['U', 'B'] },   // UB
            { facelets: [32, 16], faces: ['D', 'R'] },   // DR
            { facelets: [28, 25], faces: ['D', 'F'] },   // DF
            { facelets: [30, 43], faces: ['D', 'L'] },   // DL
            { facelets: [34, 52], faces: ['D', 'B'] },   // DB
            { facelets: [23, 12], faces: ['F', 'R'] },   // FR
            { facelets: [21, 41], faces: ['F', 'L'] },   // FL
            { facelets: [50, 39], faces: ['B', 'L'] },   // BL
            { facelets: [48, 14], faces: ['B', 'R'] }    // BR
        ];

        this.faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        this.solution = [];
    }

    /**
     * Main solve entry point
     * @param {Object} paintState - { U: [9 colors], R: [9], F: [9], D: [9], L: [9], B: [9] }
     * @returns {Object} - { success: boolean, solution: string[], error: string }
     */
    solve(paintState) {
        try {
            // Step 1: Map colors to faces using centers
            const colorToFace = this.mapColorsToFaces(paintState);

            // Step 2: Convert painted colors to facelet array
            const facelets = this.toFaceletString(paintState, colorToFace);

            // Step 3: Validate facelet counts
            const countValidation = this.validateFaceletCounts(facelets);
            if (!countValidation.valid) {
                return { success: false, solution: [], error: countValidation.error };
            }

            // Step 4: Convert to cubies
            const cubies = this.faceletsToCubies(facelets);
            if (cubies.error) {
                return { success: false, solution: [], error: cubies.error };
            }

            // Step 5: Validate cube invariants (parity, orientation)
            const invariantCheck = this.validateInvariants(cubies);
            if (!invariantCheck.valid) {
                return { success: false, solution: [], error: invariantCheck.error };
            }

            // Step 6: Solve
            const solution = this.solveCube(facelets);

            // Step 7: Post-process (merge/cancel)
            const optimized = this.optimizeMoves(solution);

            return { success: true, solution: optimized, error: null };
        } catch (e) {
            return { success: false, solution: [], error: `Solver error: ${e.message}` };
        }
    }

    /**
     * Step 1: Map colors to faces using center stickers
     */
    mapColorsToFaces(paintState) {
        const colorToFace = {};
        for (const face of this.faceOrder) {
            const centerColor = paintState[face][4]; // Index 4 is center
            colorToFace[centerColor] = face;
        }
        return colorToFace;
    }

    /**
     * Step 2: Convert paint state to 54-char facelet string
     */
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

    /**
     * Step 3: Validate each face appears exactly 9 times
     */
    validateFaceletCounts(facelets) {
        const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
        for (const c of facelets) {
            if (counts[c] === undefined) {
                return { valid: false, error: `Invalid facelet character: ${c}` };
            }
            counts[c]++;
        }
        for (const face of this.faceOrder) {
            if (counts[face] !== 9) {
                return { valid: false, error: `Face ${face} has ${counts[face]} stickers (expected 9)` };
            }
        }
        return { valid: true };
    }

    /**
     * Step 4: Convert facelets to cubie representation
     */
    faceletsToCubies(facelets) {
        const cornerPositions = [];
        const cornerOrientations = [];
        const edgePositions = [];
        const edgeOrientations = [];

        // Identify corners
        for (let i = 0; i < 8; i++) {
            const corner = this.corners[i];
            const colors = corner.facelets.map(idx => facelets[idx]);
            const found = this.findCorner(colors);
            if (found.index === -1) {
                return { error: `Invalid corner at position ${i}: ${colors.join('')}` };
            }
            cornerPositions.push(found.index);
            cornerOrientations.push(found.orientation);
        }

        // Identify edges
        for (let i = 0; i < 12; i++) {
            const edge = this.edges[i];
            const colors = edge.facelets.map(idx => facelets[idx]);
            const found = this.findEdge(colors);
            if (found.index === -1) {
                return { error: `Invalid edge at position ${i}: ${colors.join('')}` };
            }
            edgePositions.push(found.index);
            edgeOrientations.push(found.orientation);
        }

        return { cornerPositions, cornerOrientations, edgePositions, edgeOrientations };
    }

    /**
     * Find which corner piece these colors belong to
     */
    findCorner(colors) {
        const solvedCorners = [
            ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
            ['D', 'R', 'F'], ['D', 'F', 'L'], ['D', 'L', 'B'], ['D', 'B', 'R']
        ];
        // Note: DRF should be DFR in standard notation. Let's use consistent order.
        const stdCorners = [
            ['U', 'R', 'F'], ['U', 'F', 'L'], ['U', 'L', 'B'], ['U', 'B', 'R'],
            ['D', 'F', 'R'], ['D', 'L', 'F'], ['D', 'B', 'L'], ['D', 'R', 'B']
        ];

        for (let i = 0; i < 8; i++) {
            const target = stdCorners[i];
            // Check all 3 orientations
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

    /**
     * Find which edge piece these colors belong to
     */
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

    /**
     * Step 5: Validate cube invariants
     */
    validateInvariants(cubies) {
        const { cornerPositions, cornerOrientations, edgePositions, edgeOrientations } = cubies;

        // Check for duplicate positions
        if (new Set(cornerPositions).size !== 8) {
            return { valid: false, error: 'Duplicate corner pieces detected' };
        }
        if (new Set(edgePositions).size !== 12) {
            return { valid: false, error: 'Duplicate edge pieces detected' };
        }

        // Corner orientation sum must be divisible by 3
        const cornerOrientSum = cornerOrientations.reduce((a, b) => a + b, 0);
        if (cornerOrientSum % 3 !== 0) {
            return { valid: false, error: 'Invalid corner orientation (twisted corner)' };
        }

        // Edge orientation sum must be even
        const edgeOrientSum = edgeOrientations.reduce((a, b) => a + b, 0);
        if (edgeOrientSum % 2 !== 0) {
            return { valid: false, error: 'Invalid edge orientation (flipped edge)' };
        }

        // Permutation parity must match
        const cornerParity = this.calculateParity(cornerPositions);
        const edgeParity = this.calculateParity(edgePositions);
        if (cornerParity !== edgeParity) {
            return { valid: false, error: 'Permutation parity mismatch (impossible state)' };
        }

        return { valid: true };
    }

    /**
     * Calculate permutation parity (0 = even, 1 = odd)
     */
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
     * Step 6: Solve the cube using layer-by-layer
     */
    solveCube(facelets) {
        // Create internal state representation
        this.state = this.createState(facelets);
        this.solution = [];

        // Layer-by-layer solving
        this.solveWhiteCross();
        this.solveWhiteCorners();
        this.solveMiddleLayer();
        this.solveYellowCross();
        this.solveYellowEdges();
        this.positionYellowCorners();
        this.orientYellowCorners();
        this.alignFinalLayer();

        return this.solution;
    }

    createState(facelets) {
        // Convert facelet string to state object
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

    // --- Move execution ---
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
        // Rotate face array clockwise
        const f = this.state[face];
        const temp = [f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8]];
        f[0] = temp[6]; f[1] = temp[3]; f[2] = temp[0];
        f[3] = temp[7]; f[4] = temp[4]; f[5] = temp[1];
        f[6] = temp[8]; f[7] = temp[5]; f[8] = temp[2];

        // Rotate adjacent edges
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

    // --- Layer-by-layer solving algorithms ---
    solveWhiteCross() {
        const targets = [
            { edge: ['U', 'F'], center: 'F', uIdx: 7, sideIdx: 1 },
            { edge: ['U', 'R'], center: 'R', uIdx: 5, sideIdx: 1 },
            { edge: ['U', 'B'], center: 'B', uIdx: 1, sideIdx: 1 },
            { edge: ['U', 'L'], center: 'L', uIdx: 3, sideIdx: 1 }
        ];

        for (const t of targets) {
            for (let attempt = 0; attempt < 8; attempt++) {
                if (this.state.U[t.uIdx] === 'U' && this.state[t.center][t.sideIdx] === t.center) break;

                // Find the U-<center> edge
                const loc = this.findEdgeLocation('U', t.center);
                if (!loc) continue;

                // Move to bottom if on top incorrectly
                if (loc.face1 === 'U' || loc.face2 === 'U') {
                    this.doMoves(loc.side + "2");
                }

                // Align on D face
                const loc2 = this.findEdgeLocation('U', t.center);
                if (loc2 && (loc2.face1 === 'D' || loc2.face2 === 'D')) {
                    while (this.findEdgeLocation('U', t.center).side !== t.center) {
                        this.doMoves("D");
                    }
                    this.doMoves(t.center + "2");
                }
            }
        }
    }

    findEdgeLocation(c1, c2) {
        const positions = [
            { face1: 'U', idx1: 7, face2: 'F', idx2: 1, side: 'F' },
            { face1: 'U', idx1: 5, face2: 'R', idx2: 1, side: 'R' },
            { face1: 'U', idx1: 1, face2: 'B', idx2: 1, side: 'B' },
            { face1: 'U', idx1: 3, face2: 'L', idx2: 1, side: 'L' },
            { face1: 'D', idx1: 1, face2: 'F', idx2: 7, side: 'F' },
            { face1: 'D', idx1: 5, face2: 'R', idx2: 7, side: 'R' },
            { face1: 'D', idx1: 7, face2: 'B', idx2: 7, side: 'B' },
            { face1: 'D', idx1: 3, face2: 'L', idx2: 7, side: 'L' },
            { face1: 'F', idx1: 5, face2: 'R', idx2: 3, side: 'F' },
            { face1: 'F', idx1: 3, face2: 'L', idx2: 5, side: 'F' },
            { face1: 'B', idx1: 5, face2: 'L', idx2: 3, side: 'B' },
            { face1: 'B', idx1: 3, face2: 'R', idx2: 5, side: 'B' }
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

    solveWhiteCorners() {
        for (let i = 0; i < 16; i++) {
            if (this.isWhiteLayerSolved()) break;
            // Use R U R' U' pattern to cycle corners
            this.doMoves("R U R' U'");
        }
    }

    isWhiteLayerSolved() {
        return this.state.U.every(c => c === 'U') &&
            this.state.F[0] === 'F' && this.state.F[1] === 'F' && this.state.F[2] === 'F' &&
            this.state.R[0] === 'R' && this.state.R[1] === 'R' && this.state.R[2] === 'R' &&
            this.state.L[0] === 'L' && this.state.L[1] === 'L' && this.state.L[2] === 'L' &&
            this.state.B[0] === 'B' && this.state.B[1] === 'B' && this.state.B[2] === 'B';
    }

    solveMiddleLayer() {
        for (let i = 0; i < 16; i++) {
            if (this.isMiddleLayerSolved()) break;
            // Insert right: U R U' R' U' F' U F
            // Insert left:  U' L' U L U F U' F'
            this.doMoves("U R U' R' U' F' U F");
        }
    }

    isMiddleLayerSolved() {
        return this.state.F[3] === 'F' && this.state.F[5] === 'F' &&
            this.state.R[3] === 'R' && this.state.R[5] === 'R' &&
            this.state.L[3] === 'L' && this.state.L[5] === 'L' &&
            this.state.B[3] === 'B' && this.state.B[5] === 'B';
    }

    solveYellowCross() {
        for (let i = 0; i < 4; i++) {
            const d = this.state.D;
            if (d[1] === 'D' && d[3] === 'D' && d[5] === 'D' && d[7] === 'D') break;
            this.doMoves("F R U R' U' F'");
        }
    }

    solveYellowEdges() {
        for (let i = 0; i < 4; i++) {
            if (this.state.F[7] === 'F' && this.state.R[7] === 'R' &&
                this.state.B[7] === 'B' && this.state.L[7] === 'L') break;
            this.doMoves("R U R' U R U2 R' U");
        }
    }

    positionYellowCorners() {
        for (let i = 0; i < 4; i++) {
            this.doMoves("U R U' L' U R' U' L");
        }
    }

    orientYellowCorners() {
        for (let corner = 0; corner < 4; corner++) {
            while (this.state.D[8] !== 'D') {
                this.doMoves("R' D' R D");
            }
            this.doMoves("D");
        }
    }

    alignFinalLayer() {
        for (let i = 0; i < 4; i++) {
            if (this.state.F[7] === 'F') break;
            this.doMoves("D");
        }
    }

    /**
     * Step 7: Optimize moves - merge redundant, cancel inverses
     */
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
                    // Same face - combine
                    const combined = this.combineMoves(m1, m2);
                    if (combined) {
                        result.push(combined);
                    }
                    // If null, moves cancel out
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
