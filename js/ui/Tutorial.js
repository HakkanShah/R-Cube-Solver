// Tutorial.js - Step-by-step solving tutorial

export class Tutorial {
    constructor(cubeState, cubeRenderer) {
        this.cubeState = cubeState;
        this.renderer = cubeRenderer;
        this.currentStep = 1;
        this.totalSteps = 7;
        this.isPlayingDemo = false;

        this.steps = [
            {
                id: 1,
                name: 'White Cross',
                description: 'Form a cross on the white face, matching edge colors with center pieces.',
                algorithms: ["F", "R", "U", "R'", "U'", "F'"],
                demo: "F R U R' U' F'"
            },
            {
                id: 2,
                name: 'White Corners',
                description: 'Position and orient the four white corner pieces using the "sexy move".',
                algorithms: ["R", "U", "R'", "U'"],
                demo: "R U R' U' R U R' U' R U R' U'"
            },
            {
                id: 3,
                name: 'Second Layer',
                description: 'Solve the middle layer edges. Insert edges left or right.',
                algorithms: ["U R U' R' U' F' U F", "U' L' U L U F U' F'"],
                demo: "U R U' R' U' F' U F"
            },
            {
                id: 4,
                name: 'Yellow Cross',
                description: 'Create a yellow cross on the top face using F R U R\' U\' F\'.',
                algorithms: ["F R U R' U' F'"],
                demo: "F R U R' U' F'"
            },
            {
                id: 5,
                name: 'Yellow Edges',
                description: 'Position the yellow edge pieces correctly around the cross.',
                algorithms: ["R U R' U R U2 R'"],
                demo: "R U R' U R U2 R'"
            },
            {
                id: 6,
                name: 'Position Yellow Corners',
                description: 'Move yellow corners to their correct positions (may not be oriented).',
                algorithms: ["U R U' L' U R' U' L"],
                demo: "U R U' L' U R' U' L"
            },
            {
                id: 7,
                name: 'Orient Yellow Corners',
                description: 'Twist corners to complete the cube! Use R\' D\' R D repeatedly.',
                algorithms: ["R' D' R D"],
                demo: "R' D' R D R' D' R D"
            }
        ];

        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupDemoButtons();
        this.setupStepSelection();
        this.updateUI();
    }

    setupNavigation() {
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
    }

    setupDemoButtons() {
        document.querySelectorAll('.demo-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const stepId = parseInt(e.target.dataset.step);
                await this.playDemo(stepId);
            });
        });
    }

    setupStepSelection() {
        document.querySelectorAll('.tutorial-step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepId = parseInt(step.dataset.step);
                if (stepId) {
                    this.goToStep(stepId);
                }
            });
        });
    }

    goToStep(stepId) {
        if (stepId >= 1 && stepId <= this.totalSteps) {
            this.currentStep = stepId;
            this.updateUI();
        }
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateUI();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    }

    updateUI() {
        // Update step highlighting
        document.querySelectorAll('.tutorial-step').forEach(step => {
            const stepId = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (stepId === this.currentStep) {
                step.classList.add('active');
                step.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (stepId < this.currentStep) {
                step.classList.add('completed');
            }
        });

        // Update progress bar
        const progressFill = document.getElementById('tutorial-progress');
        const progressText = document.getElementById('progress-text');

        if (progressFill) {
            progressFill.style.width = `${(this.currentStep / this.totalSteps) * 100}%`;
        }

        if (progressText) {
            progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');

        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentStep === this.totalSteps;
            nextBtn.textContent = this.currentStep === this.totalSteps ? 'Complete!' : 'Next →';
        }
    }

    async playDemo(stepId) {
        if (this.isPlayingDemo) return;

        const step = this.steps.find(s => s.id === stepId);
        if (!step) return;

        this.isPlayingDemo = true;

        // Update button to show playing state
        const btn = document.querySelector(`.demo-btn[data-step="${stepId}"]`);
        const originalHTML = btn?.innerHTML;
        if (btn) {
            btn.innerHTML = '<span class="btn-icon">⏸</span> Playing...';
            btn.disabled = true;
        }

        // Reset cube first
        this.cubeState.reset();
        this.renderer.resetCube();

        // Wait a moment
        await this.delay(300);

        // Play the demo moves
        const moves = step.demo.split(' ').filter(m => m);
        for (const move of moves) {
            this.cubeState.applyMove(move, false);
            await this.renderer.animateMove(move, 400);
            await this.delay(100);
        }

        // Reset button
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }

        this.isPlayingDemo = false;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getCurrentStep() {
        return this.steps.find(s => s.id === this.currentStep);
    }

    markCurrentStepComplete() {
        const stepEl = document.querySelector(`.tutorial-step[data-step="${this.currentStep}"]`);
        if (stepEl) {
            stepEl.classList.add('completed');
        }
        this.nextStep();
    }
}

export default Tutorial;
