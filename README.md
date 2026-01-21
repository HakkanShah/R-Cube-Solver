# 🧩 Rubik's Cube Solver
<img src="images/cube.png" alt="The Cube" width="50%" height="50%">

An interactive 3D Rubik's Cube application with solving capabilities, step-by-step tutorials, and a beautiful modern UI. Built with vanilla JavaScript and Three.js.

![HTML](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg?style=for-the-badge&logo=javascript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg?style=for-the-badge&logo=three.js&logoColor=white)

[![Live Demo](https://img.shields.io/badge/🎮_Live_Demo-Click_Here-FF6B6B?style=for-the-badge)](https://hakkanshah.github.io/R-Cube-Solver/)

## ✨ Features

### 🎮 Play Mode
- **Interactive 3D Cube** - Rotate, scramble, and solve the cube in a beautiful 3D environment
- **Smooth Animations** - Fluid move animations with satisfying visual feedback
- **Keyboard Shortcuts** - Full keyboard support for moves (R, L, U, D, F, B) + Shift for counter-clockwise
- **Move History** - Track all your moves with undo/redo functionality
- **Scramble Function** - One-click cube scrambling with Space bar shortcut

### 📚 Learn Mode
- **7-Step Tutorial** - Learn the layer-by-layer method from beginner to solved cube
- **Progress Tracking** - Visual progress bar to track your learning journey
- **Step Demos** - Watch animated demonstrations for each solving phase:
  1. White Cross
  2. White Corners
  3. Second Layer
  4. Yellow Cross
  5. Yellow Edges
  6. Position Corners
  7. Orient Corners

### 🔮 Solve Mode
- **Paint Your Cube** - Click stickers on the 3D cube to input your cube state
- **Color Validation** - Real-time validation prevents impossible cube configurations
- **Smart Solver** - CFOP-based layer-by-layer solving algorithm
- **Phase Display** - Solution broken down by solving phases
- **Play/Step Solution** - Watch the solution animate automatically or step through moves

### 🎨 Design & UX
- **Modern Dark Theme** - Sleek, space-inspired visual design with starfield background
- **Responsive Layout** - Works seamlessly on desktop and mobile devices
- **Mobile Navigation** - Touch-friendly bottom navigation for mobile users
- **ViewCube Orientation** - 3D orientation indicator shows current cube perspective
- **Toast Notifications** - Visual feedback for errors, warnings, and success states
- **Sound Effects** - Optional audio feedback for moves and notifications

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools required!

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HakkanShah/R-Cube-Solver.git
   cd R-Cube-Solver
   ```

2. **Open in browser**
   Simply open `index.html` in your browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8080

   # Using Node.js
   npx serve .
   ```

3. **Start solving!** 🎉

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Right face clockwise |
| `L` | Left face clockwise |
| `U` | Up face clockwise |
| `D` | Down face clockwise |
| `F` | Front face clockwise |
| `B` | Back face clockwise |
| `Shift + Key` | Counter-clockwise move |
| `Space` | Scramble cube |
| `Ctrl + Z` | Undo move |
| `Ctrl + Y` | Redo move |

## 🏗️ Project Structure

```
Rubik's Cube Solver/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # All styling 
└── js/
    ├── main.js             # Application entry point & tab management
    ├── cube/
    │   ├── CubeState.js    # Cube state management & move logic
    │   └── CubeRenderer.js # Three.js 3D rendering & paint mode
    ├── solver/
    │   └── Solver.js       # CFOP-based solving algorithm
    ├── ui/
    │   ├── Controls.js     # UI controls & button handlers
    │   └── Tutorial.js     # Tutorial step management
    └── audio/
        └── SoundManager.js # Sound effects manager
```

## 🧠 How the Solver Works

The solver uses a **CFOP-based layer-by-layer method**:

1. **Cross** - Solve the white cross on the bottom layer
2. **F2L (First Two Layers)** - Insert corners and pair with edges
3. **OLL (Orient Last Layer)** - Orient all yellow pieces
4. **PLL (Permute Last Layer)** - Position all pieces correctly

The algorithm includes:
- State validation to ensure valid cube configurations
- Move optimization to reduce solution length
- Phase tracking for visual solution breakdown

## 🛠️ Technologies Used

- **Vanilla JavaScript (ES6+)** - No framework dependencies
- **Three.js** - 3D rendering and animations
- **CSS3** - Modern styling with CSS variables, animations, and responsive design
- **Web Audio API** - Sound effects generation
- **Google Fonts** - Space Grotesk & JetBrains Mono
- **Lucide Icons** - Beautiful open-source icons

## 📱 Mobile Support

- Touch-friendly controls and gesture support
- Fixed viewport for the 3D cube on mobile
- Bottom navigation optimized for thumb reach
- Responsive sidebar that adapts to screen size

## 🎨 Color Scheme

| Face | Color |
|------|-------|
| Up (U) | White (#FFFFFF) |
| Down (D) | Yellow (#FFDD00) |
| Front (F) | Green (#009B48) |
| Back (B) | Blue (#0051BA) |
| Right (R) | Red (#DC143C) |
| Left (L) | Orange (#FF4500) |

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
---

<p align="center">Crafted by <a href="https://hakkan.is-a.dev">Hakkan</a></p>




