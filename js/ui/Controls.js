// Controls.js - UI Controls with Undo/Redo and Mobile Support
import soundManager from '../audio/SoundManager.js';

export class Controls {
    constructor(cubeState, cubeRenderer, onMoveCallback) {
        this.cubeState = cubeState;
        this.renderer = cubeRenderer;
        this.onMove = onMoveCallback || (() => { });
        this.selectedColor = 'W';

        // Separate history for user moves (not scramble)
        this.userMoveHistory = [];
        this.redoStack = [];

        this.init();
    }

    init() {
        this.setupMoveButtons();
        this.setupActionButtons();
        this.setupKeyboardShortcuts();
        this.setupHelpModal();
        this.setupMobileNav();
    }

    setupMoveButtons() {
        document.querySelectorAll('.move-btn').forEach(btn => {
            // Support both click and touch
            const handleMove = async (e) => {
                e.preventDefault();
                const move = btn.dataset.move;
                if (move) {
                    await this.executeMove(move);
                }
            };

            btn.addEventListener('click', handleMove);
        });
    }

    setupActionButtons() {
        const scrambleBtn = document.getElementById('scramble-btn');
        const resetBtn = document.getElementById('reset-btn');
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (scrambleBtn) {
            scrambleBtn.addEventListener('click', () => this.scramble());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.redo());
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', async (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const key = e.key.toUpperCase();
            const validMoves = ['R', 'L', 'U', 'D', 'F', 'B'];

            if (validMoves.includes(key)) {
                e.preventDefault();
                const move = e.shiftKey ? key + "'" : key;
                await this.executeMove(move);
            } else if (e.key === ' ') {
                e.preventDefault();
                this.scramble();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.reset();
            } else if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undo();
            } else if ((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    setupHelpModal() {
        const helpBtn = document.getElementById('help-btn');
        const modal = document.getElementById('shortcuts-modal');
        const closeBtn = modal?.querySelector('.close-modal');

        if (helpBtn && modal) {
            helpBtn.addEventListener('click', () => {
                modal.classList.add('active');
            });

            closeBtn?.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    setupMobileNav() {
        // Mirror desktop tab functionality
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = btn.dataset.tab;

                // Update mobile nav active state
                document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Also update desktop tabs
                document.querySelectorAll('.nav-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.tab === tabName);
                });

                // Trigger the tab switch (main.js handles the actual logic)
                const desktopTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
                if (desktopTab) {
                    desktopTab.click();
                }
            });
        });

        // Sync mobile nav when desktop tabs are clicked
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === tabName);
                });
            });
        });
    }

    async executeMove(move) {
        // Initialize sound on first interaction
        soundManager.init();

        // Provide haptic feedback on mobile if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Play move sound
        soundManager.playMoveSound();

        // Apply to state
        this.cubeState.applyMove(move);

        // Animate
        await this.renderer.animateMove(move, 250);

        // Add to user move history (for display)
        this.userMoveHistory.push(move);

        // Clear redo stack when new move is made
        this.redoStack = [];

        // Update history display
        this.updateMoveHistory();

        // Callback
        this.onMove(move);

        // Check if solved
        if (this.cubeState.isSolved()) {
            this.showSolvedMessage();
        }
    }

    async scramble() {
        // Initialize sound on first interaction
        soundManager.init();

        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
        }

        this.cubeState.reset();
        this.renderer.resetCube();

        const scramble = this.cubeState.scramble(20);
        const moves = scramble.split(' ');

        // Animate scramble faster with sound
        for (const move of moves) {
            soundManager.playScrambleSound();
            await this.renderer.animateMove(move, 80);
        }

        // Clear user move history on scramble (scramble moves not shown)
        this.userMoveHistory = [];
        this.redoStack = [];
        this.updateMoveHistory();
    }

    reset() {
        // Initialize sound on first interaction
        soundManager.init();

        if (navigator.vibrate) {
            navigator.vibrate(15);
        }

        // Play reset sound
        soundManager.playResetSound();

        this.cubeState.reset();
        this.renderer.resetCube();

        // Clear user move history on reset
        this.userMoveHistory = [];
        this.redoStack = [];
        this.updateMoveHistory();
    }

    async undo() {
        if (this.userMoveHistory.length === 0) return;

        // Initialize sound on first interaction
        soundManager.init();

        const lastMove = this.userMoveHistory.pop();

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Play undo sound
        soundManager.playUndoSound();

        // Apply inverse move to state
        const inverse = this.getInverseMove(lastMove);
        this.cubeState.applyMove(inverse);

        // Animate
        await this.renderer.animateMove(inverse, 200);

        // Add to redo stack
        this.redoStack.push(lastMove);

        this.updateMoveHistory();
    }

    async redo() {
        if (this.redoStack.length === 0) return;

        // Initialize sound on first interaction
        soundManager.init();

        const move = this.redoStack.pop();

        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Play redo sound
        soundManager.playRedoSound();

        // Apply move to state
        this.cubeState.applyMove(move);

        // Animate
        await this.renderer.animateMove(move, 200);

        // Add back to history
        this.userMoveHistory.push(move);

        this.updateMoveHistory();
    }

    getInverseMove(move) {
        if (move.includes("'")) return move.replace("'", "");
        if (move.includes("2")) return move;
        return move + "'";
    }

    updateMoveHistory() {
        const historyEl = document.getElementById('move-history');
        if (!historyEl) return;

        const moves = this.userMoveHistory;

        if (moves.length === 0) {
            historyEl.innerHTML = '<span class="placeholder">No moves yet</span>';
        } else {
            // Show last 25 moves
            historyEl.innerHTML = moves.slice(-25).map(m =>
                `<span class="history-move">${m}</span>`
            ).join('');

            historyEl.scrollTop = historyEl.scrollHeight;
        }

        // Update button states
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = this.userMoveHistory.length === 0;
        }
        if (redoBtn) {
            redoBtn.disabled = this.redoStack.length === 0;
        }
    }

    showSolvedMessage() {
        console.log('🎉 Cube Solved!');
        if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50, 100, 100]);
        }

        // Play victory sound
        soundManager.playSolvedSound();
    }
}

export default Controls;
