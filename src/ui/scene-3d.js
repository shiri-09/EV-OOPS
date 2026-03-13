/**
 * ═══════════════════════════════════════════════════════════════
 *  EV OOPS — Three.js 3D Background Scene (Scroll-Driven)
 *  Floating "EV OOPS" text with energy particles and ambient orbs
 * ═══════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

// ── Configuration ─────────────────────────────────────────
const COLORS = {
    emerald: 0x10B981,
    aquamarine: 0x2DD4BF,
    teal: 0x14B8A6,
    deepBg: 0x0A1A1A,
    amber: 0xF59E0B,
    red: 0xF43F5E,
    white: 0xE8F5F0,
};

let scene, camera, renderer, clock;
let textMesh, textWireMesh;
let energyParticles, energyPositions, energySpeeds;
let floatingOrbs = [];
let animationId = null;
let isInitialized = false;
let scrollProgress = 0;
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;

// ── Create "EV OOPS" Text ─────────────────────────────────
function createText() {
    const loader = new FontLoader();

    // Use Three.js built-in typeface font
    loader.load(
        'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json',
        (font) => {
            const textGeo = new TextGeometry('EV OOPS', {
                font: font,
                size: 3.5,
                depth: 0.8,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.05,
                bevelSize: 0.04,
                bevelOffset: 0,
                bevelSegments: 5,
            });

            textGeo.computeBoundingBox();
            const center = textGeo.boundingBox.getCenter(new THREE.Vector3());
            textGeo.translate(-center.x, -center.y, -center.z);

            // Solid text mesh — subtle, translucent
            const textMat = new THREE.MeshPhysicalMaterial({
                color: COLORS.emerald,
                metalness: 0.6,
                roughness: 0.4,
                transparent: true,
                opacity: 0.15,
                emissive: COLORS.emerald,
                emissiveIntensity: 0.15,
                side: THREE.DoubleSide,
                clearcoat: 0.3,
            });
            textMesh = new THREE.Mesh(textGeo, textMat);
            textMesh.position.set(0, 0, -8);
            scene.add(textMesh);

            // Wireframe overlay for tech look
            const wireGeo = textGeo.clone();
            const wireMat = new THREE.MeshBasicMaterial({
                color: COLORS.emerald,
                wireframe: true,
                transparent: true,
                opacity: 0.08,
            });
            textWireMesh = new THREE.Mesh(wireGeo, wireMat);
            textWireMesh.position.copy(textMesh.position);
            scene.add(textWireMesh);
        },
        undefined,
        (err) => {
            console.warn('Font load failed, creating fallback plane text');
            createFallbackText();
        }
    );
}

// Fallback if font doesn't load
function createFallbackText() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.font = 'bold 140px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fillText('EV OOPS', 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(20, 5);
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    textMesh = new THREE.Mesh(geo, mat);
    textMesh.position.set(0, 0, -8);
    scene.add(textMesh);
}

// ── Energy Particles ──────────────────────────────────────
function createEnergyParticles() {
    const count = 250;
    const geo = new THREE.BufferGeometry();
    energyPositions = new Float32Array(count * 3);
    energySpeeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const emerald = new THREE.Color(COLORS.emerald);
    const aqua = new THREE.Color(COLORS.aquamarine);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // Spread across the viewport
        energyPositions[i3] = (Math.random() - 0.5) * 40;
        energyPositions[i3 + 1] = (Math.random() - 0.5) * 20;
        energyPositions[i3 + 2] = (Math.random() - 0.5) * 20 - 5;
        energySpeeds[i] = 0.2 + Math.random() * 0.8;

        const c = emerald.clone().lerp(aqua, Math.random());
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(energyPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(16,185,129,1)');
    grad.addColorStop(0.5, 'rgba(16,185,129,0.4)');
    grad.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
        size: 0.2,
        map: texture,
        transparent: true,
        opacity: 0.5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    energyParticles = new THREE.Points(geo, mat);
    scene.add(energyParticles);
}

// ── Floating Accent Orbs ──────────────────────────────────
function createFloatingOrbs() {
    const orbData = [
        { x: -10, y: 5, z: -10, color: COLORS.emerald, size: 0.5 },
        { x: 14, y: -4, z: -12, color: COLORS.aquamarine, size: 0.4 },
        { x: -6, y: -5, z: -4, color: COLORS.teal, size: 0.35 },
        { x: 12, y: 6, z: -14, color: COLORS.emerald, size: 0.3 },
        { x: -14, y: 2, z: -8, color: COLORS.aquamarine, size: 0.25 },
        { x: 8, y: -7, z: -6, color: COLORS.teal, size: 0.3 },
        { x: -3, y: 8, z: -15, color: COLORS.emerald, size: 0.2 },
    ];

    orbData.forEach(d => {
        const geo = new THREE.SphereGeometry(d.size, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: d.color,
            transparent: true,
            opacity: 0.15,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(d.x, d.y, d.z);
        mesh.userData = { oy: d.y, speed: 0.3 + Math.random() * 0.5 };
        scene.add(mesh);
        floatingOrbs.push(mesh);
    });
}

// ── Initialize ────────────────────────────────────────────
export function initScene(canvasId = 'bg-canvas') {
    if (isInitialized) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0A1A1A, 0); // Transparent
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 8, 8);
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(COLORS.emerald, 1.5, 30);
    pointLight1.position.set(-5, 3, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(COLORS.aquamarine, 1, 25);
    pointLight2.position.set(8, -2, 3);
    scene.add(pointLight2);

    // Create objects
    createText();
    createEnergyParticles();
    createFloatingOrbs();

    // Clock
    clock = new THREE.Clock();

    // Events
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);

    isInitialized = true;
    animate();
}

// ── Animation Loop ────────────────────────────────────────
function animate() {
    animationId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Smooth mouse follow
    mouseX += (targetMouseX - mouseX) * 0.03;
    mouseY += (targetMouseY - mouseY) * 0.03;

    // Animate text mesh
    if (textMesh) {
        textMesh.rotation.y = Math.sin(elapsed * 0.15) * 0.05 + mouseX * 0.08;
        textMesh.rotation.x = Math.sin(elapsed * 0.2) * 0.03 + mouseY * 0.04;
        textMesh.position.y = Math.sin(elapsed * 0.3) * 0.3;

        // Subtle opacity pulse
        if (textMesh.material.emissive) {
            textMesh.material.emissiveIntensity = 0.12 + Math.sin(elapsed * 1.5) * 0.05;
        }
    }

    // Keep wireframe in sync
    if (textWireMesh && textMesh) {
        textWireMesh.rotation.copy(textMesh.rotation);
        textWireMesh.position.copy(textMesh.position);
    }

    // Animate energy particles
    if (energyParticles) {
        const pos = energyParticles.geometry.attributes.position.array;
        for (let i = 0; i < pos.length / 3; i++) {
            const i3 = i * 3;
            pos[i3 + 1] += Math.sin(elapsed * energySpeeds[i] + i) * 0.005;
            const angle = elapsed * energySpeeds[i] * 0.15 + i;
            pos[i3] += Math.cos(angle) * 0.003;
            pos[i3 + 2] += Math.sin(angle) * 0.003;
        }
        energyParticles.geometry.attributes.position.needsUpdate = true;
        energyParticles.rotation.y = elapsed * 0.015;
        energyParticles.material.opacity = 0.35 + scrollProgress * 0.2;
    }

    // Floating orbs
    floatingOrbs.forEach(orb => {
        orb.position.y = orb.userData.oy + Math.sin(elapsed * orb.userData.speed) * 1.2;
        orb.scale.setScalar(1 + Math.sin(elapsed * 0.5 + orb.userData.speed) * 0.1);
    });

    // Camera — subtle parallax
    camera.position.x = mouseX * 1.0;
    camera.position.y = mouseY * 0.6;
    camera.position.z = 20 - scrollProgress * 2;
    camera.lookAt(0, 0, -5);

    renderer.render(scene, camera);
}

// ── Event Handlers ────────────────────────────────────────
function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
}

// ── Scroll-linked (called from animations.js) ─────────────
export function updateSceneOnScroll(progress) {
    scrollProgress = progress;
}

// ── Cleanup ───────────────────────────────────────────────
export function destroyScene() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('mousemove', onMouseMove);
    if (renderer) renderer.dispose();
    isInitialized = false;
}
