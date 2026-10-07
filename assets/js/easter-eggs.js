// Small easter eggs: a note for anyone reading the console, and hover text on the profile photo.
// Called through globalThis because the terser config (drop_console) strips plain console.* calls.
globalThis.console.log(
  "%c▁▂▄▆█▆▄▂▁\n%cReading the source? We should talk.\nvzaballa@uci.edu",
  "color: #b509ac; font-size: 16px;",
  "font-weight: bold;"
);

document.addEventListener("DOMContentLoaded", () => {
  const photo = document.querySelector(".profile img");
  if (photo) photo.title = "one sample from p(Vincent | data)";
});
