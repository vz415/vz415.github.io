---
layout: page
permalink: /publications/
title: publications
description:
nav: true
nav_order: 2
_styles: |
  .pub-view-toggle { margin-bottom: 1rem; }
  .pub-view-toggle button {
    background: none;
    border: none;
    padding: 0;
    margin-right: 1rem;
    color: var(--global-text-color-light);
    cursor: pointer;
  }
  .pub-view-toggle button.active {
    color: var(--global-theme-color);
    font-weight: 500;
  }
  .pub-view[hidden] { display: none; }
---

<!-- _pages/publications.md -->

<div class="pub-view-toggle">
  <button type="button" class="active" data-view="year">By year</button>
  <button type="button" data-view="topic">By topic</button>
</div>

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="publications">

<div class="pub-view" id="pub-view-year">
{% bibliography %}
</div>

<div class="pub-view" id="pub-view-topic" hidden>
<h2 class="bibliography">Bayesian experimental design</h2>
{% bibliography --group_by none --query @*[topic=boed] %}
<h2 class="bibliography">Simulation-based inference</h2>
{% bibliography --group_by none --query @*[topic=sbi] %}
<h2 class="bibliography">Drug design</h2>
{% bibliography --group_by none --query @*[topic=drugdesign] %}
<h2 class="bibliography">Language Models and Scientific Discovery</h2>
{% bibliography --group_by none --query @*[topic=llmsci] %}
<h2 class="bibliography">Medical devices</h2>
{% bibliography --group_by none --query @*[topic=devices] %}
</div>

</div>

<script>
  document.querySelectorAll(".pub-view-toggle button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".pub-view-toggle button").forEach((b) => b.classList.toggle("active", b === button));
      document.querySelectorAll(".pub-view").forEach((view) => {
        view.hidden = view.id !== "pub-view-" + button.dataset.view;
      });
    });
  });
</script>
