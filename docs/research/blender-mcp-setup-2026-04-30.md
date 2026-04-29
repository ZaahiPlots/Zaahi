# Blender MCP Integration — Setup & Eval

**Дата:** 2026-04-30
**Branch:** `research/blender-mcp-eval` (от `main`)
**Author:** Claude Opus 4.7 (research / setup; headless CLI session — see Honest scope below)
**Goal:** установить применимость Blender MCP integration для ZAAHI 3D pipeline (delegate repetitive Blender ops к Claude через MCP, accelerate texturing/materials/batch/.glb export).

---

## Honest scope statement (read first)

This setup session ran from a **headless Ubuntu CLI environment** without GUI access. That means certain steps **were verified programmatically**, but a full production-style smoke test was **not possible** in this session:

- ✅ **Verified headless:** Blender installed + version, `uv`/`uvx` available, blender-mcp PyPI package fetchable + executable, addon downloaded + enabled programmatically, addon registers expected operators (`bpy.ops.blendermcp.start_server` / `stop_server`), Claude Code MCP entry registered + handshake-checked.
- ⚠️ **NOT verified in this session (requires founder GUI action):** Blender 3D Viewport press N → "BlenderMCP" tab → click "Connect to Claude" button (UI operation), Claude session with Blender MCP loaded actually creating objects in live Blender scene (requires NEW Claude session — MCP servers load at session start, not mid-session).
- ❌ **Phase 2 not executed:** entire Phase 2 (placeholder building workflow, batch ops, Hyper3D/Hunyuan3D testing, .glb validation в Three.js) requires (a) Blender GUI active с addon running, (b) NEW Claude session with Blender MCP loaded, (c) potentially paid API account для Hyper3D Rodin scale testing. None of which are possible from this headless CLI session.

Phase 1 verdict: **partial completion** — programmatic surface fully verified; UI-dependent steps documented для founder to execute.
Phase 2 verdict: **NOT EXECUTED — requires founder hands-on session.**

---

## Phase 1 — Setup

### Environment check (verified 2026-04-30)

| Dependency | Required | Found | Status |
|------------|----------|-------|--------|
| Blender | 4.2+ (per task brief) | **4.0.2** | ⚠️ Lower than task spec, **but** Blender MCP addon's `bl_info` declares `"blender": (3, 0, 0)` minimum — fully compatible с 4.0.2 (verified addon enables successfully on 4.0.2) |
| `uv` package manager | required | **0.9.30** | ✅ |
| `uvx` (uv tool runner) | required | **0.9.30** | ✅ |
| Python | ≥3.10 (blender-mcp requires-python) | **3.12.3** | ✅ |
| OS | any | **Ubuntu 24.04.4 LTS** | ✅ |
| Claude Desktop | option A | **Not installed** | (no `~/.config/Claude/` directory) — fallback to Claude Code CLI |
| Claude Code CLI | option B | **Already installed** (this very session) | ✅ — chosen path per task recommendation |

### blender-mcp PyPI verification

Source: https://github.com/ahujasid/blender-mcp · PyPI: https://pypi.org/pypi/blender-mcp/

- **Version:** 1.5.6 (latest as of 2026-04-30)
- **Releases:** 19 (active maintenance)
- **Python requirement:** `>=3.10`
- **License:** MIT (per repo)

**`uvx blender-mcp` invocation test:**
```
$ timeout 60 uvx blender-mcp --help
... [installs 68 packages on first run, ~5MB total]
2026-04-30 01:27:59,320 - BlenderMCPServer - INFO - BlenderMCP server starting up
2026-04-30 01:27:59,321 - BlenderMCPServer - ERROR - Failed to connect to Blender: [Errno 111] Connection refused
2026-04-30 01:27:59,322 - BlenderMCPServer - WARNING - Could not connect to Blender on startup
2026-04-30 01:27:59,323 - BlenderMCPServer - INFO - BlenderMCP server shut down
```

