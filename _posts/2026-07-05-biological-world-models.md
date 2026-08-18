---
layout: distill
title: Biological World Models for Drug Discovery
description: Connecting simulation-based inference to world models, and what that framing buys us for adaptive drug discovery.
tags: world-models drug-discovery SBI
date: 2026-07-05
featured: true
published: false

authors:
  - name: Vincent D. Zaballa
    url: "https://vz415.github.io/"

toc:
  - name: Encoding biology in a joint predictive model
  - name: "World models: a brief primer"
  - name: Relating SBI models to world models
  - name: Rewards as utilities
  - name: Side information in drug discovery
  - name: From automation to adaptive discovery
  - name: Takeaways
---

## Encoding biology in a joint predictive model

Many hallmarks of a world model are the same as a probabilistic scientific simulators such as those trained using Simulation-based inference (SBI) techniques. For example, in biology a scientific simulator of the Bone Morphogenetic Protein (BMP) signaling pathway is modeled as a joint probabilistic model

$$
p_\phi(y, \theta, \xi),
$$

which is parameterized by model weights $\phi$ and models the joint distribution of what phenotypic response $y$ you would see given that you perturbed with an action $\xi$ and assuming latent variables $\theta$ that describe the underlying biology. You pre-train on tuples of simulations $(y, \theta, \xi)$ that you think are true *a priori* — we'll get to where this assumption falls apart later. (Note: SBI models don't always encode an action variable $\xi$.)

## World models: a brief primer

A world model, generally, is a predictive model that captures how an *environment* evolves over time and how that evolution depends on an agent's previous actions. Let $o_t$ be the observation at time $t$ given an action $a_t$; this results in a reward $r_t$ that depends on a utility function. A world model is a parameterized predictive system with model parameters $\psi$ that approximates the environment's dynamics

$$
p_\psi(s_{t+1}, o_{t+1}, r_t \mid s_t, a_t),
$$

where the true environment state $s_t$ may be fully or partially observed, or hidden.  In partially observed settings, the model needs to infer a latent belief-like state from an interaction history tuple $h_t = (o_{\leq t}, a_{\leq t})$, which can optionally be done with the help of an encoder $s_t \sim q_\eta (s_t \mid h_t)$.

## Relating SBI models to world models

If you squint long enough you can see a similarity between an action-oriented SBI model and world models. Let's convert from world model terminology to that of SBI models. Observations can be redefined as $y=o$, actions are $\xi=a$, and state variables are the latent parameters that SBI models seek to infer $\theta=s$. Let's rewrite a world model in SBI terminology

$$
p_\psi(\theta_{t+1}, y_{t+1}, r_t \mid \theta_t, \xi_t),
$$

where SBI models can encode a history of action-observation pairs into a belief over latent parameters via an encoder similar to a classic world model, such that $\theta \sim q_\eta(\theta \mid h_t)$, where $h_t$ now consists of $y$ and $\xi$ values. Alternatively, SBI often leverage Bayes' theorem to model a belief update over latent (biological) parameters:

$$
\begin{aligned}
p_\psi(\theta \mid h_t, \xi_t, y_{t+1})
&\propto p_\psi(\theta, y_{t+1} \mid h_t, \xi_t) \\
&= p_\psi(y_{t+1} \mid \theta, \xi_t)\,
p_\psi(\theta \mid h_t).
\end{aligned}
$$

So the update is still grounded in a joint model, but now the "next state" is also a posterior distribution over latent biology after observing the latest experimental response.

This is also where SBI-style biological world models can have an advantage. Many learned world models compress histories into latent states that are optimized for prediction. That may be useful, but biology often asks a more specific question. Given what we observed in one biological context, what would have happened if we had made a different intervention?

For that question to be meaningful, the latent variables should line up with mechanisms we can reason about and perturb, such as in our biological example of receptor abundance, binding affinity, or catalytic efficiency. Mechanistic SBI models already start from named scientific variables and simulator-defined dependencies. In Simformer-style models, those dependencies can be encoded through the model architecture, for example with attention masks that reflect an expert graph over parameters, experiments, and observations. This does not make the graph true, but it gives the world model an explicit causal hypothesis over named simulator variables that can be conditioned on, criticized, and refined as new experiments reveal where the model succeeds or fails.

## From prediction to utility

The remaining world-model ingredient is the reward. As in many world-model settings, this reward is best thought of as a utility used to evaluate imagined outcomes, rather than as the core dynamics model itself. In SBI, one natural choice is expected information gain (EIG), which rewards experiments that maximally shrink uncertainty about the latent parameters $\theta$

$$
\mathrm{EIG}(\xi_t)
:=
\mathbb{E}_{\theta \sim q_\eta(\theta \mid h_t),\,
y \sim p_\text{eval}(y \mid \theta, \xi_t)}
\left[
\log
\frac{
p_\psi(\theta \mid h_t, \xi_t, y)
}{
q_\eta(\theta \mid h_t)
}
\right].
$$

In words, this asks how much we expect the next experiment $\xi_t$ to change our beliefs about the latent biology given what we believe the latent parameters are before the experiment.

The utility function can also be tied to a downstream task. For example, suppose $y$ is a positive signal related to a disease-relevant phenotype, such as fluorescence intensity from a pathway reporter, and our goal is to inhibit that signal. A simple utility is to reward perturbations that make the response fall below a desired threshold $\tau$:

$$
U_{\mathrm{inhibit}}(\xi_t)
=
\mathbb{E}_{\theta \sim q_\eta(\theta \mid h_t)}
\left[
\Pr(y \leq \tau \mid h_t, \theta, \xi_t)
\right].
$$

Here $h_t$ plays two roles. It informs our current belief about the latent biology through $q_\eta(\theta \mid h_t)$, and it can also contain task-relevant experimental history, such as which perturbations or drugs have already been tried. In other words, what we think will inhibit the signal depends both on what we currently believe the biology is and on what the previous experiments have taught us about how perturbations behave in that context.

This is close in spirit to a phenotypic screen, where assay quality is often judged by how cleanly positive and negative controls separate. The Z-prime factor compares the distance between the control means with their variability, asking whether the assay has enough dynamic range to detect meaningful perturbations. Here, the world-model version asks a slightly different question. A phenotypic screen first asks whether the assay can reliably distinguish effect from no effect. The world model asks which perturbation is most likely to push the predicted phenotype into the desired range, given our current uncertainty about the biology.

