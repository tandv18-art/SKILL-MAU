# AIOS LAB — CODEX_READING_ORDER

Version: 1.0  
Goal: Tell Codex exactly what to read, in what order, what to learn, what not to copy, and when to stop.

## Phase 0 — Read strategy first

Before reading sample Skills, read the AIOS Lab business/product plan and implementation pack.

### Read first
1. `KE_HOACH_AIOS_LAB_SKILL_FUNNEL_TO_AI_PRODUCTS_V2(1).docx`
2. `AIOS_LAB_CHECKIN_CODEX_IMPLEMENTATION_PACK_V1/START_HERE_CODEX.md`
3. `README_CODEX_REFERENCE_POLICY.md`
4. `AIOS_LAB_CHECKIN_SKILL_SPEC.md`
5. `QA_STANDARD.md`
6. `PROMPT_FRAMEWORK.md`

### Extract these platform rules
- one AIOS Lab platform, many Skills/AI Tools
- shared Skill Runtime
- provider gateway, no hard-coded provider/model/credential
- credit/quota controls
- analytics from first release
- image/video Skill cost caps
- no auto-publish in early phases
- each Skill must have acceptance tests and cost guards
- user-image consent, access control, retention/delete policy
- billable operations must be idempotent

Do not code yet.

---

## Phase 1 — Identity and reference consistency

### 1. Read `Hoan_Doi_Nhan_Vat_Thuong_Hieu.zip`
Read:
- `SKILL.md`
- `agents/openai.yaml`
- inspect reference asset only to understand structure

Learn:
- identity lock
- outfit lock
- per-reference visual analysis
- camera/framing/pose/environment/light analysis
- one reference → one isolated generation flow

Do NOT copy:
- brand character
- brand clothing
- proprietary wording
- brand name
- any fixed visual identity

AIOS Lab adaptation:
- generalized `identity_reference`
- `preserve_identity = true`
- provider-neutral identity lock contract
- integration QA after generation

---

### 2. Read `multishot-gpt-image-2.zip`
Read:
- `SKILL.md`
- `agents/openai.yaml`

Learn:
- persistent face/outfit consistency across multiple images
- shot-to-shot consistency
- explicit locks for hair, outfit, props, scene, text/logo, lighting and motion direction

Do NOT copy:
- provider-specific assumptions as permanent architecture
- fixed shot counts as platform rules

AIOS Lab adaptation:
- identity drift scoring
- consistent repeated outputs
- optional multi-shot check-in packs later

---

## Phase 2 — Art direction and physical coherence

### 3. Read `Product_Poster_Concept_Creator_Full_Package.zip`
Read in this order:
1. `SKILL.md`
2. `references/art-direction-analysis.md`
3. `references/style-catalog.md`
4. `references/reference-grammar-library.md`
5. inspect a representative subset of style-reference images

Learn:
- source-of-truth lock
- analyze before generate
- camera/lens/depth/light/shadow/palette/negative-space grammar
- abstract reference learning rather than copying brands

Do NOT copy:
- brand assets
- poster text
- proprietary layouts
- model/person identities
- product-specific visual style as Check-in default

AIOS Lab adaptation:
- use art-direction analysis for environment integration
- prioritize believable photography over poster aesthetics
- add `physical_coherence_score`

---

### 4. Read `phong-branded-photo.zip`
Read:
- `SKILL.md`
- `scripts/branded_overlay.py`

Learn:
- deterministic text overlay
- safe areas
- social output dimensions
- separate image generation from typography

Do NOT copy:
- badge
- brand URL
- brand colors
- brand layout
- font files/branding identity

AIOS Lab adaptation:
- generic social-safe overlay module
- optional disclosure badge such as “AI / Virtual Check-in” when required

---

## Phase 3 — Brand system and delivery discipline

### 5. Read `uyen-linh-model.zip`
Read:
- `SKILL.md`
- `references/brand-kit.md`
- `references/output-playbook.md`

Learn:
- separating brand rules from output rules
- task routing
- visual QA before delivery

Do NOT copy:
- brand identity
- signature layout
- proprietary style

AIOS Lab adaptation:
- reusable per-user/per-business brand profile later

