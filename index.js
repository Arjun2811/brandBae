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

// ── FEATURED CREATORS ──
const coverGradients = {
    Food:      "linear-gradient(135deg, #dce8ff, #c5d0f5)",
    Fashion:   "linear-gradient(135deg, #fce4ec, #f8bbd0)",
    Fitness:   "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
    Travel:    "linear-gradient(135deg, #e0f7fa, #b2ebf2)",
    Beauty:    "linear-gradient(135deg, #fce4ec, #f3e5f5)",
    Tech:      "linear-gradient(135deg, #e8eaf6, #c5cae9)",
    Lifestyle: "linear-gradient(135deg, #fff8e1, #ffecb3)",
    Gaming:    "linear-gradient(135deg, #ede7f6, #d1c4e9)",
    Finance:   "linear-gradient(135deg, #e8f5e9, #dcedc8)",
    Comedy:    "linear-gradient(135deg, #fff3e0, #ffe0b2)",
};

const nicheColors = {
    Food:      { bg: "rgba(59,91,219,0.12)",   color: "#3B5BDB" },
    Fashion:   { bg: "rgba(180,60,100,0.12)",  color: "#b43c64" },
    Fitness:   { bg: "rgba(26,122,69,0.12)",   color: "#1a7a45" },
    Travel:    { bg: "rgba(0,131,143,0.12)",   color: "#00838f" },
    Beauty:    { bg: "rgba(173,20,87,0.12)",   color: "#ad1457" },
    Tech:      { bg: "rgba(48,63,159,0.12)",   color: "#303f9f" },
    Lifestyle: { bg: "rgba(245,127,23,0.12)",  color: "#f57f17" },
    Gaming:    { bg: "rgba(94,53,177,0.12)",   color: "#5e35b1" },
    Finance:   { bg: "rgba(46,125,50,0.12)",   color: "#2e7d32" },
    Comedy:    { bg: "rgba(230,81,0,0.12)",    color: "#e65100" },
};

function fmtNum(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(n);
}

function renderFeatured(creators) {
    const grid = document.getElementById("featuredGrid");
    if (!grid) return;

    // Pick top engagement but ensure 3 different niches
    const sorted = [...creators].sort((a, b) => b.engagement - a.engagement);
    const seen = new Set();
    const featured = [];
    for (const c of sorted) {
        if (!seen.has(c.niche)) {
            seen.add(c.niche);
            featured.push(c);
        }
        if (featured.length === 3) break;
    }

    grid.innerHTML = featured.map((c) => {
        const cover = coverGradients[c.niche] || coverGradients.Food;
        const nc    = nicheColors[c.niche]    || nicheColors.Food;

        const ratesHTML = c.barter
            ? `<div class="fc-barter">🤝 Open to brand barter &nbsp;·&nbsp; ${c.niche} brands</div>`
            : `<div class="fc-rates-row">
                <div class="fc-rate"><span>Reel</span><strong>₹${c.reelPrice.toLocaleString("en-IN")}</strong></div>
                <div class="fc-rate"><span>Story</span><strong>₹${c.storyPrice.toLocaleString("en-IN")}</strong></div>
                <div class="fc-rate"><span>Post</span><strong>₹${c.postPrice.toLocaleString("en-IN")}</strong></div>
               </div>`;

        return `
        <div class="fc">
            <div class="fc-cover" style="background:${cover}">
                <div class="fc-avatar-wrap">
                    <div class="fc-avatar"></div>
                </div>
                <span class="fc-niche" style="background:${nc.bg};color:${nc.color}">${c.niche}</span>
            </div>
            <div class="fc-body">
                <div class="fc-identity">
                    <div class="fc-handle-locked">
                        <span class="fc-lock-badge">🔒 Handle locked</span>
                    </div>
                    <div class="fc-badges">
                        ${c.verified ? '<span class="fc-badge-v">✓ Verified</span>' : ""}
                        <span class="fc-badge-city">📍 ${c.city}</span>
                    </div>
                </div>
                <div class="fc-section-label">Performance</div>
                <div class="fc-metrics">
                    <div class="fc-metric">
                        <div class="fc-mv">${fmtNum(c.followers)}</div>
                        <div class="fc-mk">Followers</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-mv" style="color:${nc.color}">${c.engagement}%</div>
                        <div class="fc-mk">Engagement</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-mv">${fmtNum(c.avgReelViews)}</div>
                        <div class="fc-mk">Reel Views</div>
                    </div>
                </div>
                <div class="fc-section-label">Audience</div>
                <div class="fc-aud">
                    <div class="fc-aud-top">
                        <span>${c.femaleP}% women</span>
                        <span>${c.maleP}% men</span>
                        <span>${c.ageRange} yrs</span>
                    </div>
                    <div class="fc-gender-bar">
                        <div class="fc-gb-f" style="width:${c.femaleP}%"></div>
                        <div class="fc-gb-m" style="width:${c.maleP}%"></div>
                    </div>
                </div>
                <div class="fc-section-label">Rates</div>
                ${ratesHTML}
                <a href="/marketplace" class="fc-unlock">🔒 Unlock Profile &nbsp;·&nbsp; <strong>₹149</strong></a>
            </div>
        </div>`;
    }).join("");

    // wire newly added cards into the scroll-reveal observer
    grid.querySelectorAll(".fc").forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.08}s`;
        el.classList.add("reveal");
        observer.observe(el);
    });
}

fetch("/api/creators")
    .then((r) => r.json())
    .then((data) => {
        renderFeatured(data);
    })
    .catch(() => {
        const grid = document.getElementById("featuredGrid");
        if (grid) grid.innerHTML = "";
    });