## Side information in drug discovery

Once we define a utility, the next question is what information the model needs in order to make *better* decisions under that utility. This is where the world-model framing becomes particularly useful. We can ask which additional variables should be brought into the joint model, whether they actually improve decisions, and how uncertainty propagates through the downstream decision.

In drug discovery, this question shows up in the debate between ligand-based and structure-based modeling. A ligand-only model may predict activity from chemical similarity, while a structure-aware model tries to use information about the target, its binding site, and protein-ligand interactions. Let $\zeta$ represent this external structural or biophysical information. In the BMP setting, this could include ligand-receptor binding information, which overlaps with my previous work on BMP ligand-receptor structure and with Huber et al.'s use of parameter-level Bayesian updates to guide biological hypothesis formation. Let $\beta$ represent a small-molecule perturbation, distinct from the BMP ligand perturbation $\xi$. We can then write a conditional model

$$
p_\phi (y \mid \theta, \xi, \zeta, \beta).
$$

We can also think of this as a joint distribution over the variables involved:

$$
p_\phi(y, \theta, \xi, \zeta, \beta).
$$

The joint formulation provides an intuitive formualtion of what were the necessary ingredients to achieve an outcome of interest. For example, given a small molecule $\beta$, an experimental context $\xi$, structural information $\zeta$, and latent biology $\theta$, what downstream responses $y$ are we expecting? Ideally, adding more information helps us become more confident in the outcomes of interest.

<div id="model-viz" style="width:100%;height:220px;margin:1.8rem 0;border-radius:12px;overflow:hidden;background:#faf8ff;box-shadow:0 2px 16px rgba(120,100,180,0.08);"></div>

The key word is *ideally*. Adding variables to a joint model is not the same thing as adding useful information. A structural variable $\zeta$ helps only if it is relevant to the outcome $y$, calibrated enough to trust, and connected to the decision we actually care about. Otherwise, it can make the model more confident for the wrong reason, which can be a bad thing if it fails to find new drugs, or, a good thing if it reflects the performance of some successful hedge fund managers--correct for the wrong reasons (but still correct).

The world-model framing adds one more twist. When side information fails, that failure is itself informative. If a binding affinity model predicts that a molecule should perturb the pathway, but the observed response $y$ does not move, the model can help separate different explanations. The affinity prediction may be wrong, the structural representation may be misleading, or the molecule may bind correctly while remaining irrelevant to the downstream phenotype. These are different failure modes, and they imply different next experiments. In this sense, the biological world model gives us a place to propagate uncertainty from structure prediction, affinity prediction, pathway simulation, and experimental measurement into the decision we actually care about.

This leaves a few layers of uncertainty:
- The world model itself must be accurate, which depends on $\phi$ and any causal assumptions used to represent it
- Variables within the model must be accurate, such as the protein structure or its prediction
- Predictions of interactions between variables must be accurate, such as the notoriously difficult problem of structure-based binding affinity prediction

There are more layers of uncertainty, but these may be the most salient for small-molecule drug discovery and convey the challenge of reducing uncertainty in a world model of biology.

## From automation to adaptive discovery

The upshot is not that a biological world model automates drug discovery by itself, but that it gives us a way to make discovery adaptive. Different diseases, targets, assays, and therapeutic goals come with different prior information and different failure modes. A useful model should therefore help decide what to do next given the current goal, the current uncertainty, and the reliability of the tools being used.

This matters because drug discovery is not a steady march from target to molecule to clinic. A new perturbation may update our belief about pathway biology, reveal an unreliable binding mode, or show that a structural hypothesis was correct but irrelevant for the downstream phenotype. In that sense, the model is useful not only when it predicts correctly, but also when its failures point to which assumption should be tested next.

To make this concrete, imagine we have three structural hypotheses for a target--say three candidate binding site conformations $\zeta^1, \zeta^2, \zeta^3$. We want the world model to help determine how "good" each one is. One way to answer this is through the downstream prediction: conditioning on each structure hypothesis, does the model's predicted response $y$ better match what we actually observe? A structure hypothesis that leads to more accurate predictions provides evidence that it captures something real about the biology. This still requires cross-validation against held-out experimental data, but each comparison provides an informative data point that updates our belief about which structural representation is most useful. This is closely related to the use of parameter-level Bayesian updates for structural hypothesis testing in BMP signaling. However, care must be taken as this can still fall prey to the hedge fund fallacy.

<div id="adaptive-viz" style="width:100%;height:260px;margin:1.8rem 0;border-radius:12px;overflow:hidden;background:#faf8ff;box-shadow:0 2px 16px rgba(120,100,180,0.08);"></div>

A compounding effect comes from how the model relates one context to another. A drug that works against one kinase may update our beliefs about a binding pocket, a scaffold, a target family, an assay regime, or a downstream pathway. If another disease target shares some of those variables, the model can partially transfer what was learned. The same is true for failures. If a structure-based affinity model fails in one pocket or chemical series, that failure should update how much we trust similar predictions elsewhere.

This is where the world model can help localize failure. Was the binding prediction wrong, or was the predicted binding real but irrelevant to the downstream phenotype? Those are different failure modes and they suggest different subsequent experiments. Over time, each result updates the world model's shared variables and assumptions, including which binding pockets behave similarly, which chemical scaffolds transfer across targets, which assays are comparable, and which signals are useful in a given biological context.

As an example, suppose we screen three candidate molecules $\beta^1, \beta^2, \beta^3$ against a target and the world model predicts how each will affect a downstream phenotypic response. An affinity model may predict that $\beta^1$ and $\beta^2$ should both strongly inhibit the pathway, while $\beta^3$ has a weaker predicted effect. After running the experiment, $\beta^1$ inhibits as expected, $\beta^3$ shows the predicted weak effect, but $\beta^2$ does nothing despite a confident binding prediction. That discrepancy is the interesting case. The world model does not just flag $\beta^2$ as a miss; it provides a framework for asking *why*: was the affinity prediction wrong, or did the molecule bind but fail to perturb the relevant downstream biology? This gets more intersting for small moelcule discovery as we go one level up and ask what are the similarities between working and failing moleucles in a given biological context.

