// Small easter eggs: a note for anyone reading the console, and hover text on the profile photo.
console.log(
  "%c▁▂▄▆█▆▄▂▁\n%cReading the source? We should talk.\nhttps://www.linkedin.com/in/vincentzaballa",
  "color: #b509ac; font-size: 16px;",
  "font-weight: bold;"
);

document.addEventListener("DOMContentLoaded", () => {
  const photo = document.querySelector(".profile img");
  if (photo) photo.title = "one sample from p(Vincent | data)";
});
