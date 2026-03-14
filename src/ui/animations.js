/**
 * ═══════════════════════════════════════════════════════════════
 *  EV OOPS — Scroll Animations (stripped-down, no fancy effects)
 * ═══════════════════════════════════════════════════════════════
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { updateSceneOnScroll } from './scene-3d.js';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;

// ── Lenis Smooth Scroll ──────────────────────────────────
export function initSmoothScroll() {
    lenis = new Lenis({
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    lenis.on('scroll', ({ progress }) => {
        updateSceneOnScroll(progress);
        updateScrollProgress(progress);
    });
}

// ── Scroll Progress Bar ──────────────────────────────────
function updateScrollProgress(progress) {
    const bar = document.getElementById('scroll-progress');
    if (bar) bar.style.width = `${progress * 100}%`;
}

// ── Counter Animation ────────────────────────────────────
function animateCounter(element, target, duration = 2, suffix = '') {
    const isFloat = String(target).includes('.');
    const obj = { value: 0 };
    gsap.to(obj, {
        value: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
            element.textContent = (isFloat ? obj.value.toFixed(1) : Math.round(obj.value)) + suffix;
        },
    });
}

// ── Section Reveal Animations (simple fade-in only) ──────
export function initScrollAnimations() {
    // Animations removed as per user request to improve stability and keep UI visible immediately.
}

// ── Scroll Spy Navigation ────────────────────────────────
export function initScrollSpy() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.scroll-section');

    sections.forEach(section => {
        ScrollTrigger.create({
            trigger: section,
            start: 'top center',
            end: 'bottom center',
            onEnter: () => activateNav(section.id),
            onEnterBack: () => activateNav(section.id),
        });
    });

    function activateNav(sectionId) {
        navLinks.forEach(link => {
            const isActive = link.dataset.section === sectionId;
            link.classList.toggle('active', isActive);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById(link.dataset.section);
            if (target && lenis) {
                lenis.scrollTo(target, { offset: -80 });
            }
        });
    });
}

// ── Export ────────────────────────────────────────────────
export { animateCounter };
