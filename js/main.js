// main.js - Enhanced Application with Phase-based Solving and Paint History

import { CubeState } from './cube/CubeState.js';
import { CubeRenderer } from './cube/CubeRenderer.js';
import { Controls } from './ui/Controls.js';
import { Tutorial } from './ui/Tutorial.js';
import { Solver } from './solver/Solver.js';
import soundManager from './audio/SoundManager.js';

class RubiksCubeApp {
    constructor() {
        this.cubeState = null;
        this.renderer = null;
        this.controls = null;
        this.tutorial = null;
        this.solver = null;
        this.currentTab = 'play';
        this.currentSolution = [];
        this.currentPhases = [];
        this.solutionIndex = 0;
        this.paintHistory = [];
        this.currentPhaseIndex = 0;

        this.init();
    }

    async init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.cubeState = new CubeState();
        this.renderer = new CubeRenderer('cube-container');
        this.controls = new Controls(this.cubeState, this.renderer, (move) => {
            this.onMove(move);
        });
        this.tutorial = new Tutorial(this.cubeState, this.renderer);
        this.solver = new Solver();

        this.setupTabs();
        this.setupSolverPanel();
        this.setupSoundToggle();
        this.updateViewportHint();

        // Scramble the cube on first load for a better first impression
        this.initialScramble();

