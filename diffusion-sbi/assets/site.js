// Math rendering
document.addEventListener("DOMContentLoaded", () => {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
    });
  }
  initScheduleWidget();
  initCopy();
  initNavHighlight();
  initHeroVideo();
});

// Schedule widget: an interactive version of panel (a) in the paper's Gaussian
// figure. It uses the schedule from that experiment, beta(t) = 0.05 + 19.95 t
// and alpha(t) = exp(-0.05 t - 9.975 t^2), and plots
//   g_n(t)^2 = beta(t) (1 + (n-1)(1-alpha)^2) / (1 + (n-1)(1-alpha))^2
// against reverse progress 1 - t.
function initScheduleWidget() {
  const svg = document.getElementById("gn-chart");
  const slider = document.getElementById("n-slider");
  const out = document.getElementById("n-out");
  const note = document.getElementById("gn-note");
  if (!svg || !slider) return;

  const N_MAX = 1000;
  const W = 720, H = 360, m = { l: 66, r: 22, t: 18, b: 50 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const LOG_MIN = -3, LOG_MAX = 1.5;
  const X = (p) => m.l + p * pw;
  const Y = (v) => m.t + ((LOG_MAX - Math.log10(v)) / (LOG_MAX - LOG_MIN)) * ph;
  const beta = (t) => 0.05 + 19.95 * t;
  const alpha = (t) => Math.exp(-0.05 * t - 9.975 * t * t);
  const g2 = (t, n) => {
    const x = 1 - alpha(t);
    return (beta(t) * (1 + (n - 1) * x * x)) / Math.pow(1 + (n - 1) * x, 2);
  };
  const sliderToN = (v) => Math.round(Math.exp((v / 1000) * Math.log(N_MAX)));
  const nToSlider = (n) => Math.round((Math.log(n) / Math.log(N_MAX)) * 1000);
  const fmt = (v) => (v >= 1 ? v.toFixed(1) : v.toPrecision(2));

  const el = (name, attrs, text) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    svg.appendChild(e);
    return e;
  };

  [[10, "10"], [1, "1"], [0.1, "0.1"], [0.01, "0.01"], [0.001, "0.001"]].forEach(([v, s]) => {
    el("line", { class: "grid", x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v) });
    el("text", { class: "tick", x: m.l - 10, y: Y(v) + 4, "text-anchor": "end" }, s);
  });
  [0, 0.2, 0.4, 0.6, 0.8, 1].forEach((v) => {
    el("line", { class: "axis", x1: X(v), x2: X(v), y1: m.t + ph, y2: m.t + ph + 5 });
    el("text", { class: "tick", x: X(v), y: m.t + ph + 20, "text-anchor": "middle" }, v.toFixed(1));
  });
  el("line", { class: "axis", x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph });
  el("line", { class: "axis", x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph });
  el("text", { class: "label", x: m.l + pw / 2, y: H - 8, "text-anchor": "middle" }, "Reverse progress (noise → posterior)");
  el("text", { class: "label", transform: `translate(16 ${m.t + ph / 2}) rotate(-90)`, "text-anchor": "middle" }, "Diffusion variance rate");

  // Sample densely near the end of sampling, where the curves bend sharply.
  const ts = [];
  for (let i = 0; i <= 400; i++) ts.push(Math.pow(i / 400, 2));
  const path = (f) => ts.map((t, i) => (i ? "L" : "M") + X(1 - t).toFixed(1) + " " + Y(f(t)).toFixed(1)).join("");

  el("path", { class: "vp", d: path(beta) });
  el("text", { class: "t-vp", x: X(0.03), y: Y(beta(0.97)) - 9 }, "β(t), any n");
  const curve = el("path", { class: "curve" });
  const curveText = el("text", { class: "t-curve", x: X(0.03) });

  function draw(n) {
    curve.setAttribute("d", path((t) => g2(t, n)));
    curve.style.display = n === 1 ? "none" : "";
    curveText.style.display = n === 1 ? "none" : "";
    curveText.setAttribute("y", Y(g2(0.97, n)) + 20);
    curveText.textContent = `gₙ(t)², n = ${n}`;
    out.textContent = n;
    note.textContent =
      n === 1
        ? "With one observation the derived rate is exactly the ordinary VP rate β(t)."
        : `At the start of sampling the derived rate is ${fmt(g2(1, n))}, against ${fmt(beta(1))} for the ordinary VP rate, a factor of ${n}. The two meet again as sampling reaches the posterior. The schedule is the one used in the Gaussian benchmark below.`;
  }

  slider.addEventListener("input", () => draw(sliderToN(+slider.value)));
  document.querySelectorAll("#gn-widget .presets button").forEach((b) =>
    b.addEventListener("click", () => {
      const n = +b.dataset.n;
      slider.value = nToSlider(n);
      draw(n);
    })
  );
  slider.value = nToSlider(32);
  draw(32);
}

function initCopy() {
  const btn = document.getElementById("copy-bib");
  const bib = document.getElementById("bib");
  if (!btn || !bib) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bib.textContent);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Select the text and copy";
    }
    setTimeout(() => (btn.textContent = "Copy BibTeX"), 1800);
  });
}

function initNavHighlight() {
  const links = [...document.querySelectorAll(".sitenav li a")];
  const byId = Object.fromEntries(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.removeAttribute("aria-current"));
        byId[e.target.id]?.setAttribute("aria-current", "true");
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  document.querySelectorAll("main > section").forEach((s) => io.observe(s));
}

// The summary film autoplays silently; leave it paused for reduced-motion users.
function initHeroVideo() {
  const video = document.querySelector(".hero-video video");
  if (!video || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  video.removeAttribute("autoplay");
  video.pause();
}