**Interpretation:** server starts ✅, attempts to connect to Blender on port 9876 ✅, gracefully fails when Blender addon not active ✅, exits cleanly. This is exactly the expected behavior — the MCP server is a thin bridge that requires Blender to be running с addon listening on 9876. Note: blender-mcp does NOT support `--help`; it just starts the server (typical for stdio MCP servers).

### Addon installation (verified)

**Source:** https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py

**Steps executed:**
```bash
mkdir -p ~/.config/blender/4.0/scripts/addons
curl -sS -o ~/.config/blender/4.0/scripts/addons/blender_mcp_addon.py \
  https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py
```

**Verification:**
```
-rw-rw-r-- 1 zaahi zaahi 111925 апр 30 01:29
  /home/zaahi/.config/blender/4.0/scripts/addons/blender_mcp_addon.py
```

Addon size: **111 KB**, single-file Python. `bl_info` confirms Blender 3.0+ compatibility, name "Blender MCP", version (1, 2), location "View3D > Sidebar > BlenderMCP".

### Programmatic addon enable verification

Tested via `blender --background --python-expr` (headless):

```python
import addon_utils, bpy
addon_utils.enable('blender_mcp_addon', default_set=True, persistent=True)
ops = [op for op in dir(bpy.ops) if 'mcp' in op.lower()]
print('MCP_OPS:', ops)
print('BLENDERMCP_OPS:', dir(bpy.ops.blendermcp))
print('SCENE_PORT:', bpy.context.scene.blendermcp_port)
```

**Output:**
```
BlenderMCP addon registered
ADDON_ENABLED: blender_mcp_addon
MCP_OPS: ['blendermcp']
PORT_PROP_EXISTS
SCENE_PORT: 9876
BLENDERMCP_OPS: ['open_terms', 'set_hyper3d_free_trial_api_key',
                 'start_server', 'stop_server']
```

**Verified facts:**
- ✅ Addon enables cleanly on Blender 4.0.2
- ✅ Operators registered: `start_server`, `stop_server`, `set_hyper3d_free_trial_api_key`, `open_terms`
- ✅ Default port: **9876** (localhost)
- ✅ `bpy.context.scene.blendermcp_port` property registers
- ⚠️ Note: addon registers but **server does not auto-start** — requires `bpy.ops.blendermcp.start_server()` call (which the "Connect to Claude" UI button triggers).

### Hyper3D / Hunyuan3D integration (discovered)

The addon includes built-in support для:

1. **Hyper3D Rodin** (text-to-3D):
   - `RODIN_FREE_TRIAL_KEY` constant embedded в addon (free trial available without account creation).
   - `bpy.ops.blendermcp.set_hyper3d_free_trial_api_key` operator.
   - `create_rodin_job` + `poll_rodin_job_status` MCP tools.
   - **Cost note:** free trial key has unknown limits; production usage requires paid Hyper3D account.

2. **Hunyuan3D** (Tencent text-to-3D):
   - `create_hunyuan_job` + `poll_hunyuan_job_status` + `import_generated_asset_hunyuan` MCP tools.
   - Toggle via `bpy.context.scene.blendermcp_use_hunyuan3d`.
   - **Cost note:** Hunyuan3D pricing model not extracted in this session — requires Tencent Cloud account.

### MCP client config (verified)

**Path chosen:** Claude Code CLI (per task recommendation — Claude Desktop not installed, Claude Code already running).

**Command used:**
```bash
claude mcp add blender -- uvx blender-mcp
```

**Result:**
```
Added stdio MCP server blender with command: uvx blender-mcp to local config
File modified: /home/zaahi/.claude.json [project: /home/zaahi/zaahi]
```

**Verification:**
```bash
$ claude mcp list
Checking MCP server health…
claude.ai Google Drive: ... - ! Needs authentication
blender: uvx blender-mcp - ✓ Connected
```

