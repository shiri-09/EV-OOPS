/**
 * ═══════════════════════════════════════════════════════════════
 *  EV OOPS — Minimal 3D Background Scene (no floating orbs/particles)
 *  Only the "EV OOPS" text, no distracting animations
 * ═══════════════════════════════════════════════════════════════
 */

import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

const COLORS = {
    emerald: 0x10B981,
    aquamarine: 0x2DD4BF,
};

let scene, camera, renderer;
let textMesh;
let animationId = null;
let isInitialized = false;
let scrollProgress = 0;

// ── Create "EV OOPS" Text ─────────────────────────────────
function createText() {
    const loader = new FontLoader();

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
        },
        undefined,
        () => {
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
    ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.fillText('EV OOPS', 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(20, 5);
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    textMesh = new THREE.Mesh(geo, mat);
    textMesh.position.set(0, 0, -8);
    scene.add(textMesh);
}

// ── Initialize ────────────────────────────────────────────
export function initScene(canvasId = 'bg-canvas') {
    if (isInitialized) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 20);

    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0A1A1A, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 8, 8);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(COLORS.emerald, 1.5, 30);
    pointLight.position.set(-5, 3, 5);
    scene.add(pointLight);

    // Only the text — no particles, no orbs
    createText();

    window.addEventListener('resize', onResize);

    isInitialized = true;
    animate();
}

// ── Animation Loop (very simple) ──────────────────────────
function animate() {
    animationId = requestAnimationFrame(animate);

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

// ── Scroll-linked (called from animations.js) ─────────────
export function updateSceneOnScroll(progress) {
    scrollProgress = progress;
}

// ── Cleanup ───────────────────────────────────────────────
export function destroyScene() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    if (renderer) renderer.dispose();
    isInitialized = false;
}
