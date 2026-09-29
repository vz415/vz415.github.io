---
layout: page
permalink: /talks/
title: talks
nav: true
nav_order: 3
---

<!-- _pages/talks.md -->

<div class="publications">
{% assign talks_by_year = site.data.talks | group_by: "year" %}
{% for group in talks_by_year %}
  <h2 class="bibliography">{{ group.name }}</h2>
  <ol class="bibliography">
    {% for talk in group.items %}
      <li>
        <div class="row">
          <div class="col-sm-2 abbr">
            <abbr class="badge rounded w-100">{{ talk.date }}</abbr>
          </div>
          <div class="col-sm-8">
            <div class="title">
              {% if talk.url %}<a href="{{ talk.url }}">{{ talk.title }}</a>{% else %}{{ talk.title }}{% endif %}
            </div>
            <div class="periodical">
              <em>{{ talk.event }}</em>{% if talk.location %}, {{ talk.location }}{% endif %}
            </div>
          </div>
        </div>
      </li>
    {% endfor %}
  </ol>
{% endfor %}
</div>
