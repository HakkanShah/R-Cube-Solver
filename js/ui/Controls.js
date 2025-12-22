// Controls.js - UI Controls with Mobile Support

export class Controls {
    constructor(cubeState, cubeRenderer, onMoveCallback) {
        this.cubeState = cubeState;
        this.renderer = cubeRenderer;
        this.onMove = onMoveCallback || (() => { });
        this.selectedColor = 'W';

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

        if (scrambleBtn) {
            scrambleBtn.addEventListener('click', () => this.scramble());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
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
        // Provide haptic feedback on mobile if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }

        // Apply to state
        this.cubeState.applyMove(move);

        // Animate
        await this.renderer.animateMove(move, 250);

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
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
        }

        this.cubeState.reset();
        this.renderer.resetCube();

        const scramble = this.cubeState.scramble(20);
        const moves = scramble.split(' ');

        // Animate scramble faster
        for (const move of moves) {
            await this.renderer.animateMove(move, 80);
        }

        this.updateMoveHistory();
    }

    reset() {
        if (navigator.vibrate) {
            navigator.vibrate(15);
        }

        this.cubeState.reset();
        this.renderer.resetCube();
        this.updateMoveHistory();
    }

    async undo() {
        const lastMove = this.cubeState.undo();
        if (lastMove) {
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }

            const inverse = this.getInverseMove(lastMove);
            await this.renderer.animateMove(inverse, 200);
            this.updateMoveHistory();
        }
    }

    getInverseMove(move) {
        if (move.includes("'")) return move.replace("'", "");
        if (move.includes("2")) return move;
        return move + "'";
    }

    updateMoveHistory() {
        const historyEl = document.getElementById('move-history');
        if (!historyEl) return;

        const moves = this.cubeState.moveHistory;

        if (moves.length === 0) {
            historyEl.innerHTML = '<span class="placeholder">No moves yet</span>';
        } else {
            // Show last 25 moves
            historyEl.innerHTML = moves.slice(-25).map(m =>
                `<span class="history-move">${m}</span>`
            ).join('');

            historyEl.scrollTop = historyEl.scrollHeight;
        }
    }

    showSolvedMessage() {
        console.log('🎉 Cube Solved!');
        if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50, 100, 100]);
        }
    }
}

export default Controls;
