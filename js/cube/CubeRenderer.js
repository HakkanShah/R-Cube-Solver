// CubeRenderer.js - 3D Cube with Correct Paint Validation

export class CubeRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.cubeGroup = null;
        this.cubies = [];
        this.isAnimating = false;
        this.animationQueue = [];
        this.paintMode = false;
        this.selectedColor = 'W';
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.onPaintCallback = null;

        // Orientation Gizmo (Axis Indicator)
        this.gizmoScene = null;
        this.gizmoCamera = null;
        this.gizmoSize = 130; // pixels

        // Color mapping - Bold, distinct colors
        // Yellow is pure bright, Orange is deep red-orange for clear distinction
        this.colors = {
            'W': 0xffffff,  // Pure white
            'Y': 0xffdd00,  // Pure bright yellow (more golden)
            'R': 0xdc143c,  // Crimson red
            'O': 0xff4500,  // OrangeRed - clearly distinct from yellow
            'B': 0x0051ba,  // Deep royal blue
            'G': 0x009b48,  // Classic Rubik's green
            'X': 0x1a1a1a,  // Internal (dark)
            'U': 0x0a0a0a   // Unpainted (black)
        };

        // Face normals
        this.faceNormals = {
            'U': new THREE.Vector3(0, 1, 0),
            'D': new THREE.Vector3(0, -1, 0),
            'R': new THREE.Vector3(1, 0, 0),
            'L': new THREE.Vector3(-1, 0, 0),
            'F': new THREE.Vector3(0, 0, 1),
            'B': new THREE.Vector3(0, 0, -1)
        };

        // Paint state
        this.paintState = null;

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(5, 4, 6);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 12;
        this.controls.enablePan = false;
        this.controls.rotateSpeed = 0.8;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, -5, -5);
        this.scene.add(backLight);

        this.buildCube();
        this.initOrientationGizmo();
        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
        this.renderer.domElement.addEventListener('touchend', (e) => this.onTouch(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.animate();
    }

    buildCube(unpainted = false) {
        if (this.cubeGroup) {
            this.scene.remove(this.cubeGroup);
        }

        this.cubeGroup = new THREE.Group();
        this.cubies = [];

        const cubieSize = 0.92;
        const gap = 1.0;

        // Initialize paint state - completely blank when unpainted
        if (unpainted) {
            this.paintState = {
                U: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U'],
                D: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U'],
                F: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U'],
                B: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U'],
                L: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U'],
                R: ['U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U']
            };
        } else {
            this.paintState = {
                U: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
                D: ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'],
                F: ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'],
                B: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
                L: ['O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O'],
                R: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']
            };
        }

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubie = this.createCubie(x, y, z, cubieSize, unpainted);
                    cubie.position.set(x * gap, y * gap, z * gap);
                    cubie.userData = { x, y, z };
                    this.cubeGroup.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }

        this.scene.add(this.cubeGroup);
    }

    createCubie(x, y, z, size, unpainted = false) {
        const geometry = new THREE.BoxGeometry(size, size, size);

        const getColor = (face, isExternal) => {
            if (!isExternal) return this.colors['X'];
            if (unpainted) {
                return this.colors['U'];
            }
            // Solved state colors
            if (face === 'R') return this.colors['R'];
            if (face === 'L') return this.colors['O'];
            if (face === 'U') return this.colors['W'];
            if (face === 'D') return this.colors['Y'];
            if (face === 'F') return this.colors['G'];
            if (face === 'B') return this.colors['B'];
            return this.colors['X'];
        };

        const materials = [
            new THREE.MeshStandardMaterial({ color: getColor('R', x === 1), roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: getColor('L', x === -1), roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: getColor('U', y === 1), roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: getColor('D', y === -1), roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: getColor('F', z === 1), roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: getColor('B', z === -1), roughness: 0.3, metalness: 0.1 })
        ];

        return new THREE.Mesh(geometry, materials);
    }

    enablePaintMode(color = 'W', callback = null) {
        this.paintMode = true;
        this.selectedColor = color;
        this.onPaintCallback = callback;
        // Default to grab cursor, will change to paintbrush when over cube
        this.container.style.cursor = 'grab';
        this.container.classList.add('paint-mode');
    }

    disablePaintMode() {
        this.paintMode = false;
        this.container.style.cursor = 'grab';
        this.container.classList.remove('paint-mode');
    }

    setSelectedColor(color) {
        this.selectedColor = color;
    }

    onMouseMove(event) {
        if (!this.paintMode) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Check if hovering over a cube sticker
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubies);

        if (intersects.length > 0) {
            // Check if this is actually an external face (paintable)
            const intersect = intersects[0];
            const cubie = intersect.object;
            const faceIndex = intersect.faceIndex;
            const materialIndex = Math.floor(faceIndex / 2);
            const { faceName } = this.getFaceAndIndex(cubie, materialIndex);

            if (faceName) {
                // Over a paintable sticker - use custom paintbrush cursor
                this.container.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23e8a54b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z\'/%3E%3Cpath d=\'M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7\'/%3E%3Cpath d=\'M14.5 17.5 4.5 15\'/%3E%3C/svg%3E") 2 22, crosshair';
            } else {
                // Internal face, not paintable
                this.container.style.cursor = 'grab';
            }
        } else {
            // Not over cube - use grab cursor
            this.container.style.cursor = 'grab';
        }
    }

    onClick(event) {
        if (!this.paintMode) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.handlePaint();
    }

    onTouch(event) {
        if (!this.paintMode || !event.changedTouches[0]) return;

        event.preventDefault();
        const touch = event.changedTouches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        this.handlePaint();
    }

    handlePaint() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubies);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const cubie = intersect.object;
            const faceIndex = intersect.faceIndex;
            const materialIndex = Math.floor(faceIndex / 2);

            const { faceName, stickerIndex } = this.getFaceAndIndex(cubie, materialIndex);

            if (faceName && stickerIndex !== -1) {
                // Validate paint
                const validation = this.validatePaint(cubie, materialIndex, this.selectedColor);

                if (!validation.valid) {
                    if (this.onPaintCallback) {
                        this.onPaintCallback(faceName, stickerIndex, null, validation.reason);
                    }
                    return;
                }

                // Apply paint
                this.paintState[faceName][stickerIndex] = this.selectedColor;
                cubie.material[materialIndex].color.setHex(this.colors[this.selectedColor]);

                if (this.onPaintCallback) {
                    this.onPaintCallback(faceName, stickerIndex, this.selectedColor, null);
                }
            }
        }
    }

    // Validate using the actual cubie - check all visible faces of the same cubie
    validatePaint(cubie, paintingMaterialIndex, color) {
        const { x, y, z } = cubie.userData;

        // Rule 1: Max 9 of each color
        const counts = this.getColorCounts();

        // Get current color at the position we're painting
        const { faceName: currentFace, stickerIndex: currentIdx } = this.getFaceAndIndex(cubie, paintingMaterialIndex);
        const currentColor = this.paintState[currentFace][currentIdx];

        // If replacing same color, allow
        if (currentColor === color) {
            return { valid: true };
        }

        // If adding new color, check if already at 9
        if (currentColor !== color && counts[color] >= 9) {
            return { valid: false, reason: `Already have 9 ${this.getColorName(color)} stickers!` };
        }

        // Rule 3: Centers must be unique colors
        if (currentIdx === 4) { // Center piece
            for (const [fName, faceColors] of Object.entries(this.paintState)) {
                if (fName === currentFace) continue;
                if (faceColors[4] === color) {
                    return { valid: false, reason: `Center ${this.getColorName(color)} is already used on ${fName} face!` };
                }
            }
        }


        // Rule 2: Same cubie can't have same color on different visible faces
        // Check all 6 material indices for this cubie
        const visibleFaces = [];

        // Material 0 = +X (R face) - visible if x === 1
        if (x === 1) visibleFaces.push({ matIdx: 0, face: 'R' });
        // Material 1 = -X (L face) - visible if x === -1
        if (x === -1) visibleFaces.push({ matIdx: 1, face: 'L' });
        // Material 2 = +Y (U face) - visible if y === 1
        if (y === 1) visibleFaces.push({ matIdx: 2, face: 'U' });
        // Material 3 = -Y (D face) - visible if y === -1
        if (y === -1) visibleFaces.push({ matIdx: 3, face: 'D' });
        // Material 4 = +Z (F face) - visible if z === 1
        if (z === 1) visibleFaces.push({ matIdx: 4, face: 'F' });
        // Material 5 = -Z (B face) - visible if z === -1
        if (z === -1) visibleFaces.push({ matIdx: 5, face: 'B' });

        // Check other faces of this cubie for same color
        for (const { matIdx, face } of visibleFaces) {
            if (matIdx === paintingMaterialIndex) continue; // Skip the face we're painting

            const { stickerIndex } = this.getFaceAndIndex(cubie, matIdx);
            if (stickerIndex !== -1) {
                const existingColor = this.paintState[face][stickerIndex];
                if (existingColor === color) {
                    return { valid: false, reason: `This piece already has ${this.getColorName(color)} on another face!` };
                }
            }
        }

        return { valid: true };
    }

    getColorCounts() {
        const counts = { W: 0, Y: 0, R: 0, O: 0, B: 0, G: 0 };
        Object.values(this.paintState).forEach(face => {
            face.forEach(color => {
                if (counts.hasOwnProperty(color)) {
                    counts[color]++;
                }
            });
        });
        return counts;
    }

    getColorName(code) {
        const names = { W: 'White', Y: 'Yellow', R: 'Red', O: 'Orange', B: 'Blue', G: 'Green' };
        return names[code] || code;
    }

    getFaceAndIndex(cubie, materialIndex) {
        const { x, y, z } = cubie.userData;
        let faceName = null;
        let row, col;

        switch (materialIndex) {
            case 0: // Right (+X)
                if (x !== 1) return { faceName: null, stickerIndex: -1 };
                faceName = 'R';
                row = 1 - y;
                col = 1 - z;
                break;
            case 1: // Left (-X)
                if (x !== -1) return { faceName: null, stickerIndex: -1 };
                faceName = 'L';
                row = 1 - y;
                col = z + 1;
                break;
            case 2: // Up (+Y)
                if (y !== 1) return { faceName: null, stickerIndex: -1 };
                faceName = 'U';
                row = z + 1;
                col = x + 1;
                break;
            case 3: // Down (-Y)
                if (y !== -1) return { faceName: null, stickerIndex: -1 };
                faceName = 'D';
                row = 1 - z;
                col = x + 1;
                break;
            case 4: // Front (+Z)
                if (z !== 1) return { faceName: null, stickerIndex: -1 };
                faceName = 'F';
                row = 1 - y;
                col = x + 1;
                break;
            case 5: // Back (-Z)
                if (z !== -1) return { faceName: null, stickerIndex: -1 };
                faceName = 'B';
                row = 1 - y;
                col = 1 - x;
                break;
        }

        if (faceName) {
            return { faceName, stickerIndex: row * 3 + col };
        }
        return { faceName: null, stickerIndex: -1 };
    }

    getPaintState() {
        return JSON.parse(JSON.stringify(this.paintState));
    }

    // Animate move
    async animateMove(move, duration = 300) {
        return new Promise(resolve => {
            if (this.isAnimating) {
                this.animationQueue.push({ move, duration, resolve });
                return;
            }

            this.isAnimating = true;
            const face = move.charAt(0).toUpperCase();
            const prime = move.includes("'");
            const double = move.includes("2");

            const angle = (prime ? 1 : -1) * Math.PI / 2 * (double ? 2 : 1);
            const cubiesToRotate = this.getCubiesOnFace(face);
            const rotationGroup = new THREE.Group();
            this.scene.add(rotationGroup);

            cubiesToRotate.forEach(cubie => {
                this.cubeGroup.remove(cubie);
                rotationGroup.add(cubie);
            });

            const axis = this.faceNormals[face].clone();
            const startTime = Date.now();

            const animateRotation = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);

                rotationGroup.setRotationFromAxisAngle(axis, angle * eased);

                if (progress < 1) {
                    requestAnimationFrame(animateRotation);
                } else {
                    cubiesToRotate.forEach(cubie => {
                        const pos = new THREE.Vector3();
                        cubie.getWorldPosition(pos);
                        cubie.position.set(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z));
                        cubie.userData.x = cubie.position.x;
                        cubie.userData.y = cubie.position.y;
                        cubie.userData.z = cubie.position.z;

                        const worldQuat = new THREE.Quaternion();
                        cubie.getWorldQuaternion(worldQuat);
                        cubie.quaternion.copy(worldQuat);

                        rotationGroup.remove(cubie);
                        this.cubeGroup.add(cubie);
                    });

                    this.scene.remove(rotationGroup);
                    this.isAnimating = false;

                    if (this.animationQueue.length > 0) {
                        const next = this.animationQueue.shift();
                        this.animateMove(next.move, next.duration).then(next.resolve);
                    }

                    resolve();
                }
            };

            animateRotation();
        });
    }

    getCubiesOnFace(face) {
        return this.cubies.filter(cubie => {
            const { x, y, z } = cubie.userData;
            switch (face) {
                case 'R': return x === 1;
                case 'L': return x === -1;
                case 'U': return y === 1;
                case 'D': return y === -1;
                case 'F': return z === 1;
                case 'B': return z === -1;
                default: return false;
            }
        });
    }

    resetCube(unpainted = false) {
        if (this.cubeGroup) {
            this.scene.remove(this.cubeGroup);
        }
        this.cubies = [];
        this.animationQueue = [];
        this.isAnimating = false;
        this.buildCube(unpainted);

        // Reset camera to default position for consistent viewport
        this.resetCamera();
    }

    resetCamera() {
        // Reset camera to default position
        this.camera.position.set(5, 4, 6);
        this.camera.lookAt(0, 0, 0);

        // Reset orbit controls
        if (this.controls) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Sync the visual cube with a CubeState object
     * @param {CubeState} cubeState - The cube state to sync with
     */
    syncWithState(cubeState) {
        const state = cubeState.getState();

        // Map each cubie's faces based on position
        this.cubies.forEach(cubie => {
            const { x, y, z } = cubie.userData;

            // For each face of the cubie that's visible (external)
            const materials = cubie.material;

            // Right face (x = 1)
            if (x === 1) {
                const idx = this.getStickerIndex('R', y, z);
                if (idx !== -1) {
                    materials[0].color.setHex(this.colors[state.R[idx]]);
                }
            }

            // Left face (x = -1)
            if (x === -1) {
                const idx = this.getStickerIndex('L', y, z);
                if (idx !== -1) {
                    materials[1].color.setHex(this.colors[state.L[idx]]);
                }
            }

            // Up face (y = 1)
            if (y === 1) {
                const idx = this.getStickerIndex('U', x, z);
                if (idx !== -1) {
                    materials[2].color.setHex(this.colors[state.U[idx]]);
                }
            }

            // Down face (y = -1)
            if (y === -1) {
                const idx = this.getStickerIndex('D', x, z);
                if (idx !== -1) {
                    materials[3].color.setHex(this.colors[state.D[idx]]);
                }
            }

            // Front face (z = 1)
            if (z === 1) {
                const idx = this.getStickerIndex('F', x, y);
                if (idx !== -1) {
                    materials[4].color.setHex(this.colors[state.F[idx]]);
                }
            }

            // Back face (z = -1)
            if (z === -1) {
                const idx = this.getStickerIndex('B', x, y);
                if (idx !== -1) {
                    materials[5].color.setHex(this.colors[state.B[idx]]);
                }
            }
        });
    }

    getStickerIndex(face, coord1, coord2) {
        // Convert cubie coordinates to sticker index (0-8)
        // Stickers are indexed: 0 1 2
        //                       3 4 5
        //                       6 7 8

        let row, col;

        switch (face) {
            case 'U':
                // x: -1,0,1 → col: 0,1,2
                // z: 1,0,-1 → row: 0,1,2
                col = coord1 + 1;
                row = 1 - coord2;
                break;
            case 'D':
                // x: -1,0,1 → col: 0,1,2
                // z: -1,0,1 → row: 0,1,2
                col = coord1 + 1;
                row = coord2 + 1;
                break;
            case 'F':
                // x: -1,0,1 → col: 0,1,2
                // y: 1,0,-1 → row: 0,1,2
                col = coord1 + 1;
                row = 1 - coord2;
                break;
            case 'B':
                // x: 1,0,-1 → col: 0,1,2
                // y: 1,0,-1 → row: 0,1,2
                col = 1 - coord1;
                row = 1 - coord2;
                break;
            case 'R':
                // z: 1,0,-1 → col: 0,1,2
                // y: 1,0,-1 → row: 0,1,2
                col = 1 - coord2;
                row = 1 - coord1;
                break;
            case 'L':
                // z: -1,0,1 → col: 0,1,2
                // y: 1,0,-1 → row: 0,1,2
                col = coord2 + 1;
                row = 1 - coord1;
                break;
            default:
                return -1;
        }

        return row * 3 + col;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        // Render main scene
        this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
        this.renderer.render(this.scene, this.camera);

        // Render orientation gizmo in corner
        this.renderOrientationGizmo();
    }

    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // ============ ORIENTATION GIZMO ============

    initOrientationGizmo() {
        // Create separate scene for the gizmo
        this.gizmoScene = new THREE.Scene();

        // Orthographic camera for consistent size
        this.gizmoCamera = new THREE.OrthographicCamera(-1.8, 1.8, 1.8, -1.8, 0.1, 100);
        this.gizmoCamera.position.set(0, 0, 5);
        this.gizmoCamera.lookAt(0, 0, 0);

        // Add lighting
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(2, 2, 3);
        this.gizmoScene.add(light);
        this.gizmoScene.add(new THREE.AmbientLight(0xffffff, 0.6));

        // Create the ViewCube group
        this.gizmoGroup = new THREE.Group();

        // Create mini cube with colored faces
        this.createViewCube();

        this.gizmoScene.add(this.gizmoGroup);
    }

    createViewCube() {
        const cubeSize = 0.9;

        // Face colors matching the Rubik's cube
        const faceColors = {
            right: 0xff3333,   // R - Red
            left: 0xff8c00,    // L - Orange
            top: 0xffffff,     // U - White
            bottom: 0xffcc00,  // D - Yellow
            front: 0x00cc44,   // F - Green
            back: 0x0066ff     // B - Blue
        };

        // Face labels
        const faceLabels = {
            right: 'R', left: 'L',
            top: 'U', bottom: 'D',
            front: 'F', back: 'B'
        };

        // Create 6 face planes instead of a box for individual coloring
        const faceGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);
        const faces = [
            { name: 'right', pos: [cubeSize / 2, 0, 0], rot: [0, Math.PI / 2, 0] },
            { name: 'left', pos: [-cubeSize / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },
            { name: 'top', pos: [0, cubeSize / 2, 0], rot: [-Math.PI / 2, 0, 0] },
            { name: 'bottom', pos: [0, -cubeSize / 2, 0], rot: [Math.PI / 2, 0, 0] },
            { name: 'front', pos: [0, 0, cubeSize / 2], rot: [0, 0, 0] },
            { name: 'back', pos: [0, 0, -cubeSize / 2], rot: [0, Math.PI, 0] }
        ];

        faces.forEach(face => {
            // Create face with texture
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Fill background color
            const color = faceColors[face.name];
            ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, 128, 128);

            // Add border
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, 124, 124);

            // Add label text
            ctx.fillStyle = face.name === 'top' ? '#333333' : '#ffffff';
            ctx.font = 'bold 72px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(faceLabels[face.name], 64, 68);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;

            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(faceGeometry, material);
            mesh.position.set(...face.pos);
            mesh.rotation.set(...face.rot);

            this.gizmoGroup.add(mesh);
        });

        // Add subtle edges for depth
        const edgesGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const edgesMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const edges = new THREE.Mesh(edgesGeometry, edgesMaterial);
        this.gizmoGroup.add(edges);
    }

    renderOrientationGizmo() {
        if (!this.gizmoScene || !this.gizmoCamera) return;

        // Sync gizmo rotation with main camera
        // Get the inverse of camera rotation so gizmo shows absolute orientation
        this.gizmoGroup.quaternion.copy(this.camera.quaternion).invert();

        // Responsive gizmo size and position
        const isMobile = this.container.clientWidth < 640;
        const size = isMobile ? 80 : this.gizmoSize; // Smaller on mobile
        const padding = isMobile ? 8 : 15;

        // Position at top-left corner (topY is distance from bottom of canvas)
        const topY = this.container.clientHeight - size - padding;

        // Save current state
        const currentAutoClear = this.renderer.autoClear;
        this.renderer.autoClear = false;

        // Set viewport and scissor for gizmo area (top-left corner)
        this.renderer.setViewport(padding, topY, size, size);
        this.renderer.setScissor(padding, topY, size, size);
        this.renderer.setScissorTest(true);

        // Clear depth buffer only (keep main scene render)
        this.renderer.clearDepth();

        // Render gizmo
        this.renderer.render(this.gizmoScene, this.gizmoCamera);

        // Reset state
        this.renderer.setScissorTest(false);
        this.renderer.autoClear = currentAutoClear;

        // Reset viewport to full size for any subsequent renders
        this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
    }
}

export default CubeRenderer;
