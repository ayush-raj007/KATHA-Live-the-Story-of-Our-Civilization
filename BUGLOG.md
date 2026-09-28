# Bug Log

QA pass over *Katha: Kaal Yatri*. Each entry lists the bug, where it was, the root cause, the fix, and how it was verified.

**Test commands:** `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (Vitest, 36 tests), `npm run test:e2e` (Playwright, 10 tests; uses the locally installed Chrome).

## Baseline (before fixes)

| Check | Result |
|---|---|
| Lint (oxlint) | 0 errors, 25 warnings |
| Type-check + build | passes; one 936 kB JS bundle (258 kB gzip) with a >500 kB chunk warning |
| Tests | none existed |

## Cycle 1

### Critical / gameplay-breaking

| # | Bug | Location | Root cause | Fix | Verified by |
|---|---|---|---|---|---|
| 1 | Quest soft-locked from a fresh game: step 0 ("Visit Somendra") could never complete, so no later step could advance | `store/useGameStore.ts` | Nothing ever advanced step 0 | New `talkToNpc` action; opening Somendra's dialogue completes step 0 | unit `completes step 0…`; e2e full playthrough |
| 2 | Winning Seal Match at step 4 skipped the cargo-decision step | `completeMiniGame` | Read a stale state snapshot after advancing, so it advanced twice | Quest progress computed from fresh state (`progressQuest`) | unit `advances exactly one step…` |
| 3 | Claiming the Kaal Shard (or sending cargo) out of order stuck the quest forever | `claimKaalShard`, `setCargoDecision` | Strict step-gating; the shard can only be claimed once | Steps whose goal is already met auto-complete when the quest reaches them (approved design) | unit `does not soft-lock…`, `counts goals achieved out of order…` |
| 4 | Closing a mini-game during its end-of-game delay left the whole game paused (player frozen) and still granted rewards | `TideDock.tsx`, `SealMatch.tsx` | Result `setTimeout`s were never cleared on unmount, then called `completeMiniGame` (sets `isPaused`) | Pending timeouts cleared on unmount | unit `does not report a result after being closed…` |
| 5 | Tide Dock could report its result twice (double rewards/penalties); extra launches after the last fleet also counted | `TideDock.tsx` | Game logic ran inside a React state updater (run twice in StrictMode) and had no finished guard | Logic moved to timer callbacks with refs and an `isFinished` guard | unit `reports exactly once…` |
| 6 | Bead Driller ignored the final tap when scoring (wrong stars/score) | `BeadDriller.tsx` | Score/depth refs only updated on render, so the finishing tap read stale values | Game state kept in refs updated synchronously | unit `counts the final tap…` |
| 7 | Clicking Marak in the world opened the cargo decision instead of his dialogue | `LothalIsometricWorld.tsx` | Ship click area (checked first) covers Marak | NPCs are hit-tested before the ship | e2e full playthrough |
| 8 | HUD covered the Map and Kaal Ghar headers at every size; "Knowledge Journal", "DIY Blueprints" and "Return to Lothal" were unclickable | `HUD.tsx`, `theme.css` | HUD is absolutely positioned; screens started at y=0 | HUD publishes its height as `--hud-height`; screens and overlays start below it | e2e layout tests (4 sizes) |

### Gameplay bugs

| # | Bug | Location | Root cause | Fix | Verified by |
|---|---|---|---|---|---|
| 9 | Star rules shown to players didn't match the scoring code | mini-games | Thresholds hard-coded differently from `minigames.json` | Scoring moved to `minigames/scoring.ts` and matches the displayed text (approved: text is the source of truth); Tide Dock now plays all 4 fleets | unit `scoring.test.ts` |
| 10 | Player walked 2× faster on 120 Hz screens | world game loop | Movement per frame, no delta time | Delta-time movement and companion follow; 3D spin also time-based | e2e `movement uses real time…` |
| 11 | Keys stuck after alt-tab (player kept walking) | world input | `keyup` lost on blur | Held keys released on `blur` / tab hidden / pause | e2e `…stops on blur…` |
| 12 | Player could walk and Urja drained behind open dialogues, bag, food card, cargo and DIY modals | App/store | Only mini-games and the toy viewer set `isPaused` | Counted overlay pause (`usePauseWhile`, `overlayCount`) | unit `does not drain Urja while an overlay…`; e2e `…pauses behind dialogs` |
| 13 | Opening the 3D toy from Kaal Ghar blanked the screen, and closing it jumped to Lothal | `openToyModal`/`closeToyModal` | Changed `activeScreen` | Toy viewer is an overlay; screen unchanged | unit + e2e playthrough |
| 14 | Sound toggle didn't mute mini-games, portal or 3D viewer | `utils/audio.ts` | Only some callers checked `soundEnabled` | Checked centrally in the sound module | unit `stays silent when sound is turned off…` |
| 15 | Seal Match (min 15 Urja) couldn't be entered below 20 Urja; retry also used 20 | store, `MiniGameModal` | Hard-coded 20 | Uses each game's `minUrjaToEnter` | unit `uses the per-game minimum Urja…` |
| 16 | Low-Urja slowdown/warning missing after reload | persist | Derived `isLowUrja` not saved or recomputed | Recomputed in `merge` on load | unit `re-derives the low-Urja flag…` |
| 17 | Fatal wrong answer (Urja → 0) not recorded as a failed attempt | `answerCheckpointQuestion` | Early return before recording | Recorded before Kaal Thakaan | unit |
| 18 | `resetGame` left journal, food card, overlay and Kaal Thakaan state behind | store | Hand-copied partial initial state | Single `createInitialProgress()` used for init and reset | unit `resetGame…` |
| 19 | Portal launched twice on touch (and on double-clicking Quick Spin); spin sound doubled | `SpinningTopPortal.tsx` | Both touch and mouse handlers fired; no launch guard; timeout never cleared | Pointer events, launch guard, timeout cleared on unmount | manual + e2e boot/playthrough |
| 20 | Holding Space auto-repeated Bead Driller taps / Tide Dock launches | mini-games | `e.repeat` not ignored | Auto-repeat ignored | unit `ignores auto-repeat…` |
| 21 | Bead Driller's green target zone didn't match the real hit window | `BeadDriller.tsx` | Zone drawn relative to the bead, hits measured on the whole track | Zone drawn in the needle's coordinate space | visual check |
| 22 | Click-to-move teleported the player (the code comment says "walk") | world | Position set directly | Walks toward the target at walk speed | e2e `click-to-move walks…` |

### UI / rendering

| # | Bug | Fix | Verified by |
|---|---|---|---|
| 23 | World canvas blurry on HiDPI screens | Backing store scaled by `devicePixelRatio` | screenshots |
| 24 | 320 px: HUD overflowed off-screen; Map side panel squeezed the map to nothing; Kaal Ghar tabs overflowed | Responsive rules at 1100/700/600 px; HUD wraps with icon-only buttons; Map stacks; fluid grids | e2e layout tests + screenshots |
| 25 | 768 px: quest tracker crushed into a narrow column; companion bubble covered "Spin Top & Enter" | Quest tracker gets its own row; scroll areas padded clear of the bubble | e2e layout tests |
| 26 | 4K: world stayed a small 760×560 box | Canvas fits the free area between HUD overlays and bottom controls | screenshots |
| 27 | Canvas used an invalid CSS variable colour (`var(--terracotta-dark)`) for the prompt bubble | Literal colour | code review |
| 28 | `bounce` and `fadeIn` animations referenced but never defined | Keyframes added | code review |
| 29 | Canvas clicks offset by the 4 px border | Border-aware click mapping | e2e NPC clicks |
| 30 | D-pad only moved a tiny step per tap; no hold-to-walk on touch | Press-and-hold D-pad (pointer events) | manual |

### 3D viewer

| # | Bug | Fix |
|---|---|---|
| 31 | Toggling auto-spin rebuilt the whole WebGL scene | Spin state read from a ref |
| 32 | GPU memory and WebGL context leaked on every open | Geometries/materials disposed, `forceContextLoss()` |
| 33 | Dragging didn't work on touch despite the on-screen hint | Pointer events, `touch-action: none` |
| 34 | Canvas didn't follow resizes | `ResizeObserver` |

## Optimizations (measured)

| Change | Before | After |
|---|---|---|
| World game loop: state in refs, no React render per frame, loop no longer restarted every frame (4× CPU throttle, walking) | 21–42 fps, 766–784 ms/s script, 94–95% main thread busy | ~115 fps, 180–190 ms/s script, ~60% busy |
| Lazy-load the 3D viewer (three.js) | 941 kB initial JS (260 kB gzip) | 406 kB initial JS (127 kB gzip); three.js loads on demand |
| Paving grid drawn as one path | 33 strokes/frame | 1 stroke/frame |

Tried and dropped: named three.js imports (no size change; the bundler already tree-shakes).

## Final state

| Check | Result |
|---|---|
| Lint | 0 errors, 0 warnings |
| Type-check + build | pass, no warnings |
| Unit tests | 36/36 pass |
| Browser tests | 10/10 pass (full quest playthrough, input/pause, spam & restarts, Kaal Thakaan, layout at 320/768/1080p/4K), no console errors or warnings |

Two consecutive full verification runs found no new failures.

## Known issues / not changed (design decisions)

- Answering a solved Knowledge Check again re-awards Gyaan/Urja (**intended**, per the product owner).
- Tide Dock's 2-star text says "3 ships with zero hull scrapes", which is impossible across 4 attempts; the code awards 2 stars for 3 docked ships. The text should be reworded.
- Mini-game intro for Tide Dock says "press and hold"; the game uses a single press.
- The 3-star victory screen announces a bonus collectible, but no item is granted.
- Any NPC barter (not only Marak's) completes the "barter with Marak" step.
- Mini-game timers keep running while the tab is hidden.
- The 3D viewer always shows the terracotta bull model, whichever toy is selected.
- Unused Vite template files remain (`src/App.css`, `src/index.css`, `src/assets/*`, `public/icons.svg`, template `README.md`).
