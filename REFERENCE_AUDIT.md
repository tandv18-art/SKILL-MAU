# AIOS LAB — REFERENCE_AUDIT

Version: 1.0  
Purpose: Evidence-based audit of the uploaded Skill reference set for AIOS Lab.

## 1. Audit principle

These samples are **reference material only**. AIOS Lab may reuse abstract ideas such as structure, QA gates, identity locks, art-direction logic, provider/tool separation, and output discipline. It must **not** clone commercial names, proprietary wording, prompts, distinctive visual styles, logos, brand identities, or implementation details that are not appropriate for AIOS Lab.

AIOS Lab product strategy is a single Skill/AI platform with shared runtime, provider gateway, credit controls, analytics, and a progression from free Skill funnel → AI Mini → AI Studio → AIOS Business. Each Skill should follow a standard structure such as `SKILL.md`, manifest/schema files, prompt contract, QA rules, examples and thumbnail. This is aligned with the AIOS Lab 12‑month plan and technical rules. 

## 2. Priority classification

### Tier A — Core references for Realistic Check-in / image realism

#### A1. `Hoan_Doi_Nhan_Vat_Thuong_Hieu.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- branded face reference asset

**Strong ideas to learn**
- identity lock / face lock
- outfit lock
- per-reference analysis before generation
- explicit analysis of camera angle, framing, pose, environment, lighting, color palette, depth of field
- create each reference result separately to avoid cross-reference contamination

**Weakness / risk**
- designed around one fixed proprietary brand character
- instructions are brand-specific and should not be reused verbatim
- strong face/outfit substitution does not by itself guarantee full physical integration into a new scene

**AIOS Lab improvement**
- generalize identity preservation into provider-neutral `identity_reference`
- add realism QA for lighting, perspective, contact shadows, depth, lens behavior and edge integration
- add repair/regeneration loop when identity or integration fails

**Use for Check-in:** VERY HIGH

---

#### A2. `multishot-gpt-image-2.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- icon asset

**Strong ideas to learn**
- face lock and outfit lock across many shots
- consistency across camera angles
- separation of Multishot and Storyboard modes
- explicit locking of face, hair, outfit, props, location, visible text/logo, lighting and motion direction

**Weakness / risk**
- optimized for multishot/storyboard production, not specifically for natural travel-photo integration
- consistency constraints can become over-constrained if copied mechanically

**AIOS Lab improvement**
- reuse consistency logic for repeated check-in outputs
- add a dedicated `scene_coherence` layer for environment/camera realism
- score identity drift across outputs

**Use for Check-in:** VERY HIGH

---

#### A3. `Product_Poster_Concept_Creator_Full_Package.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- `references/style-catalog.md`
- `references/art-direction-analysis.md`
- `references/reference-grammar-library.md`
- many visual style references

**Strong ideas to learn**
- analyze before generating
- treat the source object as truth
- non-negotiable locks for geometry, material, logo, labels and text
- art-direction grammar: camera height, lens feel, scale, focal point, grid, negative space, depth layers, light direction, shadow, palette, prop logic, typography zones
- learn abstract design systems rather than copying branded content

**Weakness / risk**
- product-centric, not human-centric
- poster aesthetics can become too commercial or overly art-directed for realistic check-in photos

**AIOS Lab improvement**
- adapt its “source truth + art-direction analysis” methodology to people and environments
- for Check-in, prioritize believable real photography over poster aesthetics
- use physical coherence scoring instead of only aesthetic quality

**Use for Check-in:** HIGH

---

#### A4. `phong-branded-photo.zip`
**Observed structure**
- `SKILL.md`
- `scripts/branded_overlay.py`
- local font asset

**Strong ideas to learn**
- deterministic text overlay instead of asking image generation to render typography
- fixed social output dimensions
- separation between base image and overlay layer

**Weakness / risk**
- highly brand-specific visual styling
- not a realism engine

**AIOS Lab improvement**
- reuse only deterministic overlay architecture and safe-area logic
- never copy brand palette, badge, website, typography identity or exact layout

**Use for Check-in:** MEDIUM-HIGH for social delivery, LOW for scene generation

---

### Tier B — Strategic support references

#### B1. `uyen-linh-model.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- `references/brand-kit.md`
- `references/output-playbook.md`
- branded avatar asset

**Strong ideas to learn**
- separate Brand Kit from output playbook
- route requests by task type
- identity/outfit lock from user-provided references
- clear output QA before delivery

**Weakness / risk**
- very brand-specific visual DNA
- cinematic style could conflict with AIOS Lab’s “natural, believable photo” goal

**AIOS Lab improvement**
- reuse modular brand-system architecture only
- keep Check-in default style natural, not cinematic

**Use for Check-in:** MEDIUM

---

#### B2. `social-photo-content-publisher.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- `references/intake.md`
- `scripts/overlay_text.py`

**Strong ideas to learn**
- use real user images as primary media
- avoid adding AI-looking details when the user requests real-photo handling
- deterministic text overlay
- mobile readability QA
- do not fabricate hidden metrics, experience or proof

**Weakness / risk**
- publishing workflow is broader than Check-in

**AIOS Lab improvement**
- reuse intake, asset-permission and delivery discipline
- keep generation and publishing decoupled

**Use for Check-in:** MEDIUM-HIGH

---

