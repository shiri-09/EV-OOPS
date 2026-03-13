/**
 * ═══════════════════════════════════════════════════════════════
 *  EV OOPS — Premium GSAP Animation System + Lenis Smooth Scroll
 *  Skills: scroll-experience, antigravity-design-expert, design-spells
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

    // Scroll progress for 3D scene + progress bar
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

// ── Counter Animation (spring feel) ──────────────────────
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

// ── Text Split Animation Utility ─────────────────────────
function splitTextIntoChars(element) {
    const text = element.textContent;
    element.innerHTML = '';
    element.setAttribute('aria-label', text);

    const chars = [];
    for (const char of text) {
        const span = document.createElement('span');
        span.classList.add('split-char');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.display = 'inline-block';
        span.style.willChange = 'transform, opacity';
        element.appendChild(span);
        chars.push(span);
    }
    return chars;
}

// ── Magnetic Hover Effect (Design Spells) ────────────────
function initMagneticHover() {
    const magneticEls = document.querySelectorAll('.hero-cta, .primary-btn');

    magneticEls.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(el, {
                x: x * 0.25,
                y: y * 0.25,
                duration: 0.4,
                ease: 'power2.out',
            });
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(el, {
                x: 0, y: 0,
                duration: 0.6,
                ease: 'elastic.out(1, 0.3)',
            });
        });
    });
}

// ── 3D Card Tilt (Antigravity Design) ────────────────────
function init3DCardTilt() {
    const cards = document.querySelectorAll('.glass-card, .kpi-card, .scenario-card');

    cards.forEach(card => {
        card.style.willChange = 'transform';

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(card, {
                rotateX: -y * 8,
                rotateY: x * 8,
                transformPerspective: 800,
                duration: 0.4,
                ease: 'power2.out',
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                rotateX: 0, rotateY: 0,
                duration: 0.6,
                ease: 'power2.out',
            });
        });
    });
}

// ── Section Reveal Animations ────────────────────────────
export function initScrollAnimations() {
    // ── Hero Section — Cinematic Entrance ──────────────
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const chars = splitTextIntoChars(heroTitle);
        gsap.from(chars, {
            opacity: 0,
            y: 80,
            rotateX: -90,
            stagger: 0.03,
            duration: 1,
            ease: 'back.out(1.7)',
            delay: 0.3,
        });
    }

    gsap.from('.hero-subtitle', {
        opacity: 0, y: 60,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.6,
    });

    gsap.from('.hero-tagline', {
        opacity: 0, y: 40,
        duration: 1,
        ease: 'power3.out',
        delay: 0.9,
    });

    gsap.from('.hero-cta', {
        opacity: 0, scale: 0.6, y: 30,
        duration: 0.8,
        ease: 'back.out(2)',
        delay: 1.2,
    });

    // ── Floating Nav ───────────────────────────────────
    gsap.from('#floating-nav', {
        opacity: 0, y: -40,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.4,
    });

    // ── Section Headers — Slide + Fade ────────────────
    gsap.utils.toArray('.section-header').forEach(header => {
        const h2 = header.querySelector('h2');
        const p = header.querySelector('p');
        const divider = header.querySelector('.section-divider');

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: header,
                start: 'top 88%',
                once: true,
            },
        });

        if (h2) {
            tl.from(h2, {
                opacity: 0, y: 60, scale: 0.95,
                duration: 0.8,
                ease: 'power3.out',
            });
        }
        if (p) {
            tl.from(p, {
                opacity: 0, y: 30,
                duration: 0.6,
                ease: 'power2.out',
            }, '-=0.4');
        }
        if (divider) {
            tl.from(divider, {
                scaleX: 0,
                duration: 0.8,
                ease: 'power2.inOut',
            }, '-=0.3');
        }
    });

    // ── KPI Cards — Staggered 3D Entrance ────────────
    const kpiCards = gsap.utils.toArray('.kpi-card');
    if (kpiCards.length) {
        gsap.from(kpiCards, {
            scrollTrigger: {
                trigger: '.kpi-grid',
                start: 'top 85%',
                toggleActions: 'play none none reverse',
            },
            opacity: 0,
            y: 80,
            scale: 0.85,
            rotateX: -15,
            transformPerspective: 600,
            stagger: {
                amount: 0.5,
                from: 'start',
            },
            duration: 0.8,
            ease: 'power3.out',
        });
    }

    // ── Glass Cards — Fade + Float ────────────────────
    gsap.utils.toArray('.glass-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 95%',
                once: true,
            },
            opacity: 0,
            y: 50,
            duration: 0.7,
            delay: (i % 3) * 0.1,
            ease: 'power2.out',
        });
    });

    // ── Scenario Cards — Slide from left with rotation ──
    gsap.utils.toArray('.scenario-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 90%',
                toggleActions: 'play none none reverse',
            },
            opacity: 0,
            x: -60,
            rotateY: 15,
            transformPerspective: 800,
            duration: 0.7,
            delay: i * 0.08,
            ease: 'power3.out',
        });
    });

    // ── Chart Containers — Subtle scale-in ────────────
    gsap.utils.toArray('.chart-container').forEach(chart => {
        gsap.set(chart, { opacity: 1, y: 0, scale: 1 });
        gsap.from(chart, {
            scrollTrigger: {
                trigger: chart,
                start: 'top 98%',
                once: true,
            },
            opacity: 0.3, y: 25, scale: 0.98,
            duration: 0.7,
            ease: 'power2.out',
        });
    });

    // ── Data Table Rows — Cascade ─────────────────────
    gsap.utils.toArray('.data-table tbody tr').forEach((row, i) => {
        gsap.from(row, {
            scrollTrigger: {
                trigger: row,
                start: 'top 95%',
                toggleActions: 'play none none reverse',
            },
            opacity: 0, x: -25,
            duration: 0.4,
            delay: i * 0.04,
            ease: 'power2.out',
        });
    });

    // ── Monitor KPIs — Pop in ─────────────────────────
    gsap.utils.toArray('.monitor-kpi').forEach((kpi, i) => {
        gsap.from(kpi, {
            scrollTrigger: {
                trigger: kpi,
                start: 'top 90%',
                once: true,
            },
            opacity: 0, y: 40, scale: 0.9,
            duration: 0.6,
            delay: i * 0.1,
            ease: 'back.out(1.5)',
        });
    });

    // ── Parallax elements ─────────────────────────────
    gsap.utils.toArray('.parallax-slow').forEach(el => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5,
            },
            y: -60,
            ease: 'none',
        });
    });

    // ── Init micro-interactions ───────────────────────
    initMagneticHover();
    init3DCardTilt();

    // ── Accessibility: Respect reduced motion ────────
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.globalTimeline.timeScale(0);
        ScrollTrigger.getAll().forEach(st => st.kill());
    }
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

    // Click to scroll
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
