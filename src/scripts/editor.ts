// Temporary tuning editor. Builds a slider per tunable value, applies it live,
// and exports the current values as a ready-to-paste presets.ts patch.
//
// Three kinds of value, all edited the same way in the UI:
//   css    — drives a CSS custom property on :root (the mechanism
//            applyPresetStyles uses): glow, navbar, edge blur, vignette.
//   field  — mutates the active preset's `field` block; the force field reads
//            those fresh every frame, so it applies with no rebuild.
//   layout — mutates the active preset's `layout` block; these change the grid
//            slot geometry, so after recompute() the grid is rebuilt.
//
// Loaded only when ?editor is in the URL (see main.ts), so it's out of the way
// for real visitors.
import { PRESET, PRESET_NAME } from './presets';
import { recompute } from './constants';

type Kind = 'css' | 'field' | 'layout';

interface FieldDef {
  kind: Kind;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: '' | 'px' | '%';
  // Where this value lives in the preset object, used for export AND, for
  // field/layout kinds, as the live read/write target. e.g. "edges.vignette.edgeAlpha".
  path: string;
  // css only: the CSS custom property it drives.
  varName?: string;
}

interface Group {
  title: string;
  fields: FieldDef[];
}

const css = (varName: string, label: string, min: number, max: number, step: number, unit: '' | 'px' | '%', path: string): FieldDef =>
  ({ kind: 'css', varName, label, min, max, step, unit, path });
const fld = (path: string, label: string, min: number, max: number, step: number, unit: '' | 'px' | '%' = ''): FieldDef =>
  ({ kind: 'field', label, min, max, step, unit, path });
const lay = (path: string, label: string, min: number, max: number, step: number, unit: '' | 'px' | '%' = ''): FieldDef =>
  ({ kind: 'layout', label, min, max, step, unit, path });

const GROUPS: Group[] = [
  {
    title: 'Grid (rebuilds)',
    fields: [
      lay('layout.gridScale', 'Grid scale', 0.4, 2.5, 0.05),
      lay('layout.card', 'Card size', 80, 480, 5, 'px'),
      lay('layout.gap', 'Gap', 0, 240, 2, 'px'),
      lay('layout.radius', 'Corner radius', 0, 60, 1, 'px'),
      lay('layout.parallax', 'Parallax', 0, 1, 0.01),
    ],
  },
  {
    title: 'Force field',
    fields: [
      fld('field.radiusCells', 'Influence reach (cells)', 0.5, 4, 0.05),
      fld('field.scale', 'Puff scale', 0, 1, 0.01),
      fld('field.smooth', 'Ease (smooth)', 0.02, 1, 0.01),
      fld('field.morphStart', 'Reveal threshold', 0, 0.95, 0.01),
      fld('field.area', 'Reveal area (×)', 1, 4, 0.05),
      fld('field.grow', 'Reveal grow floor (×)', 1, 2.5, 0.05),
      fld('field.maxW', 'Max width (×)', 1, 4, 0.05),
      fld('field.maxH', 'Max height (×)', 1, 4, 0.05),
      fld('field.lift', 'Lift', 0, 60, 1, 'px'),
      fld('field.latchSpeed', 'Latch speed', 0.02, 1, 0.01),
      fld('field.latchMargin', 'Latch margin', 0, 60, 1, 'px'),
      fld('field.minGap', 'Min gap', 0, 80, 1, 'px'),
      fld('field.approachGap', 'Approach gap', 0, 120, 1, 'px'),
      fld('field.focusGap', 'Focus gap', 0, 160, 1, 'px'),
    ],
  },
  {
    title: 'Navbar',
    fields: [
      css('--nav-scale-desktop', 'Scale (Desktop)', 0.5, 3, 0.05, '', 'nav.scale'),
      css('--nav-scale-mobile', 'Scale (Mobile)', 0.5, 3, 0.05, '', 'nav.scaleMobile'),
    ],
  },
  {
    // Vignette + blur share one smooth, navbar-sized frame band. This slider
    // scales that band (1 = one navbar height in from every edge).
    title: 'Edge frame',
    fields: [
      css('--edge-band-scale', 'Frame band', 0.2, 4, 0.05, '', 'edges.band'),
      css('--edge-blur', 'Blur', 0, 40, 1, 'px', 'edges.blur'),
      css('--vig-a-edge', 'Vignette darkness', 0, 1, 0.01, '', 'edges.vignette.edgeAlpha'),
    ],
  },
  {
    title: 'Glow',
    fields: [
      css('--glow-layer-o', 'Layer opacity', 0, 1, 0.01, '', 'glow.layerOpacity'),
      css('--glow-r', 'Cursor radius', 0, 900, 5, 'px', 'glow.cursorRadius'),
      css('--glow-fade', 'Cursor fade', 0, 100, 1, '%', 'glow.cursorFade'),
      css('--glow-strength', 'Cursor strength', 0, 1, 0.01, '', 'glow.cursorStrength'),
      css('--card-r', 'Card radius', 0, 600, 5, 'px', 'glow.cardRadius'),
      css('--card-fade', 'Card fade', 0, 100, 1, '%', 'glow.cardFade'),
      css('--card-strength', 'Card strength', 0, 1, 0.01, '', 'glow.cardStrength'),
    ],
  },
];

