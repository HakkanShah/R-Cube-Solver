// main.js - Application with Paint Validation Feedback

import { CubeState } from './cube/CubeState.js';
import { CubeRenderer } from './cube/CubeRenderer.js';
import { Controls } from './ui/Controls.js';
import { Tutorial } from './ui/Tutorial.js';
import { Solver } from './solver/Solver.js';

class RubiksCubeApp {
    constructor() {
        this.cubeState = null;
        this.renderer = null;
        this.controls = null;
        this.tutorial = null;
        this.solver = null;
        this.currentTab = 'play';
        this.currentSolution = [];
        this.solutionIndex = 0;

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
        this.updateViewportHint();

        console.log('🎲 Rubik\'s Cube Solver Ready!');
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

        if (tabName === 'solver') {
            this.renderer.resetCube(true);
            this.renderer.enablePaintMode(this.getSelectedColor(), (face, idx, color, error) => {
                this.onPaintSticker(face, idx, color, error);
            });
            this.updateColorCounts();
            this.updateSolverStatus('Click stickers on the cube to paint your current state');
        } else {
            this.renderer.disablePaintMode();
            if (previousTab === 'solver') {
                this.cubeState.reset();
                this.renderer.resetCube(false);
            }
        }

        this.updateViewportHint();
    }

    getSelectedColor() {
        const active = document.querySelector('.color-swatch.active');
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

        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                const color = e.target.dataset.color;
                this.renderer.setSelectedColor(color);
            });
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
                this.clearSolution();
                this.updateColorCounts();
                this.updateSolverStatus('Cube reset. Paint your cube state.');
            });
        }

        if (playSolutionBtn) {
            playSolutionBtn.addEventListener('click', () => this.playSolution());
        }

        if (stepSolutionBtn) {
            stepSolutionBtn.addEventListener('click', () => this.stepSolution());
        }
    }

    onPaintSticker(face, index, color, error) {
        if (error) {
            // Show paint validation error as toast
            this.showToast(error, 'warning');
            // Haptic feedback already handled in showToast
        } else {
            this.updateColorCounts();
        }
    }

    updateColorCounts() {
        const counts = this.renderer.getColorCounts();
        let totalPainted = 0;

        // Update UI
        Object.entries(counts).forEach(([color, count]) => {
            totalPainted += count;

            const el = document.querySelector(`.color-count[data-color="${color}"]`);
            if (el) {
                const valueEl = el.querySelector('.count-value');
                if (valueEl) {
                    valueEl.textContent = count;
                }

                el.classList.remove('complete', 'overflow');
                if (count === 9) {
                    el.classList.add('complete');
                } else if (count > 9) {
                    el.classList.add('overflow');
                }
            }
        });

        // Update status - keep progress inline, warnings as toast
        const allComplete = Object.values(counts).every(c => c === 9);
        const hasOverflow = Object.values(counts).some(c => c > 9);

        if (hasOverflow) {
            // Show warning as toast, but keep inline status as progress
            this.showToast('Too many of one color! Check color counts.', 'warning');
            this.updateSolverStatus(`Painted ${totalPainted}/54 stickers`);
        } else if (allComplete) {
            this.updateSolverStatus('✓ All colors correct! Click "Solve My Cube"');
        } else {
            this.updateSolverStatus(`Painted ${totalPainted}/54 stickers`);
        }
    }

    updateSolverStatus(message) {
        const statusEl = document.getElementById('solver-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
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
            this.showSolution(['Already solved! 🎉']);
            return;
        }

        this.updateSolverStatus('Calculating solution...');
        await this.delay(100);

        // Get paint state and solve
        const result = this.solver.solve(paintState);

        if (!result.success) {
            this.showSolutionError(result.error || 'Could not find solution.');
            return;
        }

        if (result.solution.length === 0) {
            this.showSolution(['Already solved! 🎉']);
            return;
        }

        this.currentSolution = result.solution;
        this.solutionIndex = 0;

        this.showSolution(result.solution);
        this.updateSolverStatus(`Solution found: ${result.solution.length} moves`);
    }

    showSolution(moves) {
        const solutionMoves = document.getElementById('solution-moves');
        const solutionControls = document.getElementById('solution-controls');

        if (solutionMoves) {
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

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 3000);

        // Haptic feedback on mobile
        if (navigator.vibrate && type === 'error') {
            navigator.vibrate([100, 50, 100]);
        }
    }

    clearSolution() {
        const solutionMoves = document.getElementById('solution-moves');
        const solutionControls = document.getElementById('solution-controls');

        if (solutionMoves) {
            solutionMoves.innerHTML = '<span class="placeholder">Paint your cube state, then click Solve</span>';
        }

        if (solutionControls) {
            solutionControls.style.display = 'none';
        }

        this.currentSolution = [];
        this.solutionIndex = 0;
    }

    async playSolution() {
        if (!this.currentSolution || this.currentSolution.length === 0) return;

        this.renderer.disablePaintMode();

        const playBtn = document.getElementById('play-solution');
        if (playBtn) {
            playBtn.disabled = true;
            playBtn.innerHTML = '<span class="btn-icon">⏳</span> Playing...';
        }

        for (let i = this.solutionIndex; i < this.currentSolution.length; i++) {
            const move = this.currentSolution[i];
            this.highlightSolutionMove(i);
            await this.renderer.animateMove(move, 350);
            this.markSolutionMoveDone(i);
            await this.delay(50);
        }

        this.solutionIndex = this.currentSolution.length;
        this.updateSolverStatus('Solution complete! 🎉');

        if (playBtn) {
            playBtn.disabled = false;
            playBtn.innerHTML = '<span class="btn-icon">▶</span> Replay';
        }
    }

    async stepSolution() {
        if (!this.currentSolution || this.solutionIndex >= this.currentSolution.length) {
            if (this.currentSolution && this.solutionIndex >= this.currentSolution.length) {
                this.updateSolverStatus('Solution complete!');
            }
            return;
        }

        this.renderer.disablePaintMode();

        const move = this.currentSolution[this.solutionIndex];
        this.highlightSolutionMove(this.solutionIndex);
        await this.renderer.animateMove(move, 400);
        this.markSolutionMoveDone(this.solutionIndex);

        this.solutionIndex++;

        const remaining = this.currentSolution.length - this.solutionIndex;
        this.updateSolverStatus(`${remaining} moves remaining`);
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
}

const app = new RubiksCubeApp();
window.rubiksCubeApp = app;