        console.log('Rubik\'s Cube Solver Ready!');
    }

    async initialScramble() {
        // Wait a moment for the renderer to be ready
        await this.delay(300);

        // Generate a random scramble (15-20 moves)
        const moves = ['U', 'D', 'R', 'L', 'F', 'B'];
        const modifiers = ['', "'", '2'];
        const scrambleLength = 15 + Math.floor(Math.random() * 6);

        let lastMove = '';
        for (let i = 0; i < scrambleLength; i++) {
            // Avoid same face twice in a row
            let move;
            do {
                move = moves[Math.floor(Math.random() * moves.length)];
            } while (move === lastMove);

            const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
            const fullMove = move + modifier;

            // Apply to state (instant, no animation for initial scramble)
            this.cubeState.applyMove(fullMove);

            lastMove = move;
        }

        // Sync renderer with scrambled state
        this.renderer.syncWithState(this.cubeState);
    }

    setupTabs() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        const previousTab = this.currentTab;
        this.currentTab = tabName;

        // Play tab switch sound
        soundManager.init();
        soundManager.playTabSound();

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const activePanel = document.getElementById(`${tabName}-panel`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // Ensure viewport is properly sized after tab switch
        setTimeout(() => {
            this.renderer.onResize();
        }, 50);

        if (tabName === 'solver') {
            this.renderer.resetCube(true);
            this.renderer.enablePaintMode(this.getSelectedColor(), (face, idx, color, error) => {
                this.onPaintSticker(face, idx, color, error);
            });
            this.paintHistory = [];
            this.updateColorCounts();
            this.updateSolverStatus('Click stickers on the cube to paint your current state', 'painting');
            this.resetPhaseIndicators();
        } else {
            this.renderer.disablePaintMode();
            if (previousTab === 'solver') {
                this.cubeState.reset();
                this.renderer.resetCube(false);
            } else {
                // Reset camera for consistent positioning even when not resetting cube
                this.renderer.resetCamera();
            }
        }

        this.updateViewportHint();
    }

    getSelectedColor() {
        const active = document.querySelector('.color-swatch-enhanced.active');
        return active ? active.dataset.color : 'W';
    }

    updateViewportHint() {
        const hintEl = document.querySelector('.info-badge');
        if (!hintEl) return;

        switch (this.currentTab) {
            case 'play':
                hintEl.innerHTML = '◎ Drag to rotate view';
                break;
            case 'tutorial':
                hintEl.innerHTML = '◎ Watch demos for each step';
                break;
            case 'solver':
                hintEl.innerHTML = '◎ Click faces to paint colors';
                break;
        }
    }

    setupSolverPanel() {
        const solveBtn = document.getElementById('solve-btn');
        const resetInputBtn = document.getElementById('reset-input-btn');
        const playSolutionBtn = document.getElementById('play-solution');
        const stepSolutionBtn = document.getElementById('step-solution');
        const undoPaintBtn = document.getElementById('undo-paint-btn');

        // Enhanced color picker with counts
        document.querySelectorAll('.color-swatch-enhanced').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch-enhanced').forEach(s => s.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const color = e.currentTarget.dataset.color;
                this.renderer.setSelectedColor(color);

                // Play click sound for color selection
                soundManager.init();
                soundManager.playClickSound();
            });
        });

        // Keyboard shortcuts for colors (1-6)
        document.addEventListener('keydown', (e) => {
            if (this.currentTab !== 'solver') return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const colorKeys = { '1': 'W', '2': 'Y', '3': 'R', '4': 'O', '5': 'B', '6': 'G' };
            if (colorKeys[e.key]) {
                const color = colorKeys[e.key];
                document.querySelectorAll('.color-swatch-enhanced').forEach(s => {
                    s.classList.toggle('active', s.dataset.color === color);
                });
                this.renderer.setSelectedColor(color);
            }
        });

        if (solveBtn) {
            solveBtn.addEventListener('click', () => this.solveCube());
        }

        if (resetInputBtn) {
            resetInputBtn.addEventListener('click', () => {
                this.renderer.resetCube(true);
                this.renderer.enablePaintMode(this.getSelectedColor(), (face, idx, color, error) => {
                    this.onPaintSticker(face, idx, color, error);
                });
                this.paintHistory = [];
                this.clearSolution();
                this.updateColorCounts();
                this.updateSolverStatus('Cube reset. Paint your cube state.', 'painting');
                this.resetPhaseIndicators();
            });
        }

        if (undoPaintBtn) {
            undoPaintBtn.addEventListener('click', () => this.undoPaint());
        }

        if (playSolutionBtn) {
            playSolutionBtn.addEventListener('click', () => this.playSolution());
        }

        if (stepSolutionBtn) {
            stepSolutionBtn.addEventListener('click', () => this.stepSolution());
        }
    }

    undoPaint() {
        if (this.paintHistory.length === 0) {
            this.showToast('Nothing to undo', 'warning');
            return;
        }

        const lastPaint = this.paintHistory.pop();

        // Restore the previous color
        const paintState = this.renderer.getPaintState();
        paintState[lastPaint.face][lastPaint.index] = lastPaint.previousColor;

        // We need to rebuild the cube visually - for now just update the renderer's internal state
        // and trigger a visual update
        this.renderer.paintState[lastPaint.face][lastPaint.index] = lastPaint.previousColor;

        // Update the cubie color visually
        this.renderer.cubies.forEach(cubie => {
            const { x, y, z } = cubie.userData;
            const faceInfo = this.getFaceFromPosition(lastPaint.face, lastPaint.index, x, y, z);
            if (faceInfo.matches) {
                cubie.material[faceInfo.materialIndex].color.setHex(this.renderer.colors[lastPaint.previousColor]);
            }
        });

        this.updateColorCounts();

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    getFaceFromPosition(face, stickerIdx, x, y, z) {
        // Convert sticker index to row/col
        const row = Math.floor(stickerIdx / 3);
        const col = stickerIdx % 3;

        // Check if this cubie has this face
        const facePositions = {
            'U': { axis: 'y', value: 1, materialIndex: 2 },
            'D': { axis: 'y', value: -1, materialIndex: 3 },
            'R': { axis: 'x', value: 1, materialIndex: 0 },
            'L': { axis: 'x', value: -1, materialIndex: 1 },
            'F': { axis: 'z', value: 1, materialIndex: 4 },
            'B': { axis: 'z', value: -1, materialIndex: 5 }
        };

        const pos = facePositions[face];
        const coords = { x, y, z };

        if (coords[pos.axis] !== pos.value) {
            return { matches: false };
        }

        // Check row/col match
        const cubieRow = face === 'U' ? z + 1 : face === 'D' ? 1 - z : 1 - y;
        const cubieCol = face === 'R' ? 1 - z : face === 'L' ? z + 1 :
            face === 'B' ? 1 - x : x + 1;

        if (cubieRow === row && cubieCol === col) {
            return { matches: true, materialIndex: pos.materialIndex };
        }

        return { matches: false };
    }

    onPaintSticker(face, index, color, error) {
        if (error) {
            this.showToast(error, 'warning');
        } else if (color) {
            // Get the previous color for undo
            const previousColor = this.paintHistory.length > 0 ?
                'U' : 'U'; // Default to unpainted

            this.paintHistory.push({
                face,
                index,
                color,
                previousColor: 'U' // Store previous color
            });

            this.updateColorCounts();
        }
    }

    updateColorCounts() {
        const counts = this.renderer.getColorCounts();
        let totalPainted = 0;

        // Update enhanced color picker counts
        Object.entries(counts).forEach(([color, count]) => {
            totalPainted += count;

            const swatch = document.querySelector(`.color-swatch-enhanced[data-color="${color}"]`);
            if (swatch) {
                const countEl = swatch.querySelector('.swatch-count');
                if (countEl) {
                    countEl.textContent = count;
                }

                swatch.classList.remove('complete', 'overflow');
                if (count === 9) {
                    swatch.classList.add('complete');
                } else if (count > 9) {
                    swatch.classList.add('overflow');
                }
            }
        });

        // Update progress bar
        const progressBar = document.getElementById('paint-progress-bar');
        if (progressBar) {
            const percentage = (totalPainted / 54) * 100;
            progressBar.style.width = `${percentage}%`;
        }

        // Update status based on state
        const allComplete = Object.values(counts).every(c => c === 9);
        const hasOverflow = Object.values(counts).some(c => c > 9);

        if (hasOverflow) {
            this.showToast('Too many of one color! Check color counts.', 'warning');
            this.updateSolverStatus(`Painted ${totalPainted}/54 stickers`, 'painting');
        } else if (allComplete) {
            this.updateSolverStatus('✓ All colors complete! Click "Solve My Cube"', 'ready');
        } else {
            this.updateSolverStatus(`Painted ${totalPainted}/54 stickers`, 'painting');
        }
    }

    updateSolverStatus(message, state = '') {
        const statusEl = document.getElementById('solver-status');
        const indicatorEl = document.getElementById('status-indicator');

        if (statusEl) {
            statusEl.textContent = message;
        }

        if (indicatorEl) {
            indicatorEl.className = 'status-indicator';
            if (state) {
                indicatorEl.classList.add(state);
            }
        }
    }

    resetPhaseIndicators() {
        document.querySelectorAll('.phase-step').forEach(step => {
            step.classList.remove('active', 'complete');
        });
    }

    updatePhaseIndicator(phaseIndex, state = 'active') {
        const phases = ['cross', 'f2l', 'oll', 'pll'];

        document.querySelectorAll('.phase-step').forEach((step, idx) => {
            step.classList.remove('active');
            if (idx < phaseIndex) {
                step.classList.add('complete');
            } else if (idx === phaseIndex && state === 'active') {
                step.classList.add('active');
            }
        });
    }

    async solveCube() {
        const paintState = this.renderer.getPaintState();

        // Check for unpainted stickers
        let unpaintedCount = 0;
        Object.values(paintState).forEach(face => {
            face.forEach(sticker => {
                if (sticker === 'U') unpaintedCount++;
            });
        });

        if (unpaintedCount > 0) {
            this.showToast(`Please paint all stickers. ${unpaintedCount} remaining.`, 'warning');
            return;
        }

        // Apply to cube state
        const tempCube = new CubeState();
        tempCube.setState(paintState);

        // Basic validation
        if (!tempCube.isValid()) {
            this.showSolutionError('Invalid cube state. Each color must appear exactly 9 times.');
            return;
        }

        if (tempCube.isSolved()) {
            this.showSolution(['Already solved! 🎉'], []);
            return;
        }

        this.updateSolverStatus('Calculating solution...', 'solving');
        await this.delay(100);

        // Get paint state and solve
        const result = this.solver.solve(paintState);

        if (!result.success) {
            this.showSolutionError(result.error || 'Could not find solution.');
            this.updateSolverStatus('Solve failed - check cube state', 'painting');
            return;
        }

        if (result.solution.length === 0) {
            this.showSolution(['Already solved! 🎉'], []);
            return;
        }

        this.currentSolution = result.solution;
        this.currentPhases = result.phases || [];
        this.solutionIndex = 0;
        this.currentPhaseIndex = 0;

        this.showSolution(result.solution, result.phases);
        this.updateSolverStatus(`Solution found: ${result.solution.length} moves`, 'ready');

        // Activate first phase
        this.updatePhaseIndicator(0, 'active');
    }

    showSolution(moves, phases = []) {
        const solutionMoves = document.getElementById('solution-moves');
        const solutionControls = document.getElementById('solution-controls');
        const moveCount = document.getElementById('move-count');
        const phasesContainer = document.getElementById('solution-phases-container');

        // Update move count badge
        if (moveCount) {
            if (moves.length > 0 && !moves[0].includes('🎉')) {
                moveCount.textContent = `${moves.length} moves`;
                moveCount.style.display = 'inline';
            } else {
                moveCount.style.display = 'none';
            }
        }

        // Show phase-grouped solution if phases available
        if (phases && phases.length > 0 && phasesContainer) {
            phasesContainer.style.display = 'flex';
            phasesContainer.innerHTML = phases.map((phase, idx) => `
                <div class="solution-phase" data-phase-idx="${idx}">
                    <div class="phase-header">
                        <span class="phase-icon">${phase.icon}</span>
                        <span class="phase-title">${phase.name}</span>
                        <span class="phase-move-count">${phase.moves.length} moves</span>
                    </div>
                    <div class="phase-moves">
                        ${phase.moves.map((m, mIdx) =>
                `<span class="solution-move" data-move-idx="${mIdx}">${m}</span>`
            ).join('')}
                    </div>
                </div>
            `).join('');

            // Hide simple moves display
            if (solutionMoves) {
                solutionMoves.style.display = 'none';
            }
        } else if (solutionMoves) {
            if (phasesContainer) phasesContainer.style.display = 'none';
            solutionMoves.style.display = 'block';

            if (typeof moves[0] === 'string' && moves[0].includes('🎉')) {
                solutionMoves.innerHTML = `<span class="success-message">${moves[0]}</span>`;
            } else {
                solutionMoves.innerHTML = moves.map((m, i) =>
                    `<span class="solution-move" data-index="${i}">${m}</span>`
                ).join(' ');
            }
        }

        if (solutionControls && moves.length > 0 && !moves[0].includes('🎉')) {
            solutionControls.style.display = 'flex';
        }
    }

    showSolutionError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'error') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : '💡';

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);

        if (navigator.vibrate && type === 'error') {
            navigator.vibrate([100, 50, 100]);
        }

        // Play appropriate sound for toast type
        soundManager.init();
        if (type === 'error') {
            soundManager.playErrorSound();
        } else if (type === 'success') {
            soundManager.playSolvedSound();
        }
    }

    clearSolution() {
        const solutionMoves = document.getElementById('solution-moves');
        const solutionControls = document.getElementById('solution-controls');
        const phasesContainer = document.getElementById('solution-phases-container');
        const moveCount = document.getElementById('move-count');

        if (solutionMoves) {
            solutionMoves.style.display = 'block';
            solutionMoves.innerHTML = '<span class="placeholder">Paint your cube state, then click Solve</span>';
        }

        if (solutionControls) {
            solutionControls.style.display = 'none';
        }

        if (phasesContainer) {
            phasesContainer.style.display = 'none';
            phasesContainer.innerHTML = '';
        }

        if (moveCount) {
            moveCount.style.display = 'none';
        }

        this.currentSolution = [];
        this.currentPhases = [];
        this.solutionIndex = 0;
        this.currentPhaseIndex = 0;
    }

    async playSolution() {
        if (!this.currentSolution || this.currentSolution.length === 0) return;

        this.renderer.disablePaintMode();

        const playBtn = document.getElementById('play-solution');
        if (playBtn) {
            playBtn.disabled = true;
            playBtn.innerHTML = '<span class="btn-icon">⏳</span> Playing...';
        }

        // Track which phase we're in for visual feedback
        let moveCounter = 0;

        for (let phaseIdx = 0; phaseIdx < this.currentPhases.length; phaseIdx++) {
            const phase = this.currentPhases[phaseIdx];
            this.updatePhaseIndicator(phaseIdx, 'active');

            // Mark phase as active in solution display
            document.querySelectorAll('.solution-phase').forEach((el, idx) => {
                el.classList.remove('active');
                if (idx < phaseIdx) el.classList.add('complete');
                if (idx === phaseIdx) el.classList.add('active');
            });

            for (let i = 0; i < phase.moves.length; i++) {
                const move = phase.moves[i];

                // Highlight current move
                const phaseEl = document.querySelector(`.solution-phase[data-phase-idx="${phaseIdx}"]`);
                if (phaseEl) {
                    const moveEls = phaseEl.querySelectorAll('.solution-move');
                    moveEls.forEach((el, idx) => {
                        el.classList.remove('current');
                        if (idx < i) el.classList.add('done');
                        if (idx === i) el.classList.add('current');
                    });
                }

                // Play move sound
                soundManager.init();
                soundManager.playMoveSound();

                await this.renderer.animateMove(move, 300);
                moveCounter++;
                await this.delay(30);
            }

            // Mark phase complete
            this.updatePhaseIndicator(phaseIdx + 1, 'active');
        }

        this.solutionIndex = this.currentSolution.length;
        this.updateSolverStatus('Solution complete! 🎉', 'ready');

        // Play solved celebration sound
        soundManager.init();
        soundManager.playSolvedSound();

        // Mark all phases complete
        document.querySelectorAll('.phase-step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('complete');
        });

        if (playBtn) {
            playBtn.disabled = false;
            playBtn.innerHTML = '<span class="btn-icon">▶</span> Replay';
        }
    }

    async stepSolution() {
        if (!this.currentSolution || this.solutionIndex >= this.currentSolution.length) {
            if (this.currentSolution && this.solutionIndex >= this.currentSolution.length) {
                this.updateSolverStatus('Solution complete!', 'ready');
            }
            return;
        }

        this.renderer.disablePaintMode();

        const move = this.currentSolution[this.solutionIndex];

        // Find which phase this move belongs to
        let totalMoves = 0;
        for (let pIdx = 0; pIdx < this.currentPhases.length; pIdx++) {
            const phase = this.currentPhases[pIdx];
            const phaseEnd = totalMoves + phase.moves.length;

            if (this.solutionIndex < phaseEnd) {
                const moveInPhase = this.solutionIndex - totalMoves;

                // Update phase indicator
                this.updatePhaseIndicator(pIdx, 'active');

                // Highlight in phase display
                const phaseEl = document.querySelector(`.solution-phase[data-phase-idx="${pIdx}"]`);
                if (phaseEl) {
                    const moveEls = phaseEl.querySelectorAll('.solution-move');
                    moveEls.forEach((el, idx) => {
                        el.classList.remove('current', 'done');
                        if (idx < moveInPhase) el.classList.add('done');
                        if (idx === moveInPhase) el.classList.add('current');
                    });
                }

                // Mark previous phases complete
                document.querySelectorAll('.solution-phase').forEach((el, idx) => {
                    el.classList.remove('active');
                    if (idx < pIdx) el.classList.add('complete');
                    if (idx === pIdx) el.classList.add('active');
                });

                break;
            }
            totalMoves = phaseEnd;
        }

        // Play move sound for step
        soundManager.init();
        soundManager.playMoveSound();

        await this.renderer.animateMove(move, 350);

        this.solutionIndex++;

        const remaining = this.currentSolution.length - this.solutionIndex;
        if (remaining > 0) {
            this.updateSolverStatus(`${remaining} moves remaining`, 'solving');
        } else {
            this.updateSolverStatus('Solution complete! 🎉', 'ready');
            document.querySelectorAll('.phase-step').forEach(step => {
                step.classList.remove('active');
                step.classList.add('complete');
            });

            // Play solved celebration sound
            soundManager.init();
            soundManager.playSolvedSound();
        }
    }

    highlightSolutionMove(index) {
        document.querySelectorAll('.solution-move').forEach(el => {
            el.classList.remove('current');
        });

        const current = document.querySelector(`.solution-move[data-index="${index}"]`);
        if (current) {
            current.classList.add('current');
            current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    markSolutionMoveDone(index) {
        const el = document.querySelector(`.solution-move[data-index="${index}"]`);
        if (el) {
            el.classList.remove('current');
            el.classList.add('done');
        }
    }

    onMove(move) {
        if (this.cubeState.isSolved()) {
            console.log('🎉 Cube Solved!');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setupSoundToggle() {
        const soundBtn = document.getElementById('sound-btn');
        if (!soundBtn) return;

        // Initialize audio on first click
        soundBtn.addEventListener('click', () => {
            soundManager.init();
            const enabled = soundManager.toggle();

            // Update button visual state
            if (enabled) {
                soundBtn.classList.remove('muted');
                soundManager.playClickSound();
            } else {
                soundBtn.classList.add('muted');
            }
        });

        // Re-create Lucide icons after DOM update
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    }
}

const app = new RubiksCubeApp();
window.rubiksCubeApp = app;
