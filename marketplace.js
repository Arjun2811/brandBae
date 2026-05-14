const nicheConfig = {
    Food: { bg: "#dcfce7", text: "#166534", gradient: ["#84fab0", "#8fd3f4"] },
    Fashion: {
        bg: "#fce7f3",
        text: "#9d174d",
        gradient: ["#f093fb", "#f5576c"],
    },
    Fitness: {
        bg: "#ffedd5",
        text: "#9a3412",
        gradient: ["#f6d365", "#fda085"],
    },
    Travel: {
        bg: "#dbeafe",
        text: "#1e40af",
        gradient: ["#4facfe", "#00f2fe"],
    },
    Beauty: {
        bg: "#ede9fe",
        text: "#6d28d9",
        gradient: ["#a18cd1", "#fbc2eb"],
    },
    Tech: { bg: "#cffafe", text: "#155e75", gradient: ["#43e97b", "#38f9d7"] },
    Lifestyle: {
        bg: "#fee2e2",
        text: "#991b1b",
        gradient: ["#ffecd2", "#fcb69f"],
    },
    Gaming: {
        bg: "#f3e8ff",
        text: "#6b21a8",
        gradient: ["#6a11cb", "#2575fc"],
    },
    Finance: {
        bg: "#d1fae5",
        text: "#065f46",
        gradient: ["#11998e", "#38ef7d"],
    },
    Comedy: {
        bg: "#fef9c3",
        text: "#854d0e",
        gradient: ["#f7971e", "#ffd200"],
    },
};

let creators = [];

let activeNiche = "All";

function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return n.toString();
}
function inr(n) {
    return "₹" + n.toLocaleString("en-IN");
}
function engClass(r) {
    return r >= 5 ? "good" : r >= 3 ? "ok" : "";
}

function renderCreators(data) {
    const grid = document.getElementById("creatorsGrid");
    const count = document.getElementById("resultsCount");
    count.innerHTML = `Showing <strong>${data.length} creator${data.length !== 1 ? "s" : ""}</strong> <span>· India</span>`;

    if (!data.length) {
        grid.innerHTML = `<div class="empty-state"><div class="ei">🔍</div><h3>No creators found</h3><p>Try adjusting your filters.</p></div>`;
        return;
    }

    const coverGradients = {
        Food: "linear-gradient(135deg, #dce8ff, #c5d0f5)",
        Fashion: "linear-gradient(135deg, #fce4ec, #f8bbd0)",
        Fitness: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
        Travel: "linear-gradient(135deg, #e0f7fa, #b2ebf2)",
        Beauty: "linear-gradient(135deg, #fce4ec, #f3e5f5)",
        Tech: "linear-gradient(135deg, #e8eaf6, #c5cae9)",
        Lifestyle: "linear-gradient(135deg, #fff8e1, #ffecb3)",
        Gaming: "linear-gradient(135deg, #ede7f6, #d1c4e9)",
        Finance: "linear-gradient(135deg, #e8f5e9, #dcedc8)",
        Comedy: "linear-gradient(135deg, #fff3e0, #ffe0b2)",
    };

    const nicheColors = {
        Food: { bg: "rgba(59,91,219,0.12)", color: "#3B5BDB" },
        Fashion: { bg: "rgba(180,60,100,0.12)", color: "#b43c64" },
        Fitness: { bg: "rgba(26,122,69,0.12)", color: "#1a7a45" },
        Travel: { bg: "rgba(0,131,143,0.12)", color: "#00838f" },
        Beauty: { bg: "rgba(173,20,87,0.12)", color: "#ad1457" },
        Tech: { bg: "rgba(48,63,159,0.12)", color: "#303f9f" },
        Lifestyle: { bg: "rgba(245,127,23,0.12)", color: "#f57f17" },
        Gaming: { bg: "rgba(94,53,177,0.12)", color: "#5e35b1" },
        Finance: { bg: "rgba(46,125,50,0.12)", color: "#2e7d32" },
        Comedy: { bg: "rgba(230,81,0,0.12)", color: "#e65100" },
    };

    grid.innerHTML = data
        .map((c) => {
            const cfg = nicheConfig[c.niche] || {
                gradient: ["#e5e7eb", "#d1d5db"],
            };
            const cover = coverGradients[c.niche] || coverGradients.Food;
            const nColor = nicheColors[c.niche] || nicheColors.Food;
            const avatarBg = `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})`;
            const ec = engClass(c.engagement);

            const pricingHTML = c.barter
                ? `<div class="barter-note">
                    <div class="barter-note-top">
                        <span>🤝 Open to barter</span>
                        <span style="font-weight:700">${c.niche} brands</span>
                    </div>
                    <div class="barter-note-body">
                        ${c.barterNote || `Reach out after unlocking to discuss collaboration terms.`}
                    </div>
               </div>`
                : `<div class="pricing-wrap">
                    <div class="price-row">
                        <span>🎬 Reel</span>
                        <strong>${inr(c.reelPrice)}</strong>
                    </div>
                    <div class="price-row">
                        <span>📸 Story</span>
                        <strong>${inr(c.storyPrice)}</strong>
                    </div>
                    <div class="price-row">
                        <span>🖼️ Static Post</span>
                        <strong>${inr(c.postPrice)}</strong>
                    </div>
               </div>`;

            return `
        <div class="creator-card">

            <div class="card-cover" style="background:${cover}">
                <div class="card-avatar" style="background:${avatarBg}"></div>
                <span class="cover-niche" style="background:${nColor.bg};color:${nColor.color};border:1px solid ${nColor.color}33">
                    ${c.niche}
                </span>
            </div>

            <div class="card-body">

                <div class="sec-label">Performance</div>
                <div class="perf-grid">
                    <div class="perf-cell">
                        <div class="pv">${fmt(c.followers)}</div>
                        <div class="pk">Followers</div>
                    </div>
                    <div class="perf-cell">
                        <div class="pv ${ec}">${c.engagement}%</div>
                        <div class="pk">Engagement Rate</div>
                    </div>
                    <div class="perf-cell">
                        <div class="pv">${c.avgLikes.toLocaleString("en-IN")}</div>
                        <div class="pk">Avg Likes</div>
                    </div>
                    <div class="perf-cell">
                        <div class="pv">${c.avgComments}</div>
                        <div class="pk">Avg Comments</div>
                    </div>
                    <div class="perf-cell full">
                        <div class="pv">${fmt(c.avgReelViews)}</div>
                        <div class="pk">Avg Reel Views</div>
                    </div>
                </div>

                <div class="card-audience">
                    <div class="sec-label">Audience</div>
                    <div class="audience-wrap">
                        <div class="age-gender-row">
                            <div class="age-block">
                                <div class="aud-val">${c.ageRange} yrs</div>
                                <div class="aud-key">Age Range</div>
                            </div>
                            <div class="gender-block">
                                <div class="gender-bar-wrap">
                                    <div class="gb-f" style="width:${c.femaleP}%"></div>
                                    <div class="gb-m" style="width:${c.maleP}%"></div>
                                </div>
                                <div class="gender-labels">
                                    <span class="gl-f">♀ ${c.femaleP}% Female</span>
                                    <span class="gl-m">♂ ${c.maleP}% Male</span>
                                </div>
                            </div>
                        </div>
                        <div class="locations-row">
                            ${c.locations.map((l) => `<span class="loc-pill">📍 ${l}</span>`).join("")}
                        </div>
                    </div>
                </div>

                <div class="sec-label">Pricing</div>
                ${pricingHTML}

            </div>

            <button class="unlock-btn" onclick="openModal(${c.id})">
                🔒 Unlock for ₹149
            </button>

        </div>`;
        })
        .join("");
}

