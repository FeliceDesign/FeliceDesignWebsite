// Temporary tuning editor. Builds a slider per styling CSS variable, writes it
// live onto :root (exactly the mechanism applyPresetStyles uses), and exports
// the current values as a ready-to-paste presets.ts patch.
//
// Loaded only when ?editor is in the URL (see main.ts), so it's out of the way
// for real visitors.

interface FieldDef {
  varName: string; // the CSS custom property it drives
  label: string;
  min: number;
  max: number;
  step: number;
  unit: '' | 'px' | '%';
  // Where this value lives in the preset object, so export can reconstruct it.
  path: string; // e.g. "edges.vignette.sizeX"
}

interface Group {
  title: string;
  fields: FieldDef[];
}

// Mirrors the values applyPresetStyles() pushes onto :root (see presets.ts).
const GROUPS: Group[] = [
  {
    title: 'Navbar',
    fields: [
      { varName: '--nav-scale-desktop', label: 'Scale (Desktop)', min: 0.5, max: 3, step: 0.05, unit: '', path: 'nav.scale' },
      { varName: '--nav-scale-mobile', label: 'Scale (Mobile)', min: 0.5, max: 3, step: 0.05, unit: '', path: 'nav.scaleMobile' },
    ],
  },
  {
    title: 'Edge Blur',
    fields: [
      { varName: '--edge-blur', label: 'Blur', min: 0, max: 40, step: 1, unit: 'px', path: 'edges.blur' },
      { varName: '--bm-clear', label: 'Mask clear', min: 0, max: 100, step: 1, unit: '%', path: 'edges.blurMask.clear' },
      { varName: '--bm-mid', label: 'Mask mid', min: 0, max: 100, step: 1, unit: '%', path: 'edges.blurMask.mid' },
      { varName: '--bm-a', label: 'Mask mid alpha', min: 0, max: 1, step: 0.01, unit: '', path: 'edges.blurMask.midAlpha' },
      { varName: '--bm-solid', label: 'Mask solid', min: 0, max: 100, step: 1, unit: '%', path: 'edges.blurMask.solid' },
    ],
  },
  {
    title: 'Vignette',
    fields: [
      { varName: '--vig-x', label: 'Size X', min: 40, max: 100, step: 1, unit: '%', path: 'edges.vignette.sizeX' },
      { varName: '--vig-y', label: 'Size Y', min: 40, max: 100, step: 1, unit: '%', path: 'edges.vignette.sizeY' },
      { varName: '--vig-clear', label: 'Clear', min: 0, max: 100, step: 1, unit: '%', path: 'edges.vignette.clear' },
      { varName: '--vig-mid', label: 'Mid', min: 0, max: 100, step: 1, unit: '%', path: 'edges.vignette.mid' },
      { varName: '--vig-dark', label: 'Dark', min: 0, max: 100, step: 1, unit: '%', path: 'edges.vignette.dark' },
      { varName: '--vig-a-mid', label: 'Mid alpha', min: 0, max: 1, step: 0.01, unit: '', path: 'edges.vignette.midAlpha' },
      { varName: '--vig-a-dark', label: 'Dark alpha', min: 0, max: 1, step: 0.01, unit: '', path: 'edges.vignette.darkAlpha' },
      { varName: '--vig-a-edge', label: 'Edge alpha', min: 0, max: 1, step: 0.01, unit: '', path: 'edges.vignette.edgeAlpha' },
    ],
  },
  {
    title: 'Glow',
    fields: [
      { varName: '--glow-layer-o', label: 'Layer opacity', min: 0, max: 1, step: 0.01, unit: '', path: 'glow.layerOpacity' },
      { varName: '--glow-r', label: 'Cursor radius', min: 0, max: 900, step: 5, unit: 'px', path: 'glow.cursorRadius' },
      { varName: '--glow-strength', label: 'Cursor strength', min: 0, max: 1, step: 0.01, unit: '', path: 'glow.cursorStrength' },
      { varName: '--card-r', label: 'Card radius', min: 0, max: 600, step: 5, unit: 'px', path: 'glow.cardRadius' },
      { varName: '--card-strength', label: 'Card strength', min: 0, max: 1, step: 0.01, unit: '', path: 'glow.cardStrength' },
    ],
  },
];

function readCurrent(varName: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return parseFloat(raw) || 0;
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

export function initEditor() {
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
      const current = readCurrent(f.varName);
      state[f.varName] = { value: current, path: f.path };

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
        state[f.varName].value = v;
        root.style.setProperty(f.varName, v + f.unit);
        val.textContent = v + f.unit;
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
      '// Paste into a preset in src/scripts/presets.ts:\n' + json;
    out.hidden = false;
    out.select();
  });

  panel.hidden = false;
}