<div id="molecule-viz" style="width:100%;height:260px;margin:1.8rem 0;border-radius:12px;overflow:hidden;background:#faf8ff;box-shadow:0 2px 16px rgba(120,100,180,0.08);"></div>

Combining these two ideas, we can ask a joint question: given a structural hypothesis *and* a candidate molecule, does the world model predict that the downstream response falls within a therapeutically useful range? A correct structure paired with the right molecule should yield a tight, well-placed prediction. An approximate structure widens the uncertainty, and a wrong structure shifts the prediction away from the therapeutic window entirely. This is where the structural hypothesis testing and the molecule screening feed into the same decision: which combination of structure and molecule is worth pursuing next?

This also surfaces a deeper question that biologists care about. For a given disease, is this even the right target to be drugging in the first place? If the best available structure paired with the most promising molecule still places the predicted response outside the therapeutic window, that is evidence that the target itself may not be relevant to the disease phenotype. The world model can help separate "wrong molecule" from "wrong structure" from "wrong target," and each of those failure modes points to a fundamentally different next step.

<div id="structure-hit-viz" style="width:100%;height:260px;margin:1.8rem 0;border-radius:12px;overflow:hidden;background:#faf8ff;box-shadow:0 2px 16px rgba(120,100,180,0.08);"></div>

## Takeaways

The core idea is that probabilistic scientific simulators trained with SBI techniques already contain most of the ingredients of a world model, encoding a joint distribution over latent biology, experimental context, and downstream responses that updates as new data arrives. Framing these simulators as world models lets us connect them to utilities, side information, and adaptive decision-making in a way that is natural for drug discovery. In particular, a biological world model can help with several concrete tasks across small molecule and target discovery:

- **Evaluating structural hypotheses.** Given competing structural models of a target, the world model can rank them by how well they improve downstream predictions, providing evidence for which representation captures the relevant biology.
- **Screening molecules through the joint model.** Rather than relying on binding affinity predictions alone, the world model propagates uncertainty from structure through binding to phenotypic response, flagging cases where a confident affinity prediction does not translate to the expected downstream effect.
- **Target validation.** If the best available structure paired with the most promising molecule still fails to place the predicted response in a therapeutically useful range, the world model provides evidence that the target itself may not be driving the disease phenotype.
- **Localizing failure modes.** When a prediction fails, the joint model helps separate whether the failure came from the molecule, the structural representation, or the target, and each of those implies a different next experiment.

What the world-model framing adds is a way to evaluate that side information through a utility. Adding a variable to the joint model is only useful if it improves decisions under the objective we care about. Structure helps when it sharpens predictions within a therapeutic window. It hurts when it makes the model more confident for the wrong reasons. And when a prediction fails, the joint model gives us a place to ask whether the failure came from the molecule, the structure, or the target itself.

Agents can sit on top of this loop, but they are just one actor in a larger system. A language model can propose experiments, molecules, or explanations, but it still needs tools that represent biological uncertainty and competing objectives. A biological world model can act as the decision layer that connects structure prediction, binding affinity models, pathway simulators, experimental data, and downstream disease utilities. The goal then is to ask how each component changes the decision, where uncertainty enters, and which source of uncertainty matters the most for the task at hand.

The useful world model is not the one that predicts everything. It is the one that helps us choose the next action under uncertainty in biology.

<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>

