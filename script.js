// ============================================================
// Guests are defined in /guests.json (plain `id → name` map).
// Invite link:  https://your-site/?g=ID
//
// Only guests whose id is in guests.json see the RSVP buttons.
//
// Backend:  Google Apps Script bound to a Google Sheet (see
//           backend.gs). Paste the deployed /exec URL below.
// ============================================================

const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbwIYJNTQgkiaohunv2CyANHW4CJOembLhj-jBfe80Yut9PeA6q-jvL2WsFL0v-IAqAaOw/exec"

// ------------------------------------------------------------

const params    = new URLSearchParams(location.search);
const token     = (params.get("g") || params.get("guest") || "").trim();
let   guestName = null;

(async function loadGuest() {
  if (!token) return;
  try {
    const res = await fetch("guests.json", { cache: "no-cache" });
    if (!res.ok) return;
    const guests = await res.json();
    guestName = guests[token] || null;
    if (guestName) {
      document.querySelectorAll("[data-vip]").forEach(el => el.classList.add("show"));
    }
  } catch (e) {
    console.warn("guests.json load failed:", e);
  }
})();

// ---------- Splash ----------
const splash = document.getElementById("splash");
const hideSplash = () => splash.classList.add("hide");
window.addEventListener("load", () => setTimeout(hideSplash, 2200));
splash.addEventListener("click", hideSplash);

// ---------- Scroll behaviour ----------
// Mandatory scroll-snap cleanly snaps screen 1 → top of screen 2, but if we
// leave it on while the user is reading screen 2 it keeps yanking them back
// to its top. So: snap is active while they're on screen 1, released once
// they've reached screen 2, and restored if they scroll back up.
const scroller = document.getElementById("scroller");
const hint     = document.getElementById("scrollHint");

let snapReleased = false;
const updateSnap = () => {
  const vh = scroller.clientHeight;
  const atScreen2 = scroller.scrollTop >= vh - 4;
  if (atScreen2 && !snapReleased) {
    scroller.style.scrollSnapType = "none";
    snapReleased = true;
  } else if (!atScreen2 && snapReleased) {
    scroller.style.scrollSnapType = "";
    snapReleased = false;
  }
};

scroller.addEventListener("scroll", () => {
  if (hint) hint.style.opacity = scroller.scrollTop > 80 ? "0" : "";
  updateSnap();
}, { passive: true });

// ---------- RSVP ----------
const status      = document.getElementById("rsvp-status");
const rsvpButtons = document.querySelectorAll("[data-rsvp]");

rsvpButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const answer = btn.dataset.rsvp;
    rsvpButtons.forEach(b => b.disabled = true);
    status.className   = "rsvp-status";
    status.textContent = "Надсилаємо...";

    const payload = {
      guest:     guestName || "Гість",
      token:     token     || "—",
      answer,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    try {
      if (RSVP_ENDPOINT) {
        // text/plain avoids a CORS preflight that Apps Script can't handle.
        const res = await fetch(RSVP_ENDPOINT, {
          method:   "POST",
          headers:  { "Content-Type": "text/plain;charset=utf-8" },
          body:     JSON.stringify(payload),
          redirect: "follow",
        });
        if (!res.ok) throw new Error("network");
      } else {
        console.log("[RSVP] (no endpoint configured)", payload);
        await new Promise(r => setTimeout(r, 600));
      }
      status.classList.add("success");
      status.textContent = answer === "yes"
        ? "Дякуємо! Чекаємо на вас 🤍"
        : "Дякуємо, що повідомили 🤍";
    } catch (e) {
      rsvpButtons.forEach(b => b.disabled = false);
      status.classList.add("error");
      status.textContent = "Не вдалося надіслати. Спробуйте ще раз.";
    }
  });
});
