# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # tsc && vite build
npm run preview    # Preview production build
```

No test runner is configured.

## Architecture

Single-page React 18 app (no backend, no router, no external UI libraries). All state lives in three React Contexts that wrap the entire app in [App.tsx](src/App.tsx):

| Context | File | Responsibility |
|---|---|---|
| `CreaturesContext` | [src/context/CreaturesContext.tsx](src/context/CreaturesContext.tsx) | All creature CRUD and mutations |
| `RollHistoryContext` | [src/context/RollHistoryContext.tsx](src/context/RollHistoryContext.tsx) | Roll history, max 10 entries (FIFO) |
| `ModalContext` | [src/context/ModalContext.tsx](src/context/ModalContext.tsx) | Modal open/close and multi-step flow state |

### Type System

All types are in [src/types/index.ts](src/types/index.ts). Key types:
- `Creature` — top-level record with parameters, armor, attacks, abilities
- `CreatureParameters` — four parameter groups: `main`, `additional`, `skillBases`, `defense`
- `Attack` — row with 8 fields for the attacks table
- `ArmorByPart` — armor values keyed by 6 body zones (defined in [src/constants/bodyParts.ts](src/constants/bodyParts.ts))
- `AbilitiesSlots` — fixed tuple of exactly 5 strings
- `RollSide` — `'attack' | 'defense'`

### Modal Flow

`ModalContext` uses a discriminated union for modal state with two flows:
1. **Parameter roll** (`parameterRoll`): two-step — `SideSelectionModal` → `AttackDefenseModal` → calculate & add to history
2. **ПЗ modifier** (`valueInput`): single-step — `ValueInputModal` → apply modifier

All modals use a base `Modal` component ([src/components/Modal/Modal.tsx](src/components/Modal/Modal.tsx)) with focus trap, ESC, and click-outside handling. Modals render as portals from App root.

### Roll Calculation

Logic in [src/utils/rollUtils.ts](src/utils/rollUtils.ts). `calculateRollResult(baseAttack, baseDefense, attackModifier, defenseModifier)`:
- `diff = (base + modifier)_attack - (base + modifier)_defense`
- Hit if `diff > 0`, miss otherwise
- Critical threshold tiers: 7–9 (light +3), 10–12 (medium +5), 13–14 (heavy +8), 15+ (lethal +10)

### Data & Constants

- Initial creatures defined in [src/constants/creatures.ts](src/constants/creatures.ts) — several creatures are commented out
- Parameter groups and their display metadata live in [src/constants/paramGroups.ts](src/constants/paramGroups.ts)
- ID generation and creature factory helpers in [src/utils/creatureUtils.ts](src/utils/creatureUtils.ts)

### Styling

Every component has a colocated `.module.css` file. No global CSS except [src/index.css](src/index.css). No CSS-in-JS.

### Path Alias

`@/` maps to `src/` (configured in both [tsconfig.json](tsconfig.json) and [vite.config.ts](vite.config.ts)).
