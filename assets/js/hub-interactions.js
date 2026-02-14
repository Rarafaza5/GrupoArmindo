/**
 * HUB INTERACTIONS - Premium Interactive Elements
 * © 2026 Grupo Armindo
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initSmartNavbar();
    initSpotlightEffect();
    initMagneticButtons();
});

/* 1. SCROLL REVEAL ANIMATION */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach(element => revealObserver.observe(element));
}

/* 2. SMART NAVBAR */
function initSmartNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Add blurred background when scrolled
        if (currentScrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide/Show logic (optional, keeping it simple for now as requested)
        // if (currentScrollY > lastScrollY && currentScrollY > 500) {
        //     navbar.classList.add('hidden');
        // } else {
        //     navbar.classList.remove('hidden');
        // }

        lastScrollY = currentScrollY;
    });

    // Mobile Menu Toggle
    const toggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links'); // Desktop links

    // Note: The existing HTML structure might need a separate mobile menu container
    // For now, let's assume we might need to toggle something. 
    // This part depends on if we add a dedicated mobile menu in HTML.
}

/* 3. SPOTLIGHT EFFECT (Bento Cards) */
function initSpotlightEffect() {
    const cards = document.querySelectorAll('.bento-card, .nb-btn-glass');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

/* 4. MAGNETIC BUTTONS (Optional refinement) */
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-magnetic');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}
