// Solver.js - Improved Layer-by-layer Beginner Method

export class Solver {
    constructor() {
        this.cube = null;
        this.solution = [];
    }

    solve(cubeState) {
        this.cube = cubeState.clone();
        this.solution = [];

        if (this.cube.isSolved()) {
            return [];
        }

        try {
            // Layer-by-layer method
            this.solveWhiteCross();
            this.solveWhiteCorners();
            this.solveMiddleLayer();
            this.solveYellowCross();
            this.solveYellowEdges();
            this.positionYellowCorners();
            this.orientYellowCorners();

            return this.optimizeSolution(this.solution);
        } catch (e) {
            console.error('Solver error:', e);
            // Return what we have so far
            return this.solution.length > 0 ? this.optimizeSolution(this.solution) : [];
        }
    }

    doMoves(moves) {
        const moveList = moves.split(/\s+/).filter(m => m.length > 0);
        for (const move of moveList) {
            this.cube.applyMove(move, false);
            this.solution.push(move);
        }
    }

    // Step 1: White Cross
    solveWhiteCross() {
        // Solve each white edge with correct adjacent color
        const edges = [
            { adjacent: 'F', color: 'G', position: 7 }, // Front
            { adjacent: 'R', color: 'R', position: 5 }, // Right
            { adjacent: 'B', color: 'B', position: 1 }, // Back
            { adjacent: 'L', color: 'O', position: 3 }  // Left
        ];

        for (const edge of edges) {
            this.solveWhiteEdge(edge.adjacent, edge.color, edge.position);
        }
    }