function setNiche(btn) {
    document.querySelectorAll(".niche-chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    activeNiche = btn.dataset.niche;
    applyFilters();
}

function applyFilters() {
    const fol = document.getElementById("followersFilter").value;
    const sort = document.getElementById("sortFilter").value;
    const barter = document.getElementById("barterFilter").value;
    const q = document.getElementById("searchInput").value.toLowerCase().trim();

    let filtered = creators.filter((c) => {
        if (activeNiche !== "All" && c.niche !== activeNiche) return false;
        if (fol !== "all") {
            const [min, max] = fol.split("-").map(Number);
            if (c.followers < min || c.followers > max) return false;
        }
        if (barter === "barter" && !c.barter) return false;
        if (barter === "paid" && c.barter) return false;
        if (q && !`${c.niche} ${c.city}`.toLowerCase().includes(q))
            return false;
        return true;
    });

    if (sort === "engagement")
        filtered.sort((a, b) => b.engagement - a.engagement);
    else if (sort === "views")
        filtered.sort((a, b) => b.avgReelViews - a.avgReelViews);
    else if (sort === "price-low")
        filtered.sort((a, b) => a.reelPrice - b.reelPrice);
    else if (sort === "followers-high")
        filtered.sort((a, b) => b.followers - a.followers);

    renderCreators(filtered);
}

function openModal(id) {
    document.getElementById("modalStep1").style.display = "block";
    document.getElementById("modalBeta").style.display = "none";
    document.getElementById("inputName").value = "";
    document.getElementById("inputPhone").value = "";
    document.getElementById("inputCity").value = "";
    ["inputName", "inputCity"].forEach((id) =>
        document.getElementById(id).classList.remove("error"),
    );
    document.getElementById("phoneWrap").classList.remove("error");
    document.getElementById("modalOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("inputName").focus(), 100);
}

function handleStep1() {
    const name = document.getElementById("inputName").value.trim();
    const phone = document.getElementById("inputPhone").value.trim();
    const city = document.getElementById("inputCity").value.trim();
    let valid = true;

    if (!name) {
        document.getElementById("inputName").classList.add("error");
        valid = false;
    } else document.getElementById("inputName").classList.remove("error");

    if (!phone || phone.length < 10) {
        document.getElementById("phoneWrap").classList.add("error");
        valid = false;
    } else document.getElementById("phoneWrap").classList.remove("error");

    if (!city) {
        document.getElementById("inputCity").classList.add("error");
        valid = false;
    } else document.getElementById("inputCity").classList.remove("error");

    if (!valid) return;

    // Show beta screen immediately, then save in background
    document.getElementById("confirmedName").textContent = name.split(" ")[0];
    document.getElementById("confirmedPhone").textContent = "+91 " + phone;
    document.getElementById("confirmedCity").textContent = city;

    document.getElementById("modalStep1").style.display = "none";
    document.getElementById("modalBeta").style.display = "block";

    // Save lead to database
    fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, city }),
    }).catch((err) => console.error("Lead save failed:", err));
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    document.body.style.overflow = "";
}

function handleOverlayClick(e) {
    if (e.target === document.getElementById("modalOverlay")) closeModal();
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

fetch("/api/creators")
    .then((r) => r.json())
    .then((data) => {
        creators = data;

        const preNiche = new URLSearchParams(window.location.search).get("niche");
        if (preNiche) {
            const btn = document.querySelector(`.niche-chip[data-niche="${preNiche}"]`);
            if (btn) setNiche(btn);
        } else {
            renderCreators(creators);
        }
    })
    .catch((err) => console.error("Failed to load creators:", err));
