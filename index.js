// ── NAV SCROLL EFFECT ──
const nav = document.getElementById("mainNav");
window.addEventListener(
    "scroll",
    () => {
        nav.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true },
);

// ── ANIMATED STAT COUNTERS ──
function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const duration = 1600;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);
        el.textContent = prefix + value + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

// ── INTERSECTION OBSERVER ──
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const el = entry.target;

            // Scroll reveal
            if (el.classList.contains("reveal")) {
                el.classList.add("visible");
            }

            // Stat counter
            if (el.classList.contains("num") && el.dataset.target) {
                animateCounter(el);
                observer.unobserve(el);
            }
        });
    },
    { threshold: 0.15 },
);

// Observe all reveal elements
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Observe all stat counters
document
    .querySelectorAll(".num[data-target]")
    .forEach((el) => observer.observe(el));