    solveWhiteEdge(targetFace, targetColor, targetPos) {
        const maxAttempts = 20;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const state = this.cube.getState();

            // Check if edge is already solved
            if (state.U[targetPos] === 'W' && state[targetFace][1] === targetColor) {
                return;
            }

            // Find the white-targetColor edge
            const location = this.findEdge('W', targetColor);
            if (!location) continue;

            // Move it to correct position
            if (location.face === 'D') {
                // Edge is on bottom - rotate D to align, then bring up
                this.alignBottomEdge(location, targetFace);
            } else if (location.face === 'U') {
                // Edge is on top but wrong position or flipped
                this.fixTopEdge(location, targetFace, targetColor);
            } else {
                // Edge is on middle layer
                this.moveEdgeToBottom(location);
            }
        }
    }

    findEdge(color1, color2) {
        const state = this.cube.getState();
        const edgePositions = [
            // Top face edges
            { face: 'U', idx: 1, adj: 'B', adjIdx: 1 },
            { face: 'U', idx: 3, adj: 'L', adjIdx: 1 },
            { face: 'U', idx: 5, adj: 'R', adjIdx: 1 },
            { face: 'U', idx: 7, adj: 'F', adjIdx: 1 },
            // Bottom face edges
            { face: 'D', idx: 1, adj: 'F', adjIdx: 7 },
            { face: 'D', idx: 3, adj: 'L', adjIdx: 7 },
            { face: 'D', idx: 5, adj: 'R', adjIdx: 7 },
            { face: 'D', idx: 7, adj: 'B', adjIdx: 7 },
            // Middle layer edges
            { face: 'F', idx: 3, adj: 'L', adjIdx: 5 },
            { face: 'F', idx: 5, adj: 'R', adjIdx: 3 },
            { face: 'B', idx: 3, adj: 'R', adjIdx: 5 },
            { face: 'B', idx: 5, adj: 'L', adjIdx: 3 }
        ];

        for (const pos of edgePositions) {
            const c1 = state[pos.face][pos.idx];
            const c2 = state[pos.adj][pos.adjIdx];

            if ((c1 === color1 && c2 === color2) || (c1 === color2 && c2 === color1)) {
                return {
                    face: pos.face,
                    idx: pos.idx,
                    adjFace: pos.adj,
                    adjIdx: pos.adjIdx,
                    whiteOnFace: c1 === 'W'
                };
            }
        }
        return null;
    }

    alignBottomEdge(location, targetFace) {
        const faceOrder = ['F', 'R', 'B', 'L'];
        const currentFace = location.adjFace;
        const currentIdx = faceOrder.indexOf(currentFace);
        const targetIdx = faceOrder.indexOf(targetFace);

        const rotations = (targetIdx - currentIdx + 4) % 4;
        for (let i = 0; i < rotations; i++) {
            this.doMoves("D");
        }

        // Bring up with double rotation
        this.doMoves(`${targetFace}2`);
    }

    fixTopEdge(location, targetFace, targetColor) {
        // Move it down first
        const state = this.cube.getState();
        const adjFace = location.adjFace;

        this.doMoves(`${adjFace}2`);
    }

    moveEdgeToBottom(location) {
        // Edge is in middle layer, kick it to bottom
        const face = location.face;
        if (face === 'F' || face === 'B') {
            if (location.idx === 3) {
                this.doMoves(face === 'F' ? "L'" : "R'");
            } else {
                this.doMoves(face === 'F' ? "R" : "L");
            }
        }
    }

    // Step 2: White Corners
    solveWhiteCorners() {
        const corners = [
            { pos: 8, f: 'F', r: 'R', fc: 'G', rc: 'R' },
            { pos: 6, f: 'F', l: 'L', fc: 'G', lc: 'O' },
            { pos: 0, f: 'B', l: 'L', fc: 'B', lc: 'O' },
            { pos: 2, f: 'B', r: 'R', fc: 'B', rc: 'R' }
        ];

        for (const corner of corners) {
            this.solveWhiteCorner(corner);
        }
    }

    solveWhiteCorner(corner) {
        for (let attempt = 0; attempt < 20; attempt++) {
            const state = this.cube.getState();

            // Check if already solved (simplified check for front-right corner)
            if (corner.pos === 8) {
                if (state.U[8] === 'W' && state.F[2] === 'G' && state.R[0] === 'R') {
                    return;
                }
            }

            // Use sexy move to insert/cycle corners
            // R U R' U' - the "sexy move"
            if (corner.pos === 8) {
                this.doMoves("R U R' U'");
            } else if (corner.pos === 6) {
                this.doMoves("L' U' L U");
            } else {
                // Rotate cube view virtually
                this.doMoves("U");
            }
        }
    }

    // Step 3: Middle Layer (F2L second layer)
    solveMiddleLayer() {
        for (let attempt = 0; attempt < 24; attempt++) {
            const state = this.cube.getState();

            // Find an edge in top layer without yellow
            let found = false;

            // Check each top edge
            for (let i = 0; i < 4; i++) {
                const topEdge = state.U[7]; // Front top
                const frontTop = state.F[1];

                if (topEdge !== 'Y' && frontTop !== 'Y') {
                    // This edge belongs in middle layer
                    found = true;

                    // Determine if it goes left or right
                    if (frontTop === state.F[4]) {
                        // Insert right: U R U' R' U' F' U F
                        this.doMoves("U R U' R' U' F' U F");
                    } else {
                        // Need to rotate U to align
                        this.doMoves("U");
                    }
                    break;
                }

                this.doMoves("U");
            }

            if (!found) {
                // Check if any middle edge is wrong and needs to be kicked out
                if (this.middleLayerSolved()) {
                    return;
                }

                // Kick out a wrong edge
                this.doMoves("R U R' U' F' U' F");
            }
        }
    }

    middleLayerSolved() {
        const state = this.cube.getState();
        return (
            state.F[3] === 'G' && state.F[5] === 'G' &&
            state.R[3] === 'R' && state.R[5] === 'R' &&
            state.B[3] === 'B' && state.B[5] === 'B' &&
            state.L[3] === 'O' && state.L[5] === 'O'
        );
    }

    // Step 4: Yellow Cross (OLL - edges)
    solveYellowCross() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const state = this.cube.getState();
            const pattern = this.getYellowCrossPattern(state);

            if (pattern === 'cross') {
                return;
            }

            // F R U R' U' F'
            if (pattern === 'dot') {
                this.doMoves("F R U R' U' F'");
                this.doMoves("U2");
                this.doMoves("F R U R' U' F'");
            } else if (pattern === 'line') {
                // Make sure line is horizontal
                if (state.D[3] === 'Y' && state.D[5] === 'Y') {
                    this.doMoves("F R U R' U' F'");
                } else {
                    this.doMoves("U");
                }
            } else if (pattern === 'L') {
                // Orient L correctly (back-left)
                this.doMoves("F R U R' U' F'");
            }
        }
    }

    getYellowCrossPattern(state) {
        const top = state.D[1] === 'Y';
        const right = state.D[5] === 'Y';
        const bottom = state.D[7] === 'Y';
        const left = state.D[3] === 'Y';

        const count = [top, right, bottom, left].filter(x => x).length;

        if (count === 4) return 'cross';
        if (count === 0) return 'dot';
        if (count === 2) {
            if ((top && bottom) || (left && right)) return 'line';
            return 'L';
        }
        return 'unknown';
    }

    // Step 5: Position Yellow Edges (PLL - edges)
    solveYellowEdges() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const state = this.cube.getState();

            // Count how many edges are in correct position
            let correct = 0;
            if (state.F[7] === state.F[4]) correct++;
            if (state.R[7] === state.R[4]) correct++;
            if (state.B[7] === state.B[4]) correct++;
            if (state.L[7] === state.L[4]) correct++;

            if (correct === 4) return;

            if (correct === 1) {
                // Find the correct edge and position it at back
                for (let i = 0; i < 4; i++) {
                    if (this.cube.getState().B[7] === 'B') {
                        break;
                    }
                    this.doMoves("D");
                }
            }

            // R U R' U R U2 R' U
            this.doMoves("R U R' U R U2 R' U");
        }
    }

    // Step 6: Position Yellow Corners
    positionYellowCorners() {
        for (let attempt = 0; attempt < 10; attempt++) {
            const correctCount = this.countCorrectCorners();

            if (correctCount === 4) return;

            // U R U' L' U R' U' L
            this.doMoves("U R U' L' U R' U' L");
        }
    }

    countCorrectCorners() {
        const state = this.cube.getState();
        let count = 0;

        // Check each corner has the right colors (not necessarily oriented)
        // Front-right-bottom corner should have F, R, D colors
        const frb = [state.F[8], state.R[6], state.D[2]].sort().join('');
        if (frb === 'GRY') count++;

        // Similar checks for other corners...
        return count;
    }

    // Step 7: Orient Yellow Corners
    orientYellowCorners() {
        // R' D' R D repeated until corner is yellow on bottom
        for (let corner = 0; corner < 4; corner++) {
            for (let twist = 0; twist < 6; twist++) {
                const state = this.cube.getState();
                if (state.D[2] === 'Y') break;
                this.doMoves("R' D' R D");
            }

            if (corner < 3) {
                this.doMoves("D");
            }
        }

        // Final D alignment
        for (let i = 0; i < 4; i++) {
            const state = this.cube.getState();
            if (state.F[7] === state.F[4]) break;
            this.doMoves("D");
        }
    }

    // Optimize solution by canceling redundant moves
    optimizeSolution(moves) {
        let result = [...moves];
        let changed = true;

        while (changed) {
            changed = false;
            const newMoves = [];

            for (let i = 0; i < result.length; i++) {
                const current = result[i];
                const next = result[i + 1];

                if (!next) {
                    newMoves.push(current);
                    continue;
                }

                // Same face - try to combine
                if (current.charAt(0) === next.charAt(0)) {
                    const combined = this.combineMoves(current, next);
                    if (combined === null) {
                        // Moves cancel out
                        i++;
                        changed = true;
                    } else if (combined !== current + ' ' + next) {
                        newMoves.push(combined);
                        i++;
                        changed = true;
                    } else {
                        newMoves.push(current);
                    }
                } else {
                    newMoves.push(current);
                }
            }

            result = newMoves;
        }

        return result;
    }

    combineMoves(m1, m2) {
        const face = m1.charAt(0);
        const v1 = this.getMoveValue(m1);
        const v2 = this.getMoveValue(m2);
        const total = (v1 + v2) % 4;

        if (total === 0) return null; // Cancel
        if (total === 1) return face;
        if (total === 2) return face + '2';
        if (total === 3) return face + "'";
        return m1 + ' ' + m2;
    }

    getMoveValue(move) {
        if (move.includes("'")) return 3;
        if (move.includes("2")) return 2;
        return 1;
    }
}

export default Solver;