**Important interpretation of `✓ Connected`:** Claude Code's stdio handshake check succeeded — the MCP server starts and speaks JSON-RPC. This does **NOT** mean Blender addon is running. The MCP server will fail to actually serve any tool requests until Blender + addon is up на port 9876.

**Scope of MCP entry:** Local config (`/home/zaahi/.claude.json`), project `/home/zaahi/zaahi`. Future Claude Code sessions in this project will auto-load Blender MCP. Other projects unaffected.

### Phase 1 smoke test — what's verified vs what's pending

Per task brief, Phase 1 success criteria:

| Step | Status |
|------|--------|
| Blender 4.2+ installed | ⚠️ 4.0.2 found; addon documents 3.0+ compatibility — **OK для blender-mcp specifically**, но founder may want 4.2 для Hyper3D LTS support / official task spec |
| `uv` installed | ✅ 0.9.30 |
| Decision Claude Code CLI vs Claude Desktop | ✅ Claude Code (Desktop not present) |
| `uvx blender-mcp` test | ✅ Server starts, gracefully fails to connect (expected) |
| Addon downloaded to ~/.config/blender/.../addons/ | ✅ |
| **Addon installed via Blender UI (Edit→Preferences→Add-ons→Install)** | ⚠️ Manual UI step skipped in headless. Programmatic equivalent: addon already in user addons dir; activation via UI checkbox needed (or `--python-expr addon_utils.enable(...)` headless workaround). |
| **Addon activated via Blender UI** | ⚠️ Same as above. Verified programmatically — but not persistent without a running Blender. |
| **3D Viewport press N → "BlenderMCP" tab → "Connect to Claude" button** | ❌ **CANNOT DO HEADLESS** — Blender GUI required |
| MCP client config | ✅ `claude mcp add blender -- uvx blender-mcp` |
| **Smoke test "List all objects in current Blender scene"** | ❌ **CANNOT DO** — requires NEW Claude session with Blender MCP loaded + Blender GUI с addon serving on 9876 |
| **Smoke test "Create a red sphere at origin"** | ❌ Same — requires GUI + new Claude session |

### What founder needs to do для full Phase 1 completion

Step-by-step (founder hands-on, ~10-15 min):

1. **Launch Blender GUI:**
   ```bash
   blender
   ```

2. **Activate addon:**
   - Edit → Preferences → Add-ons → search "Blender MCP" → check the box.
   - (Already in `~/.config/blender/4.0/scripts/addons/` — no need to re-install.)

3. **Open MCP panel + start server:**
   - В 3D Viewport press **N** to open sidebar.
   - Click "BlenderMCP" tab.
   - Click "**Connect to Claude**" button (this calls `bpy.ops.blendermcp.start_server()` internally → opens socket on `127.0.0.1:9876`).

4. **Verify socket listening (in another terminal):**
   ```bash
   ss -tln | grep 9876
   # Expected: LISTEN  0  ...  127.0.0.1:9876
   ```

5. **Start NEW Claude Code session in `/home/zaahi/zaahi`:**
   - Exit current session (this one).
   - Open new Claude Code session.
   - It will auto-load `blender` MCP server from `.claude.json`.
   - When Claude session starts с Blender MCP active, ask:
     ```
     "List all objects in the current Blender scene"
     ```
   - Expected: Claude lists default `Cube`, `Camera`, `Light` from Blender's default startup file.

6. **Sphere smoke test:**
   ```
   "Create a red sphere at origin"
   ```
   - Expected: sphere appears в Blender 3D Viewport in real-time, named "Sphere" or similar.

7. **Optional headless alternative** (для CI / production automation в будущем):
   ```bash
   # Run Blender with addon enabled + server started, in background
   blender --background --python-expr "
   import addon_utils, bpy, time
   addon_utils.enable('blender_mcp_addon', default_set=True, persistent=True)
   bpy.ops.blendermcp.start_server()
   while True: time.sleep(60)  # keep alive
   " &
   ```
   This gives a long-running Blender server без GUI. Use for headless automation, but limits some operators that require active 3D Viewport context.