<script>
(function () {
  var VARS = [
    { sym: 'θ', col: [165, 138, 215], desc: 'latent biology' },
    { sym: 'ξ', col: [215, 120, 165], desc: 'experimental context' },
    { sym: 'ζ', col: [32, 132, 148], desc: 'protein structure' },
    { sym: 'β', col: [90, 148, 210], desc: 'small molecule' }
  ];

  var sketch = function (p) {
    var w, h = 220;
    var visCount = 1, rollIdx = 1;
    var rollY = 0, rollA = 0;
    var phase = 'pause', timer = 80;
    var dStd = 0.22, dTarget = 0.22;
    var descTxt = '', descA = 0, descAT = 0;

    p.setup = function () {
      var el = document.getElementById('model-viz');
      if (!el) return;
      w = el.offsetWidth;
      var c = p.createCanvas(w, h);
      c.parent('model-viz');
    };

    p.draw = function () {
      p.background(250, 248, 255);

      if (phase === 'pause') {
        timer--;
        if (timer <= 0) {
          if (visCount >= VARS.length) {
            visCount = 1; rollIdx = 1;
            dTarget = 0.22; descAT = 0;
            phase = 'pause'; timer = 60;
          } else {
            phase = 'rolling'; rollY = 36; rollA = 0;
            descTxt = '+ ' + VARS[rollIdx].desc;
            descAT = 1;
          }
        }
      } else if (phase === 'rolling') {
        rollY = p.lerp(rollY, 0, 0.065);
        rollA = p.lerp(rollA, 1, 0.055);
        if (p.abs(rollY) < 0.4) {
          visCount++; rollIdx++;
          dTarget = [0.22, 0.17, 0.12, 0.07][p.min(visCount - 1, 3)];
          descAT = 0;
          if (visCount >= VARS.length) {
            phase = 'done'; timer = 160;
          } else {
            phase = 'pause'; timer = 75;
          }
        }
      } else if (phase === 'done') {
        timer--;
        if (timer <= 0) {
          visCount = 1; rollIdx = 1;
          dTarget = 0.22; descAT = 0;
          phase = 'pause'; timer = 60;
        }
      }

      drawEq();
      drawDesc();
      drawDensity();
    };

    function drawEq() {
      var ey = h * 0.26;
      var sz = p.min(23, w * 0.042);
      p.textSize(sz); p.textFont('Georgia');
      p.textAlign(p.LEFT, p.CENTER); p.noStroke();

      var pcs = [];
      pcs.push({ t: 'p', c: [50, 50, 50] });
      pcs.push({ t: 'ϕ', c: [130, 130, 130], sub: true });
      pcs.push({ t: '( ', c: [50, 50, 50] });
      pcs.push({ t: 'y', c: [50, 50, 50] });
      pcs.push({ t: ' | ', c: [140, 140, 140] });
      for (var i = 0; i < visCount; i++) {
        if (i > 0) pcs.push({ t: ', ', c: [140, 140, 140] });
        pcs.push({ t: VARS[i].sym, c: VARS[i].col });
      }
      if (phase === 'rolling' && rollIdx < VARS.length) {
        pcs.push({ t: ', ', c: [140, 140, 140], yo: rollY, a: rollA });
        pcs.push({ t: VARS[rollIdx].sym, c: VARS[rollIdx].col, yo: rollY, a: rollA });
      }
      pcs.push({ t: ' )', c: [50, 50, 50] });

      var tw = 0;
      for (var i = 0; i < pcs.length; i++) {
        if (pcs[i].sub) { p.textSize(sz * 0.6); tw += p.textWidth(pcs[i].t); p.textSize(sz); }
        else tw += p.textWidth(pcs[i].t);
      }
      var cx = (w - tw) / 2;

      for (var i = 0; i < pcs.length; i++) {
        var pc = pcs[i];
        var a = pc.a !== undefined ? pc.a : 1;
        var yo = pc.yo || 0;
        p.fill(pc.c[0], pc.c[1], pc.c[2], a * 255);
        if (pc.sub) {
          p.textSize(sz * 0.6);
          p.text(pc.t, cx, ey + yo + sz * 0.32);
          cx += p.textWidth(pc.t);
          p.textSize(sz);
        } else {
          p.text(pc.t, cx, ey + yo);
          cx += p.textWidth(pc.t);
        }
      }
    }

    function drawDesc() {
      descA = p.lerp(descA, descAT, 0.05);
      if (descA < 0.01) return;
      p.textSize(p.min(13, w * 0.024));
      p.textAlign(p.CENTER, p.CENTER);
      p.textStyle(p.ITALIC);
      p.fill(110, 110, 130, descA * 210);
      p.noStroke();
      p.text(descTxt, w / 2, h * 0.44);
      p.textStyle(p.NORMAL);
    }

    function drawDensity() {
      dStd = p.lerp(dStd, dTarget, 0.025);
      var by = h * 0.88, amp = h * 0.3;
      var cw = w * 0.48, sx = (w - cw) / 2;
      p.push(); p.noStroke();
      p.beginShape();
      p.fill(40, 55, 100, 18);
      p.vertex(sx, by);
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = Math.exp(-0.5 * Math.pow((t - 0.5) / dStd, 2));
        p.vertex(sx + i, by - g * amp);
      }
      p.vertex(sx + cw, by);
      p.endShape(p.CLOSE);
      p.noFill();
      p.stroke(40, 55, 100, 55);
      p.strokeWeight(1.5);
      p.beginShape();
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = Math.exp(-0.5 * Math.pow((t - 0.5) / dStd, 2));
        p.vertex(sx + i, by - g * amp);
      }
      p.endShape();
      p.pop();
      p.noStroke(); p.fill(90, 90, 110, 40);
      p.textSize(11); p.textFont('Georgia');
      p.textAlign(p.CENTER);
      p.text('y', w / 2, by + 14);
    }

    p.windowResized = function () {
      var el = document.getElementById('model-viz');
      if (!el) return;
      w = el.offsetWidth;
      p.resizeCanvas(w, h);
    };
  };

  if (document.getElementById('model-viz')) new p5(sketch);
  else document.addEventListener('DOMContentLoaded', function () { new p5(sketch); });
})();
</script>

