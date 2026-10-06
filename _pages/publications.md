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

<div class="pub-view" id="pub-view-topic" hidden>
<h2 class="bibliography">Generative Models</h2>
{% bibliography --group_by none --query @*[topic~=gen] %}
<h2 class="bibliography">Stochastic Processes and Monte Carlo</h2>
{% bibliography --group_by none --query @*[topic~=stoch] %}
<h2 class="bibliography">Bayesian Inference and Experimental Design</h2>
{% bibliography --group_by none --query @*[topic~=infer] %}
<h2 class="bibliography">AI for Drug Discovery</h2>
{% bibliography --group_by none --query @*[topic~=drug] %}
<h2 class="bibliography">Language Models and Scientific Discovery</h2>
{% bibliography --group_by none --query @*[topic~=llmsci] %}
</div>

<div class="pub-view" id="pub-view-year">
{% bibliography %}
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