// Read/write a dotted path on the active preset object.
function getPath(path: string): number {
  return path.split('.').reduce((o: any, k) => (o == null ? o : o[k]), PRESET as any);
}
function setPath(path: string, value: number) {
  const parts = path.split('.');
  let node: any = PRESET;
  for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
  node[parts[parts.length - 1]] = value;
}

function readCssVar(varName: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return parseFloat(raw) || 0;
}

// The current value shown on a slider: CSS kinds read the live :root value (so
// applyPresetStyles' rounding is reflected), field/layout read the preset.
function readCurrent(f: FieldDef): number {
  if (f.kind === 'css') return readCssVar(f.varName!);
  return getPath(f.path) ?? 0;
}

// Rebuild a nested object { edges: { vignette: { sizeX: 82, ... } } } from the
// flat path list, for the export.
function buildPatch(values: Record<string, { value: number; path: string }>): any {
  const out: any = {};
  for (const key of Object.keys(values)) {
    const { value, path } = values[key];
    const parts = path.split('.');
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = value;
  }
  return out;
}

export function initEditor({ relayout }: { relayout: () => void }) {
  const panel = document.getElementById('editor') as HTMLElement;
  const fieldsEl = document.getElementById('editor-fields') as HTMLElement;
  const out = document.getElementById('editor-out') as HTMLTextAreaElement;
  if (!panel || !fieldsEl) return;

  const root = document.documentElement;
  const state: Record<string, { value: number; path: string }> = {};

  for (const group of GROUPS) {
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = group.title;
    fieldsEl.appendChild(title);

    for (const f of group.fields) {
      const key = f.kind === 'css' ? f.varName! : f.path;
      const current = readCurrent(f);
      state[key] = { value: current, path: f.path };

      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = f.label;
      const val = document.createElement('span');
      val.className = 'val';
      val.textContent = String(current) + f.unit;
      label.append(name, val);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(f.min);
      input.max = String(f.max);
      input.step = String(f.step);
      input.value = String(current);

      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        state[key].value = v;
        val.textContent = v + f.unit;

        if (f.kind === 'css') {
          root.style.setProperty(f.varName!, v + f.unit);
        } else {
          setPath(f.path, v);
          recompute();
          // Layout edits move DOM slots, so the grid has to be rebuilt; field
          // edits are read live by the next force-field pass, so nothing to do.
          if (f.kind === 'layout') relayout();
        }
      });

      wrap.append(label, input);
      fieldsEl.appendChild(wrap);
    }
  }

  document.getElementById('editor-close')?.addEventListener('click', () => {
    panel.hidden = true;
  });

  document.getElementById('editor-reset')?.addEventListener('click', () => {
    location.reload();
  });

  document.getElementById('editor-export')?.addEventListener('click', () => {
    const patch = buildPatch(state);
    const json = JSON.stringify(patch, null, 2)
      .replace(/"([a-zA-Z0-9]+)":/g, '$1:'); // unquote keys for JS/TS
    out.value =
      `// Full snapshot of the '${PRESET_NAME}' preset's tunable values.\n` +
      `// Paste (or merge) into a preset in src/scripts/presets.ts.\n` +
      `// Note: touch variants (*Touch) are not edited here — keep or adjust\n` +
      `// them separately.\n` + json;
    out.hidden = false;
    out.select();
  });

  panel.hidden = false;
}