<script>
(function () {
  var ZETAS = [
    { label: 'ζ¹', desc: 'good structural match',   meanShift: 0.0,   stdScale: 1.0  },
    { label: 'ζ²', desc: 'partial match',           meanShift: 0.08,  stdScale: 1.3  },
    { label: 'ζ³', desc: 'structural mismatch',     meanShift: -0.13, stdScale: 1.7  }
  ];

  var TEAL = [32, 132, 148];
  var NAVY = [30, 40, 80];

  var sketch = function (p) {
    var w, h = 260;
    var zetaIdx = 0;
    var phase = 'hold';
    var holdTimer = 120;
    var fadeTimer = 0;
    var FADE_DUR = 30;
    var HOLD_DUR = 140;

    var curMean = 0.0, curStd = 1.0;
    var tarMean = 0.0, tarStd = 1.0;
    var descAlpha = 1.0, descTarget = 1.0;

    var trueMean = 0.5, trueStd = 0.11;

    p.setup = function () {
      var el = document.getElementById('adaptive-viz');
      if (!el) return;
      w = el.offsetWidth;
      var c = p.createCanvas(w, h);
      c.parent('adaptive-viz');
      applyZeta(0);
      curMean = tarMean;
      curStd = tarStd;
    };

    function applyZeta(idx) {
      tarMean = trueMean + ZETAS[idx].meanShift;
      tarStd = trueStd * ZETAS[idx].stdScale;
    }

    function gauss(x, mu, sig) {
      return Math.exp(-0.5 * Math.pow((x - mu) / sig, 2));
    }

    p.draw = function () {
      p.background(250, 248, 255);

      if (phase === 'hold') {
        holdTimer--;
        curMean = p.lerp(curMean, tarMean, 0.06);
        curStd = p.lerp(curStd, tarStd, 0.06);
        descAlpha = p.lerp(descAlpha, 1.0, 0.06);
        if (holdTimer <= 0) {
          phase = 'fadeout';
          fadeTimer = FADE_DUR;
          descTarget = 0.0;
        }
      } else if (phase === 'fadeout') {
        fadeTimer--;
        descAlpha = p.lerp(descAlpha, 0.0, 0.1);
        if (fadeTimer <= 0) {
          zetaIdx = (zetaIdx + 1) % ZETAS.length;
          applyZeta(zetaIdx);
          phase = 'hold';
          holdTimer = HOLD_DUR;
          descTarget = 1.0;
        }
      }

      drawEq();
      drawCurves();
      drawDesc();
    };

    function drawEq() {
      var ey = h * 0.15;
      var sz = p.min(21, w * 0.038);
      p.textSize(sz);
      p.textFont('Georgia');
      p.textAlign(p.LEFT, p.CENTER);
      p.noStroke();

      var zeta = ZETAS[zetaIdx];
      var pieces = [
        { t: 'p',   c: [50, 50, 50] },
        { t: 'ϕ', c: [130, 130, 130], sub: true },
        { t: '( ',  c: [50, 50, 50] },
        { t: 'y',   c: [50, 50, 50] },
        { t: ' | ', c: [140, 140, 140] },
        { t: 'θ',  c: [165, 138, 215] },
        { t: ', ',  c: [140, 140, 140] },
        { t: 'ξ',  c: [215, 120, 165] },
        { t: ', ',  c: [140, 140, 140] },
        { t: zeta.label, c: TEAL },
        { t: ', ',  c: [140, 140, 140] },
        { t: 'β',  c: [90, 148, 210] },
        { t: ' )',  c: [50, 50, 50] }
      ];

      var tw = 0;
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].sub) { p.textSize(sz * 0.6); tw += p.textWidth(pieces[i].t); p.textSize(sz); }
        else tw += p.textWidth(pieces[i].t);
      }
      var cx = (w - tw) / 2;

      for (var i = 0; i < pieces.length; i++) {
        var pc = pieces[i];
        p.fill(pc.c[0], pc.c[1], pc.c[2]);
        if (pc.sub) {
          p.textSize(sz * 0.6);
          p.text(pc.t, cx, ey + sz * 0.32);
          cx += p.textWidth(pc.t);
          p.textSize(sz);
        } else {
          p.text(pc.t, cx, ey);
          cx += p.textWidth(pc.t);
        }
      }
    }

    function drawDesc() {
      if (descAlpha < 0.01) return;
      var dy = h * 0.30;
      p.textSize(p.min(13, w * 0.024));
      p.textFont('Georgia');
      p.textAlign(p.CENTER, p.CENTER);
      p.textStyle(p.ITALIC);
      p.noStroke();
      var zeta = ZETAS[zetaIdx];
      var col;
      if (zetaIdx === 0) col = [60, 130, 80];
      else if (zetaIdx === 1) col = [170, 130, 40];
      else col = [180, 60, 60];
      p.fill(col[0], col[1], col[2], descAlpha * 220);
      p.text(zeta.desc, w / 2, dy);
      p.textStyle(p.NORMAL);
    }

    function drawCurves() {
      var baseY = h * 0.88;
      var amp = h * 0.42;
      var cw = w * 0.72;
      var sx = (w - cw) / 2;

      // Residual shading between curves
      p.push();
      p.noStroke();
      p.beginShape();
      var resCol;
      if (zetaIdx === 0) resCol = [60, 160, 100, 22];
      else if (zetaIdx === 1) resCol = [200, 160, 40, 22];
      else resCol = [200, 70, 70, 22];
      p.fill(resCol[0], resCol[1], resCol[2], resCol[3]);

      // top edge: whichever curve is higher going left to right
      var trueYs = [];
      var predYs = [];
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var gTrue = gauss(t, trueMean, trueStd);
        var gPred = gauss(t, curMean, curStd);
        trueYs.push(baseY - gTrue * amp);
        predYs.push(baseY - gPred * amp);
      }
      // draw the area between the two curves
      for (var i = 0; i < trueYs.length; i++) {
        p.vertex(sx + i * 2, Math.min(trueYs[i], predYs[i]));
      }
      for (var i = trueYs.length - 1; i >= 0; i--) {
        p.vertex(sx + i * 2, Math.max(trueYs[i], predYs[i]));
      }
      p.endShape(p.CLOSE);
      p.pop();

      // True distribution (dashed)
      p.push();
      p.stroke(NAVY[0], NAVY[1], NAVY[2], 180);
      p.strokeWeight(2);
      p.noFill();
      var dashLen = 8, gapLen = 6;
      var accum = 0;
      var drawing = true;
      var prevX = sx, prevY = baseY - gauss(0, trueMean, trueStd) * amp;
      for (var i = 2; i <= cw; i += 2) {
        var t = i / cw;
        var gT = gauss(t, trueMean, trueStd);
        var nx = sx + i;
        var ny = baseY - gT * amp;
        var seg = p.dist(prevX, prevY, nx, ny);
        accum += seg;
        if (drawing) {
          if (accum <= dashLen) {
            p.line(prevX, prevY, nx, ny);
          } else {
            p.line(prevX, prevY, nx, ny);
            accum = 0;
            drawing = false;
          }
        } else {
          if (accum >= gapLen) {
            accum = 0;
            drawing = true;
          }
        }
        prevX = nx;
        prevY = ny;
      }
      p.pop();

      // Predicted distribution (solid teal)
      p.push();
      p.noFill();
      p.stroke(TEAL[0], TEAL[1], TEAL[2], 210);
      p.strokeWeight(2.5);
      p.beginShape();
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var gP = gauss(t, curMean, curStd);
        p.vertex(sx + i, baseY - gP * amp);
      }
      p.endShape();

      // Teal fill under predicted
      p.noStroke();
      p.fill(TEAL[0], TEAL[1], TEAL[2], 25);
      p.beginShape();
      p.vertex(sx, baseY);
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var gP = gauss(t, curMean, curStd);
        p.vertex(sx + i, baseY - gP * amp);
      }
      p.vertex(sx + cw, baseY);
      p.endShape(p.CLOSE);
      p.pop();

      // Axis line
      p.stroke(100, 100, 120, 50);
      p.strokeWeight(1);
      p.line(sx, baseY, sx + cw, baseY);

      // Labels
      p.noStroke();
      p.textSize(11);
      p.textFont('Georgia');
      p.textAlign(p.CENTER);
      p.fill(90, 90, 110, 50);
      p.text('y', w / 2, baseY + 16);

      // Legend
      var legY = h * 0.42;
      var legX = sx + cw + 12;
      if (legX + 80 > w) { legX = sx; legY = h * 0.38; }
      p.textSize(p.min(11, w * 0.02));
      p.textAlign(p.LEFT, p.CENTER);

      // dashed line legend
      p.stroke(NAVY[0], NAVY[1], NAVY[2], 180);
      p.strokeWeight(2);
      var dashLeg = 3;
      for (var d = 0; d < dashLeg; d++) {
        p.line(legX + d * 8, legY, legX + d * 8 + 5, legY);
      }
      p.noStroke();
      p.fill(NAVY[0], NAVY[1], NAVY[2], 180);
      p.text('  true distribution', legX + dashLeg * 8 + 2, legY);

      // solid line legend
      p.stroke(TEAL[0], TEAL[1], TEAL[2], 210);
      p.strokeWeight(2.5);
      p.line(legX, legY + 18, legX + dashLeg * 8 - 3, legY + 18);
      p.noStroke();
      p.fill(TEAL[0], TEAL[1], TEAL[2], 210);
      p.text('  predicted', legX + dashLeg * 8 + 2, legY + 18);
    }

    p.windowResized = function () {
      var el = document.getElementById('adaptive-viz');
      if (!el) return;
      w = el.offsetWidth;
      p.resizeCanvas(w, h);
    };
  };

  if (document.getElementById('adaptive-viz')) new p5(sketch);
  else document.addEventListener('DOMContentLoaded', function () { new p5(sketch); });
})();
</script>