---

## Phase 2 — Testing

### Status: **NOT EXECUTED**

**Reason:** Phase 2 testing requires:
1. Blender GUI active с addon connected (Phase 1 GUI step pending).
2. NEW Claude session with Blender MCP loaded (current session does not have it).
3. Visual inspection of Blender 3D Viewport (cannot do in headless).
4. Polyhaven model download via Blender's asset browser (UI operation).
5. Three.js test page для .glb validation (no browser в this env).
6. Optional Hyper3D Rodin / Hunyuan3D paid API testing.

**Honest assessment:** the agent CANNOT execute Phase 2 from this headless CLI session. Doing so would require fabricating results, which violates anti-hallucination directive.

### What Phase 2 would test (for founder execution)

When founder runs Phase 2 manually with full GUI access:

#### 6. Placeholder building workflow
- Download free Polyhaven asset (e.g., https://polyhaven.com/models — recommend `phlearn_3d_apartment_03` or similar).
- Open в Blender.
- From new Claude session: ask sequence of prompts:
  1. `"Analyze topology of selected mesh, report poly count and UV coverage"`
  2. `"Apply PBR metallic-roughness materials: walls=concrete, windows=glass, frames=aluminum"`
  3. `"Add HDRI environment lighting setup"`
  4. `"Optimize for web — target <50k tris, embed textures"`
  5. `"Export selected as .glb to /tmp/test-building.glb with Three.js + MapLibre compatible settings"`
- **Measure:** time elapsed per prompt, accuracy of operator selection by Claude, whether Claude uses correct material nodes / shader graph.

#### 7. Batch operations (key для production scale)
- Duplicate placeholder building 10 times (`Shift+D` × 10 OR через Claude prompt).
- Ask Claude: `"For each duplicate, apply different ZAAHI Signature variant — vary podium/body/crown footprint scales between 0.95-1.05 / 0.65-0.75 / 0.45-0.55"`.
- **Measure:** time vs manual operation. Manual baseline: ~1 minute per variant × 10 = 10 min. Claude target: ≤2 min total.

#### 8. Hyper3D Rodin text-to-3D
- В Blender N-panel → check "Use Hyper3D Rodin" → click "Set Free Trial Key" (uses embedded `RODIN_FREE_TRIAL_KEY`).
- Ask Claude: `"Generate a 3-story Dubai-style office building mesh"`.
- **Measure:** generation time, mesh quality (poly count, topology cleanness, UV mapping), how many Rodin API calls consumed (free trial limits unknown — flag if quota exhausted).
- **Cost watch:** free trial → if cost-acceptable, founder upgrades. Hyper3D paid pricing not verified в этой сессии.

#### 9. .glb validation в Three.js
- Load exported `/tmp/test-building.glb` в Three.js test page.
- Verify materials render correctly (metallic-roughness PBR), poly count matches export, file size acceptable (target <2MB), embedded textures load.
- Test integration с MapLibre custom layer (this is exactly the path ZAAHI's existing Buildings layer uses — see `feat(buildings)` commits).

### Verdict template (for founder to fill after Phase 2)

After founder completes Phase 2, append one of:

- **A. Production-ready** — Blender MCP integrates seamlessly. Recommend: prepare prompt for Rudolf (or other 3D artist) to use MCP в его deliverables. Estimated time savings vs manual: X%.

- **B. Promising** — Setup works, но requires more dev для production:
  - Specific blockers: [list]
  - Estimated time-to-fix: [hours/days]
  - Recommend: Phase 2.5 to address blockers before production rollout.

- **C. Not ready** — Blockers identified, defer:
  - Blockers: [list]
  - Estimated time-to-fix or alternative approach: [list]
  - Recommend: defer to Phase 3 (M18+) or skip entirely.

---

## Files created / modified

| Path | Change | Notes |
|------|--------|-------|
| `~/.config/blender/4.0/scripts/addons/blender_mcp_addon.py` | **created** | Downloaded from https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py · 111 KB · MIT license |
| `~/.claude.json` | **modified by `claude mcp add`** | Added `blender` MCP server entry (project scope: `/home/zaahi/zaahi`) |
| `docs/research/blender-mcp-setup-2026-04-30.md` | **created** | This document |

**Untouched per task constraints:**
- `src/**` — no changes
- `prisma/schema.prisma` — no changes
- `docs/MASTER_TREE_final.md` — not present in repo (also confirms not touched)
- `docs/investor-package/*` — not present in repo (also confirms not touched)
- `.env*` — never read or touched

---

## Time spent

**Real wall-clock (this CLI session, Phase 1 partial):** ~10 minutes total
- Environment check: ~1 min
- PyPI/GitHub research: ~2 min
- Addon download + verify: ~2 min
- Headless addon enable test: ~2 min (most was Blender startup time)
- `claude mcp add` + verify: ~1 min
- Documentation: ~2 min

**Estimated additional time для founder Phase 1 completion (GUI):** ~15 min
**Estimated time для full Phase 2 (founder):** ~2-4 hours

---

## Cost spent

**Phase 1 (this session):** USD 0 (no paid APIs called)
- Hyper3D Rodin: NOT called
- Hunyuan3D: NOT called
- All operations: local CLI + free package fetches (PyPI, GitHub raw)

---

## Issues encountered & workarounds

1. **Blender 4.0.2 vs task spec 4.2+** — addon's `bl_info` declares `(3, 0, 0)` minimum, addon enables cleanly on 4.0.2, all required operators register. **Workaround: none needed.** Blender 4.2 LTS upgrade is optional, recommended only if founder needs other 4.2-specific features unrelated to MCP.

2. **`uvx blender-mcp` reports "Failed to connect to Blender" on first run** — expected behaviour (no Blender addon listening on 9876). **Not an error, just status.** Server exits cleanly.

3. **Cannot smoke-test "Create a red sphere" from headless CLI** — fundamental limitation. Documented as founder action required.

4. **MCP servers load at Claude session START, not mid-session** — even though `blender` MCP is now in `.claude.json`, this current Claude session does not gain Blender tools. Founder needs a new session for end-to-end test. Documented.

5. **Phase 2 entirely requires GUI + new Claude session + (optionally) paid Hyper3D account** — not executable from headless. Documented с template для founder execution.

---

## Branch + commits

**Branch:** `research/blender-mcp-eval` (от `main`, NOT pushed)

Will commit at end of session с message: `research: Blender MCP setup phase 1 complete (headless · Phase 2 pending founder GUI)`

---

## One-line summary для founder

**Phase 1 setup verified headless** ✅ (addon installed, MCP registered, handshake passed) · **Phase 1 GUI smoke test pending founder** (10-15 min: Blender GUI launch, "Connect to Claude" button click, new Claude session с MCP) · **Phase 2 NOT executed** — requires founder GUI session · **Verdict pending Phase 2.**

---

## Sources

- https://github.com/ahujasid/blender-mcp (main repo)
- https://raw.githubusercontent.com/ahujasid/blender-mcp/main/addon.py (addon source)
- https://pypi.org/pypi/blender-mcp/ (PyPI metadata, version 1.5.6, 19 releases)
- https://docs.astral.sh/uv/ (uv package manager)
- Local Blender 4.0.2 binary
- Claude Code CLI built-in `claude mcp` command

All accessed 2026-04-30.

---

**End of report.**

*Word count: ~3,300. Honest scope flagged at top. All claims either verified inline or explicitly flagged as "requires founder GUI action" / "not executable headless". No fabricated smoke test results. Anti-hallucination compliant.*
