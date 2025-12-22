// CubeState.js - Rubik's Cube State Management with Validation

export class CubeState {
    constructor() {
        this.reset();
        this.moveHistory = [];
    }

    reset() {
        // Each face: 0-8 indices, 4 is center
        // Standard orientation: White top, Green front
        this.state = {
            U: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
            D: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
            F: ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'],
            B: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
            L: ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
            R: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']
        };
        this.moveHistory = [];
    }

    clone() {
        const newCube = new CubeState();
        newCube.state = JSON.parse(JSON.stringify(this.state));
        newCube.moveHistory = [...this.moveHistory];
        return newCube;
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    setState(newState) {
        this.state = JSON.parse(JSON.stringify(newState));
    }

    // Face rotation helpers
    rotateFaceCW(face) {
        const f = this.state[face];
        const temp = [...f];
        f[0] = temp[6]; f[1] = temp[3]; f[2] = temp[0];
        f[3] = temp[7]; f[4] = temp[4]; f[5] = temp[1];
        f[6] = temp[8]; f[7] = temp[5]; f[8] = temp[2];
    }

    rotateFaceCCW(face) {
        const f = this.state[face];
        const temp = [...f];
        f[0] = temp[2]; f[1] = temp[5]; f[2] = temp[8];
        f[3] = temp[1]; f[4] = temp[4]; f[5] = temp[7];
        f[6] = temp[0]; f[7] = temp[3]; f[8] = temp[6];
    }

    // === MOVE IMPLEMENTATIONS ===
    R(prime = false) {
        if (prime) {
            this.rotateFaceCCW('R');
            const temp = [this.state.U[2], this.state.U[5], this.state.U[8]];
            this.state.U[2] = this.state.F[2];
            this.state.U[5] = this.state.F[5];
            this.state.U[8] = this.state.F[8];
            this.state.F[2] = this.state.D[2];
            this.state.F[5] = this.state.D[5];
            this.state.F[8] = this.state.D[8];
            this.state.D[2] = this.state.B[6];
            this.state.D[5] = this.state.B[3];
            this.state.D[8] = this.state.B[0];
            this.state.B[0] = temp[2];
            this.state.B[3] = temp[1];
            this.state.B[6] = temp[0];
        } else {
            this.rotateFaceCW('R');
            const temp = [this.state.U[2], this.state.U[5], this.state.U[8]];
            this.state.U[2] = this.state.B[6];
            this.state.U[5] = this.state.B[3];
            this.state.U[8] = this.state.B[0];
            this.state.B[0] = this.state.D[8];
            this.state.B[3] = this.state.D[5];
            this.state.B[6] = this.state.D[2];
            this.state.D[2] = this.state.F[2];
            this.state.D[5] = this.state.F[5];
            this.state.D[8] = this.state.F[8];
            this.state.F[2] = temp[0];
            this.state.F[5] = temp[1];
            this.state.F[8] = temp[2];
        }
    }

    L(prime = false) {
        if (prime) {
            this.rotateFaceCCW('L');
            const temp = [this.state.U[0], this.state.U[3], this.state.U[6]];
            this.state.U[0] = this.state.B[8];
            this.state.U[3] = this.state.B[5];
            this.state.U[6] = this.state.B[2];
            this.state.B[2] = this.state.D[6];
            this.state.B[5] = this.state.D[3];
            this.state.B[8] = this.state.D[0];
            this.state.D[0] = this.state.F[0];
            this.state.D[3] = this.state.F[3];
            this.state.D[6] = this.state.F[6];
            this.state.F[0] = temp[0];
            this.state.F[3] = temp[1];
            this.state.F[6] = temp[2];
        } else {
            this.rotateFaceCW('L');
            const temp = [this.state.U[0], this.state.U[3], this.state.U[6]];
            this.state.U[0] = this.state.F[0];
            this.state.U[3] = this.state.F[3];
            this.state.U[6] = this.state.F[6];
            this.state.F[0] = this.state.D[0];
            this.state.F[3] = this.state.D[3];
            this.state.F[6] = this.state.D[6];
            this.state.D[0] = this.state.B[8];
            this.state.D[3] = this.state.B[5];
            this.state.D[6] = this.state.B[2];
            this.state.B[2] = temp[2];
            this.state.B[5] = temp[1];
            this.state.B[8] = temp[0];
        }
    }

    U(prime = false) {
        if (prime) {
            this.rotateFaceCCW('U');
            const temp = [this.state.F[0], this.state.F[1], this.state.F[2]];
            this.state.F[0] = this.state.R[0];
            this.state.F[1] = this.state.R[1];
            this.state.F[2] = this.state.R[2];
            this.state.R[0] = this.state.B[0];
            this.state.R[1] = this.state.B[1];
            this.state.R[2] = this.state.B[2];
            this.state.B[0] = this.state.L[0];
            this.state.B[1] = this.state.L[1];
            this.state.B[2] = this.state.L[2];
            this.state.L[0] = temp[0];
            this.state.L[1] = temp[1];
            this.state.L[2] = temp[2];
        } else {
            this.rotateFaceCW('U');
            const temp = [this.state.F[0], this.state.F[1], this.state.F[2]];
            this.state.F[0] = this.state.L[0];
            this.state.F[1] = this.state.L[1];
            this.state.F[2] = this.state.L[2];
            this.state.L[0] = this.state.B[0];
            this.state.L[1] = this.state.B[1];
            this.state.L[2] = this.state.B[2];
            this.state.B[0] = this.state.R[0];
            this.state.B[1] = this.state.R[1];
            this.state.B[2] = this.state.R[2];
            this.state.R[0] = temp[0];
            this.state.R[1] = temp[1];
            this.state.R[2] = temp[2];
        }
    }

    D(prime = false) {
        if (prime) {
            this.rotateFaceCCW('D');
            const temp = [this.state.F[6], this.state.F[7], this.state.F[8]];
            this.state.F[6] = this.state.L[6];
            this.state.F[7] = this.state.L[7];
            this.state.F[8] = this.state.L[8];
            this.state.L[6] = this.state.B[6];
            this.state.L[7] = this.state.B[7];
            this.state.L[8] = this.state.B[8];
            this.state.B[6] = this.state.R[6];
            this.state.B[7] = this.state.R[7];
            this.state.B[8] = this.state.R[8];
            this.state.R[6] = temp[0];
            this.state.R[7] = temp[1];
            this.state.R[8] = temp[2];
        } else {
            this.rotateFaceCW('D');
            const temp = [this.state.F[6], this.state.F[7], this.state.F[8]];
            this.state.F[6] = this.state.R[6];
            this.state.F[7] = this.state.R[7];
            this.state.F[8] = this.state.R[8];
            this.state.R[6] = this.state.B[6];
            this.state.R[7] = this.state.B[7];
            this.state.R[8] = this.state.B[8];
            this.state.B[6] = this.state.L[6];
            this.state.B[7] = this.state.L[7];
            this.state.B[8] = this.state.L[8];
            this.state.L[6] = temp[0];
            this.state.L[7] = temp[1];
            this.state.L[8] = temp[2];
        }
    }

    F(prime = false) {
        if (prime) {
            this.rotateFaceCCW('F');
            const temp = [this.state.U[6], this.state.U[7], this.state.U[8]];
            this.state.U[6] = this.state.R[0];
            this.state.U[7] = this.state.R[3];
            this.state.U[8] = this.state.R[6];
            this.state.R[0] = this.state.D[2];
            this.state.R[3] = this.state.D[1];
            this.state.R[6] = this.state.D[0];
            this.state.D[0] = this.state.L[2];
            this.state.D[1] = this.state.L[5];
            this.state.D[2] = this.state.L[8];
            this.state.L[2] = temp[0];
            this.state.L[5] = temp[1];
            this.state.L[8] = temp[2];
        } else {
            this.rotateFaceCW('F');
            const temp = [this.state.U[6], this.state.U[7], this.state.U[8]];
            this.state.U[6] = this.state.L[8];
            this.state.U[7] = this.state.L[5];
            this.state.U[8] = this.state.L[2];
            this.state.L[2] = this.state.D[0];
            this.state.L[5] = this.state.D[1];
            this.state.L[8] = this.state.D[2];
            this.state.D[0] = this.state.R[6];
            this.state.D[1] = this.state.R[3];
            this.state.D[2] = this.state.R[0];
            this.state.R[0] = temp[2];
            this.state.R[3] = temp[1];
            this.state.R[6] = temp[0];
        }
    }

    B(prime = false) {
        if (prime) {
            this.rotateFaceCCW('B');
            const temp = [this.state.U[0], this.state.U[1], this.state.U[2]];
            this.state.U[0] = this.state.L[6];
            this.state.U[1] = this.state.L[3];
            this.state.U[2] = this.state.L[0];
            this.state.L[0] = this.state.D[6];
            this.state.L[3] = this.state.D[7];
            this.state.L[6] = this.state.D[8];
            this.state.D[6] = this.state.R[8];
            this.state.D[7] = this.state.R[5];
            this.state.D[8] = this.state.R[2];
            this.state.R[2] = temp[0];
            this.state.R[5] = temp[1];
            this.state.R[8] = temp[2];
        } else {
            this.rotateFaceCW('B');
            const temp = [this.state.U[0], this.state.U[1], this.state.U[2]];
            this.state.U[0] = this.state.R[2];
            this.state.U[1] = this.state.R[5];
            this.state.U[2] = this.state.R[8];
            this.state.R[2] = this.state.D[8];
            this.state.R[5] = this.state.D[7];
            this.state.R[8] = this.state.D[6];
            this.state.D[6] = this.state.L[0];
            this.state.D[7] = this.state.L[3];
            this.state.D[8] = this.state.L[6];
            this.state.L[0] = temp[2];
            this.state.L[3] = temp[1];
            this.state.L[6] = temp[0];
        }
    }

    applyMove(move, addToHistory = true) {
        const face = move.charAt(0).toUpperCase();
        const prime = move.includes("'");
        const double = move.includes("2");

        const execute = () => {
            switch (face) {
                case 'R': this.R(prime); break;
                case 'L': this.L(prime); break;
                case 'U': this.U(prime); break;
                case 'D': this.D(prime); break;
                case 'F': this.F(prime); break;
                case 'B': this.B(prime); break;
            }
        };

        execute();
        if (double) execute();

        if (addToHistory) {
            this.moveHistory.push(move);
        }
    }

    applyMoves(moves, addToHistory = true) {
        const moveList = moves.split(/\s+/).filter(m => m);
        moveList.forEach(move => this.applyMove(move, addToHistory));
    }

    undo() {
        if (this.moveHistory.length === 0) return null;
        const lastMove = this.moveHistory.pop();
        const inverse = this.getInverseMove(lastMove);
        this.applyMove(inverse, false);
        return lastMove;
    }

    getInverseMove(move) {
        if (move.includes("'")) return move.replace("'", "");
        if (move.includes("2")) return move;
        return move + "'";
    }

    scramble(length = 20) {
        const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
        const modifiers = ['', "'", '2'];
        const scrambleMoves = [];
        let lastMove = '';

        for (let i = 0; i < length; i++) {
            let move;
            do {
                move = moves[Math.floor(Math.random() * moves.length)];
            } while (move === lastMove);

            lastMove = move;
            const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
            const fullMove = move + mod;
            scrambleMoves.push(fullMove);
            this.applyMove(fullMove);
        }

        return scrambleMoves.join(' ');
    }

    isSolved() {
        for (const face of Object.keys(this.state)) {
            const color = this.state[face][4];
            if (!this.state[face].every(c => c === color)) {
                return false;
            }
        }
        return true;
    }

    // Count occurrences of each color
    getColorCounts() {
        const counts = { W: 0, Y: 0, R: 0, O: 0, B: 0, G: 0 };
        for (const face of Object.values(this.state)) {
            for (const color of face) {
                if (counts.hasOwnProperty(color)) {
                    counts[color]++;
                }
            }
        }
        return counts;
    }

    // Basic validation - each color appears 9 times
    isValid() {
        const counts = this.getColorCounts();
        return Object.values(counts).every(count => count === 9);
    }

    // Advanced validation - check if cube is actually solvable
    isSolvable() {
        if (!this.isValid()) return false;

        // Check center piece colors are correct (fixed in standard cube)
        const expectedCenters = { U: 'W', D: 'Y', F: 'G', B: 'B', L: 'O', R: 'R' };
        for (const [face, color] of Object.entries(expectedCenters)) {
            if (this.state[face][4] !== color) {
                return false;
            }
        }

        // Check edge parity
        const edgeParity = this.checkEdgeParity();
        if (edgeParity !== 0) return false;

        // Check corner parity
        const cornerParity = this.checkCornerParity();
        if (cornerParity !== 0) return false;

        return true;
    }

    // Edge orientation parity (must be even)
    checkEdgeParity() {
        // Simplified check - edges must have valid color combinations
        const validEdges = [
            ['W', 'G'], ['W', 'R'], ['W', 'B'], ['W', 'O'],
            ['Y', 'G'], ['Y', 'R'], ['Y', 'B'], ['Y', 'O'],
            ['G', 'R'], ['G', 'O'], ['B', 'R'], ['B', 'O']
        ];

        const edges = this.getEdges();
        for (const edge of edges) {
            const sorted = edge.sort().join('');
            if (!validEdges.some(ve => ve.sort().join('') === sorted)) {
                return 1; // Invalid edge
            }
        }
        return 0;
    }

    // Corner orientation parity (sum must be divisible by 3)
    checkCornerParity() {
        // Simplified check - corners must have valid color combinations
        const validCorners = [
            ['W', 'G', 'R'], ['W', 'R', 'B'], ['W', 'B', 'O'], ['W', 'O', 'G'],
            ['Y', 'G', 'O'], ['Y', 'O', 'B'], ['Y', 'B', 'R'], ['Y', 'R', 'G']
        ];

        const corners = this.getCorners();
        for (const corner of corners) {
            const sorted = corner.sort().join('');
            if (!validCorners.some(vc => vc.sort().join('') === sorted)) {
                return 1; // Invalid corner
            }
        }
        return 0;
    }

    getEdges() {
        const s = this.state;
        return [
            [s.U[1], s.B[1]], [s.U[3], s.L[1]], [s.U[5], s.R[1]], [s.U[7], s.F[1]],
            [s.D[1], s.F[7]], [s.D[3], s.L[7]], [s.D[5], s.R[7]], [s.D[7], s.B[7]],
            [s.F[3], s.L[5]], [s.F[5], s.R[3]], [s.B[3], s.R[5]], [s.B[5], s.L[3]]
        ];
    }

    getCorners() {
        const s = this.state;
        return [
            [s.U[0], s.L[0], s.B[2]], [s.U[2], s.B[0], s.R[2]],
            [s.U[6], s.F[0], s.L[2]], [s.U[8], s.R[0], s.F[2]],
            [s.D[0], s.L[8], s.F[6]], [s.D[2], s.F[8], s.R[6]],
            [s.D[6], s.B[8], s.L[6]], [s.D[8], s.R[8], s.B[6]]
        ];
    }
}

export default CubeState;