<script>
(function () {
  var BETAS = [
    { label: 'β¹', predMean: 0.3,  obsMean: 0.32,
      context: 'affinity model predicts: strong inhibition',
      desc: 'observed: inhibition — prediction confirmed', good: true },
    { label: 'β²', predMean: 0.3,  obsMean: 0.74,
      context: 'affinity model predicts: strong inhibition',
      desc: 'observed: no effect — world model updates', good: false },
    { label: 'β³', predMean: 0.6,  obsMean: 0.58,
      context: 'affinity model predicts: weak effect',
      desc: 'observed: weak effect — prediction confirmed', good: true }
  ];

  var BLUE = [90, 148, 210];
  var NAVY = [30, 40, 80];

  var sketch2 = function (p) {
    var w, h = 260;
    var betaIdx = 0;
    var phase = 'hold';
    var holdTimer = 130;
    var fadeTimer = 0;
    var FADE_DUR = 30;
    var HOLD_DUR = 150;

    var curPredMean = 0.3, tarPredMean = 0.3;
    var curObsMean = 0.32, tarObsMean = 0.32;
    var predStd = 0.09;
    var descAlpha = 1.0;

    p.setup = function () {
      var el = document.getElementById('molecule-viz');
      if (!el) return;
      w = el.offsetWidth;
      var c = p.createCanvas(w, h);
      c.parent('molecule-viz');
      applyBeta(0);
      curPredMean = tarPredMean;
      curObsMean = tarObsMean;
    };

    function applyBeta(idx) {
      tarPredMean = BETAS[idx].predMean;
      tarObsMean = BETAS[idx].obsMean;
    }

    function gauss(x, mu, sig) {
      return Math.exp(-0.5 * Math.pow((x - mu) / sig, 2));
    }

    p.draw = function () {
      p.background(250, 248, 255);

      if (phase === 'hold') {
        holdTimer--;
        curPredMean = p.lerp(curPredMean, tarPredMean, 0.06);
        curObsMean = p.lerp(curObsMean, tarObsMean, 0.05);
        descAlpha = p.lerp(descAlpha, 1.0, 0.06);
        if (holdTimer <= 0) {
          phase = 'fadeout';
          fadeTimer = FADE_DUR;
        }
      } else if (phase === 'fadeout') {
        fadeTimer--;
        descAlpha = p.lerp(descAlpha, 0.0, 0.1);
        if (fadeTimer <= 0) {
          betaIdx = (betaIdx + 1) % BETAS.length;
          applyBeta(betaIdx);
          phase = 'hold';
          holdTimer = HOLD_DUR;
        }
      }

      drawMolEq();
      drawMolDesc();
      drawMolCurves();
    };

    function drawMolEq() {
      var ey = h * 0.15;
      var sz = p.min(21, w * 0.038);
      p.textSize(sz);
      p.textFont('Georgia');
      p.textAlign(p.LEFT, p.CENTER);
      p.noStroke();

      var beta = BETAS[betaIdx];
      var pieces = [
        { t: 'p', c: [50, 50, 50] },
        { t: 'ϕ', c: [130, 130, 130], sub: true },
        { t: '( ', c: [50, 50, 50] },
        { t: 'y', c: [50, 50, 50] },
        { t: ' | ', c: [140, 140, 140] },
        { t: 'θ', c: [165, 138, 215] },
        { t: ', ', c: [140, 140, 140] },
        { t: 'ξ', c: [215, 120, 165] },
        { t: ', ', c: [140, 140, 140] },
        { t: 'ζ', c: [32, 132, 148] },
        { t: ', ', c: [140, 140, 140] },
        { t: beta.label, c: BLUE },
        { t: ' )', c: [50, 50, 50] }
      ];

      var tw = 0;
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].sub) { p.textSize(sz * 0.6); tw += p.textWidth(pieces[i].t); p.textSize(sz); }
        else tw += p.textWidth(pieces[i].t);
      }
      var cx = (w - tw) / 2;
      for (var i = 0; i < pieces.length; i++) {
        var pc = pieces[i];
        p.fill(pc.c[0], pc.c[1], pc.c[2]);
        if (pc.sub) {
          p.textSize(sz * 0.6);
          p.text(pc.t, cx, ey + sz * 0.32);
          cx += p.textWidth(pc.t);
          p.textSize(sz);
        } else {
          p.text(pc.t, cx, ey);
          cx += p.textWidth(pc.t);
        }
      }
    }

    function drawMolDesc() {
      if (descAlpha < 0.01) return;
      var beta = BETAS[betaIdx];
      var tsz = p.min(12, w * 0.022);
      p.textFont('Georgia');
      p.textAlign(p.CENTER, p.CENTER);
      p.noStroke();

      // Line 1: what the affinity model predicts
      p.textSize(tsz);
      p.textStyle(p.ITALIC);
      p.fill(100, 100, 120, descAlpha * 180);
      p.text(beta.context, w / 2, h * 0.26);

      // Line 2: what was actually observed
      var col = beta.good ? [60, 130, 80] : [180, 60, 60];
      p.fill(col[0], col[1], col[2], descAlpha * 220);
      p.text(beta.desc, w / 2, h * 0.33);
      p.textStyle(p.NORMAL);
    }

    function drawMolCurves() {
      var baseY = h * 0.88;
      var amp = h * 0.40;
      var cw = w * 0.72;
      var sx = (w - cw) / 2;

      // Predicted distribution fill
      p.push();
      p.noStroke();
      p.fill(BLUE[0], BLUE[1], BLUE[2], 25);
      p.beginShape();
      p.vertex(sx, baseY);
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = gauss(t, curPredMean, predStd);
        p.vertex(sx + i, baseY - g * amp);
      }
      p.vertex(sx + cw, baseY);
      p.endShape(p.CLOSE);

      // Predicted distribution stroke
      p.noFill();
      p.stroke(BLUE[0], BLUE[1], BLUE[2], 180);
      p.strokeWeight(2.5);
      p.beginShape();
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = gauss(t, curPredMean, predStd);
        p.vertex(sx + i, baseY - g * amp);
      }
      p.endShape();
      p.pop();

      // Observed y marker — vertical line + dot
      var obsX = sx + curObsMean * cw;
      var beta = BETAS[betaIdx];
      var dist = Math.abs(curObsMean - curPredMean);
      var markerCol;
      if (dist < 0.1) markerCol = [60, 140, 80];
      else markerCol = [200, 60, 60];

      // Discrepancy shading between predicted peak and observed
      if (dist > 0.08) {
        var predX = sx + curPredMean * cw;
        p.noStroke();
        p.fill(markerCol[0], markerCol[1], markerCol[2], 18);
        var lx = Math.min(predX, obsX);
        var rx = Math.max(predX, obsX);
        p.rect(lx, baseY - amp * 0.85, rx - lx, amp * 0.85);
      }

      p.stroke(markerCol[0], markerCol[1], markerCol[2], 200);
      p.strokeWeight(2.5);
      p.line(obsX, baseY, obsX, baseY - amp * 0.8);
      p.noStroke();
      p.fill(markerCol[0], markerCol[1], markerCol[2], 230);
      p.ellipse(obsX, baseY - amp * 0.8 - 5, 8, 8);

      // Axis
      p.stroke(100, 100, 120, 50);
      p.strokeWeight(1);
      p.line(sx, baseY, sx + cw, baseY);

      // y label
      p.noStroke();
      p.textSize(11);
      p.textFont('Georgia');
      p.textAlign(p.CENTER);
      p.fill(90, 90, 110, 50);
      p.text('y', w / 2, baseY + 16);

      // Axis endpoint labels
      p.textSize(p.min(10, w * 0.019));
      p.fill(90, 90, 110, 70);
      p.textAlign(p.LEFT);
      p.text('inhibited', sx, baseY + 16);
      p.textAlign(p.RIGHT);
      p.text('no effect', sx + cw, baseY + 16);

      // Legend
      var legY = h * 0.40;
      var legX = sx + cw * 0.72;
      if (legX + 90 > w) { legX = sx; legY = h * 0.37; }
      p.textSize(p.min(11, w * 0.02));
      p.textAlign(p.LEFT, p.CENTER);

      p.stroke(BLUE[0], BLUE[1], BLUE[2], 180);
      p.strokeWeight(2.5);
      p.line(legX, legY, legX + 18, legY);
      p.noStroke();
      p.fill(BLUE[0], BLUE[1], BLUE[2], 190);
      p.text('  predicted', legX + 20, legY);

      p.stroke(markerCol[0], markerCol[1], markerCol[2], 200);
      p.strokeWeight(2.5);
      p.line(legX + 4, legY + 18, legX + 4, legY + 10);
      p.noStroke();
      p.fill(markerCol[0], markerCol[1], markerCol[2], 230);
      p.ellipse(legX + 4, legY + 9, 6, 6);
      p.fill(markerCol[0], markerCol[1], markerCol[2], 190);
      p.text('  observed y', legX + 20, legY + 14);
    }

    p.windowResized = function () {
      var el = document.getElementById('molecule-viz');
      if (!el) return;
      w = el.offsetWidth;
      p.resizeCanvas(w, h);
    };
  };

  if (document.getElementById('molecule-viz')) new p5(sketch2);
  else document.addEventListener('DOMContentLoaded', function () { new p5(sketch2); });
})();
</script>