---

### 6. Read `social-photo-content-publisher.zip`
Read:
- `SKILL.md`
- `references/intake.md`
- `scripts/overlay_text.py`

Learn:
- media permission/intake
- use real user imagery when appropriate
- mobile readability
- do not fabricate metrics/experience
- generation and publishing should remain separate

AIOS Lab adaptation:
- consent metadata
- publish/export as a later module, not in Check-in v1

---

### 7. Read `videoviral-skill.zip`
Read:
- `SKILL.md`
- `references/quality-gates.md`
- `references/real-media-policy.md`
- `references/text-safety.md`

Learn:
- explicit phase gates
- quality gates before final output
- verification before delivery
- real-media integrity

Do NOT copy:
- provider-specific video tool assumptions
- fixed golden style
- hard-coded voice/model rules

AIOS Lab adaptation:
- generic QA Gate interface usable by Image and Video Skills

---

### 8. Read `poster-san-pham-skill.zip`
Use only as cross-check against the larger product-poster package.
Do not treat it as a separate architecture source.

---

## Phase 4 — Utility Skills only if required

Read these only after the Check-in architecture is approved:
- `chinh-sua-anh-skill.zip`
- `xoa-nen-anh-skill.zip`
- `tang-chat-luong-4k.zip`
- `xoa-logo-anh-skill.zip`

Purpose:
- enhancement
- segmentation
- upscaling
- local repair utilities

Important:
`xoa-nen-anh` must **not** become the default Check-in implementation. A realistic Check-in must be scene-coherent generation/editing, not “cut subject → paste on landmark background”.

---

## Phase 5 — Files to ignore during initial Check-in build

Do not load into the initial reasoning context unless needed:
- `Kho-Am-Thanh-113-file.zip`
- all MP3/SFX assets
- unrelated legacy materials

Reason: they add context noise and do not improve Check-in realism.

---

# Required Codex output after reading

After completing the reading order, Codex must create or update:

1. `REFERENCE_AUDIT.md`
2. `CHECKIN_ARCHITECTURE_PROPOSAL.md`
3. `CHECKIN_QA_GATES.md`
4. `CHECKIN_PROVIDER_CAPABILITY_MATRIX.md`
5. `CHECKIN_ACCEPTANCE_TEST_PLAN.md`

## `CHECKIN_ARCHITECTURE_PROPOSAL.md` must cover
- input contract
- identity reference handling
- scene/location specification
- provider adapter interface
- generation/edit strategy
- QA pipeline
- repair/regeneration loop
- storage/retention
- credit/cost guard
- analytics events
- failure states

## `CHECKIN_QA_GATES.md` must include
- identity preservation
- anatomy
- lighting match
- perspective/scale
- ground/object contact
- edge halo / cutout risk
- depth-of-field coherence
- texture/material coherence
- AI-look risk
- social-readiness

## `CHECKIN_PROVIDER_CAPABILITY_MATRIX.md`
Do not hard-code one model. Compare providers by capability:
- identity/reference fidelity
- image edit support
- multi-reference support
- realism
- speed
- cost
- API availability
- batch support
- safety constraints

## `CHECKIN_ACCEPTANCE_TEST_PLAN.md`
Minimum tests:
1. one person → three locations
2. three people → same location
3. close portrait input
4. half-body input
5. full-body input
6. low-light input
7. conflicting light direction
8. difficult hair edges
9. indoor scene
10. outdoor landmark
11. seated pose
12. failed QA → repair/regenerate

PASS only when:
- identity is stable
- no obvious cutout/composite look
- lighting/perspective/contact are coherent
- AI-look risk is low
- no major anatomy errors

---

# Stop condition

After producing the five documents above:

**STOP. DO NOT IMPLEMENT THE SKILL YET.**

Wait for review and approval before coding.

---

# One-line Codex command

> Read the AIOS Lab strategy and implementation pack first, then follow `CODEX_READING_ORDER.md` exactly. Inspect the listed reference Skills read-only, learn abstract architecture/QA concepts without copying proprietary prompts, names, assets or visual styles. Produce the required five design/audit documents and stop before implementation.
