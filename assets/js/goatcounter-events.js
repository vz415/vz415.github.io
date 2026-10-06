// Count clicks on PDFs and outbound links (arXiv, GitHub, etc.) as GoatCounter events.
// Opening a PDF never runs the page script, so the click is the only signal we get.
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href]");
  if (!link || !window.goatcounter || !window.goatcounter.count) return;

  const url = new URL(link.href, window.location.href);
  let path;
  if (url.pathname.toLowerCase().endsWith(".pdf")) {
    path = "download: " + url.pathname.split("/").pop();
  } else if (url.host !== window.location.host && url.protocol.startsWith("http")) {
    path = "outbound: " + url.host + url.pathname;
  } else {
    return;
  }

  window.goatcounter.count({
    path: path,
    title: link.textContent.trim() || path,
    event: true,
  });
});