<script>
(function () {
  var CASES = [
    { zetaLabel: 'ζ¹ correct',     predMean: 0.32, predStd: 0.07, desc: 'hit: correct structure', quality: 'good' },
    { zetaLabel: 'ζ² approximate',  predMean: 0.44, predStd: 0.13, desc: 'uncertain: approximate structure', quality: 'medium' },
    { zetaLabel: 'ζ³ wrong',        predMean: 0.68, predStd: 0.09, desc: 'miss: wrong structure', quality: 'bad' }
  ];

  var TEAL = [32, 132, 148];
  var HIT_LO = 0.15, HIT_HI = 0.50;

  var sketch3 = function (p) {
    var w, h = 260;
    var caseIdx = 0;
    var phase = 'hold';
    var holdTimer = 130;
    var fadeTimer = 0;
    var FADE_DUR = 30;
    var HOLD_DUR = 150;

    var curMean = 0.32, curStd = 0.07;
    var tarMean = 0.32, tarStd = 0.07;
    var descAlpha = 1.0;

    p.setup = function () {
      var el = document.getElementById('structure-hit-viz');
      if (!el) return;
      w = el.offsetWidth;
      var c = p.createCanvas(w, h);
      c.parent('structure-hit-viz');
      applyCase(0);
      curMean = tarMean;
      curStd = tarStd;
    };

    function applyCase(idx) {
      tarMean = CASES[idx].predMean;
      tarStd = CASES[idx].predStd;
    }

    function gauss(x, mu, sig) {
      return Math.exp(-0.5 * Math.pow((x - mu) / sig, 2));
    }

    p.draw = function () {
      p.background(250, 248, 255);

      if (phase === 'hold') {
        holdTimer--;
        curMean = p.lerp(curMean, tarMean, 0.06);
        curStd = p.lerp(curStd, tarStd, 0.06);
        descAlpha = p.lerp(descAlpha, 1.0, 0.06);
        if (holdTimer <= 0) {
          phase = 'fadeout';
          fadeTimer = FADE_DUR;
        }
      } else if (phase === 'fadeout') {
        fadeTimer--;
        descAlpha = p.lerp(descAlpha, 0.0, 0.1);
        if (fadeTimer <= 0) {
          caseIdx = (caseIdx + 1) % CASES.length;
          applyCase(caseIdx);
          phase = 'hold';
          holdTimer = HOLD_DUR;
        }
      }

      drawHitEq();
      drawHitDesc();
      drawHitCurves();
    };

    function drawHitEq() {
      var ey = h * 0.15;
      var sz = p.min(21, w * 0.038);
      p.textSize(sz);
      p.textFont('Georgia');
      p.textAlign(p.LEFT, p.CENTER);
      p.noStroke();

      var cs = CASES[caseIdx];
      var pieces = [
        { t: 'p', c: [50, 50, 50] },
        { t: 'ϕ', c: [130, 130, 130], sub: true },
        { t: '( ', c: [50, 50, 50] },
        { t: 'y', c: [50, 50, 50] },
        { t: ' | ', c: [140, 140, 140] },
        { t: 'θ', c: [165, 138, 215] },
        { t: ', ', c: [140, 140, 140] },
        { t: 'ξ', c: [215, 120, 165] },
        { t: ', ', c: [140, 140, 140] },
        { t: cs.zetaLabel, c: TEAL },
        { t: ', ', c: [140, 140, 140] },
        { t: 'β', c: [90, 148, 210] },
        { t: ' )', c: [50, 50, 50] }
      ];

      var tw = 0;
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i].sub) { p.textSize(sz * 0.6); tw += p.textWidth(pieces[i].t); p.textSize(sz); }
        else tw += p.textWidth(pieces[i].t);
      }
      var cx = (w - tw) / 2;
      for (var i = 0; i < pieces.length; i++) {
        var pc = pieces[i];
        p.fill(pc.c[0], pc.c[1], pc.c[2]);
        if (pc.sub) {
          p.textSize(sz * 0.6);
          p.text(pc.t, cx, ey + sz * 0.32);
          cx += p.textWidth(pc.t);
          p.textSize(sz);
        } else {
          p.text(pc.t, cx, ey);
          cx += p.textWidth(pc.t);
        }
      }
    }

    function drawHitDesc() {
      if (descAlpha < 0.01) return;
      var dy = h * 0.28;
      p.textSize(p.min(13, w * 0.024));
      p.textFont('Georgia');
      p.textAlign(p.CENTER, p.CENTER);
      p.textStyle(p.ITALIC);
      p.noStroke();
      var cs = CASES[caseIdx];
      var col;
      if (cs.quality === 'good') col = [60, 130, 80];
      else if (cs.quality === 'medium') col = [170, 130, 40];
      else col = [180, 60, 60];
      p.fill(col[0], col[1], col[2], descAlpha * 220);
      p.text(cs.desc, w / 2, dy);
      p.textStyle(p.NORMAL);
    }

    function drawHitCurves() {
      var baseY = h * 0.88;
      var amp = h * 0.40;
      var cw = w * 0.72;
      var sx = (w - cw) / 2;

      // Hit zone shading
      var hitL = sx + HIT_LO * cw;
      var hitR = sx + HIT_HI * cw;
      p.noStroke();
      p.fill(60, 160, 100, 14);
      p.rect(hitL, baseY - amp - 10, hitR - hitL, amp + 10);

      // Hit zone label
      p.textSize(p.min(10, w * 0.018));
      p.textFont('Georgia');
      p.textAlign(p.CENTER, p.TOP);
      p.fill(60, 130, 80, 90);
      p.text('therapeutic', (hitL + hitR) / 2, baseY - amp - 8);
      p.text('range', (hitL + hitR) / 2, baseY - amp + 4);

      // Hit zone border lines
      p.stroke(60, 160, 100, 40);
      p.strokeWeight(1);
      p.drawingContext.setLineDash([4, 4]);
      p.line(hitL, baseY - amp - 10, hitL, baseY);
      p.line(hitR, baseY - amp - 10, hitR, baseY);
      p.drawingContext.setLineDash([]);

      // Distribution fill (color depends on overlap with hit zone)
      var cs = CASES[caseIdx];
      var fillCol;
      if (cs.quality === 'good') fillCol = [60, 160, 100, 25];
      else if (cs.quality === 'medium') fillCol = [200, 160, 40, 25];
      else fillCol = [200, 70, 70, 25];

      p.push();
      p.noStroke();
      p.fill(fillCol[0], fillCol[1], fillCol[2], fillCol[3]);
      p.beginShape();
      p.vertex(sx, baseY);
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = gauss(t, curMean, curStd);
        p.vertex(sx + i, baseY - g * amp);
      }
      p.vertex(sx + cw, baseY);
      p.endShape(p.CLOSE);

      // Distribution stroke
      var strokeCol;
      if (cs.quality === 'good') strokeCol = [40, 130, 70, 200];
      else if (cs.quality === 'medium') strokeCol = [180, 140, 30, 200];
      else strokeCol = [190, 60, 60, 200];

      p.noFill();
      p.stroke(strokeCol[0], strokeCol[1], strokeCol[2], strokeCol[3]);
      p.strokeWeight(2.5);
      p.beginShape();
      for (var i = 0; i <= cw; i += 2) {
        var t = i / cw;
        var g = gauss(t, curMean, curStd);
        p.vertex(sx + i, baseY - g * amp);
      }
      p.endShape();
      p.pop();

      // Axis
      p.stroke(100, 100, 120, 50);
      p.strokeWeight(1);
      p.line(sx, baseY, sx + cw, baseY);

      // Axis labels
      p.noStroke();
      p.textSize(11);
      p.textFont('Georgia');
      p.textAlign(p.CENTER);
      p.fill(90, 90, 110, 50);
      p.text('y', w / 2, baseY + 16);

      p.textSize(p.min(10, w * 0.019));
      p.fill(90, 90, 110, 70);
      p.textAlign(p.LEFT);
      p.text('strong effect', sx, baseY + 16);
      p.textAlign(p.RIGHT);
      p.text('no effect', sx + cw, baseY + 16);
    }

    p.windowResized = function () {
      var el = document.getElementById('structure-hit-viz');
      if (!el) return;
      w = el.offsetWidth;
      p.resizeCanvas(w, h);
    };
  };

  if (document.getElementById('structure-hit-viz')) new p5(sketch3);
  else document.addEventListener('DOMContentLoaded', function () { new p5(sketch3); });
})();
</script>