#### B3. `videoviral-skill.zip`
**Observed structure**
- `SKILL.md`
- `agents/openai.yaml`
- multiple reference files for formats, golden style, captions, quality gates, real-media policy, text safety

**Strong ideas to learn**
- explicit QA gates before final render
- real-media policy
- staged artifacts: brief → storyboard → script → render
- verify outputs before delivery
- text safety and source discipline

**Weakness / risk**
- strongly tied to a particular video pipeline and style

**AIOS Lab improvement**
- reuse the idea of phase gates and quality gates
- keep provider/tool-specific implementation behind adapters

**Use for Check-in:** MEDIUM for QA architecture

---

#### B4. `poster-san-pham-skill.zip`
**Observed structure**
- one large `SKILL.md`

**Strong ideas to learn**
- art-director mindset
- coordinated multi-output campaign logic
- analyze first, generate second

**Weakness / risk**
- much content overlaps the larger product-poster package
- should not be treated as a separate core source

**AIOS Lab improvement**
- use as secondary cross-check only

**Use for Check-in:** LOW-MEDIUM

---

### Tier C — Utility references

#### C1. `chinh-sua-anh-skill.zip`
- Useful for local enhancement workflow and realism-preserving retouching concepts.
- Do not use as core Check-in architecture.

#### C2. `xoa-nen-anh-skill.zip`
- Useful for local segmentation/background-removal utility patterns.
- Important warning: removing a background is **not** the same as realistic scene integration. Check-in must not degrade into cutout compositing.

#### C3. `tang-chat-luong-4k.zip`
- Useful for post-processing/upscale utility only.
- Upscale must not be confused with realism QA.

#### C4. `xoa-logo-anh-skill.zip`
- Utility/inpainting reference only.
- Not core to Check-in.
- Must retain legal/safety constraints around third-party marks and ownership.

---

### Tier D — Assets / non-runtime material

#### D1. `Kho-Am-Thanh-113-file.zip`
- Audio asset library, not a Skill runtime reference.
- Keep outside initial Check-in implementation audit.

#### D2. `Cài skill.docx`
- Operational usage notes for social content workflows.
- Useful for later onboarding/use-case copy, not for core runtime architecture.

#### D3. `KE_HOACH_AIOS_LAB_SKILL_FUNNEL_TO_AI_PRODUCTS_V2(1).docx`
- Strategic source of truth for AIOS Lab product ladder, Skill Store, shared runtime, cost guards, analytics, launch order and safety rules.
- This should influence architecture more strongly than any single sample Skill.

## 3. Cross-reference lessons for AIOS Lab

### Reusable concepts
1. Identity lock must be explicit.
2. Source image/object must be treated as truth.
3. Analyze before generating.
4. Separate style/reference memory from runtime logic.
5. Use deterministic overlays for text when possible.
6. Build QA gates, not just generation prompts.
7. Avoid copying proprietary style or wording.
8. Keep provider/tool-specific logic behind adapters.
9. Separate generation from publishing.
10. Fail closed when required evidence or input is missing.

### Concepts AIOS Lab must improve beyond the samples
1. **Physical integration QA**: lighting, perspective, scale, contact shadows, depth, lens behavior, atmospheric coherence.
2. **Anti-cutout detection**: edge halo, inconsistent sharpness, floating subject, wrong contact geometry.
3. **Anti-AI-look QA**: plastic skin, synthetic bokeh, excessive HDR, over-perfect poses, generic AI model faces.
4. **Identity drift scoring** across multiple outputs.
5. **Provider-neutral contracts** so models/providers can change without rewriting the Skill.
6. **Credit/cost guard** and idempotent billable operations from day one.
7. **Analytics events** for activation, repeat use, conversion and cost per result.
8. **Retention/delete policy** for user images.

## 4. Check-in-specific Gold Standard

A Check-in result should pass only if the image feels like a coherent photograph captured at the requested location, not a subject pasted onto a background.

Required gates:
- Identity preservation: PASS
- Face/body anatomy: PASS
- Lighting coherence: PASS
- Perspective and scale: PASS
- Ground/object contact: PASS
- Depth-of-field coherence: PASS
- Edge/cutout risk: LOW
- AI-look risk: LOW
- Output suitable for social use: PASS

If any core gate fails, the result must be `review` or `failed`, not silently accepted.

## 5. Recommended reference order

1. `Hoan_Doi_Nhan_Vat_Thuong_Hieu.zip`
2. `multishot-gpt-image-2.zip`
3. `Product_Poster_Concept_Creator_Full_Package.zip`
4. `phong-branded-photo.zip`
5. `uyen-linh-model.zip`
6. `social-photo-content-publisher.zip`
7. `videoviral-skill.zip`
8. `poster-san-pham-skill.zip`
9. utility Skills only when needed

## 6. Final classification

### Core for Check-in
- Hoan_Doi_Nhan_Vat_Thuong_Hieu
- multishot-gpt-image-2
- Product_Poster_Concept_Creator_Full_Package
- phong-branded-photo

### Strong support
- uyen-linh-model
- social-photo-content-publisher
- videoviral-skill

### Secondary / utility
- poster-san-pham-skill
- chinh-sua-anh-skill
- xoa-nen-anh-skill
- tang-chat-luong-4k
- xoa-logo-anh-skill

### Asset library
- Kho-Am-Thanh-113-file

---

**Decision:** Do not code from any single sample. Build AIOS Lab’s own Skill Factory and Check-in implementation from the combined principles above.
