'use strict';

const PALETTE = {
  '--paper': '#fffdf3',
  '--ink': '#33334d',
  '--ink-soft': '#5a5a72',
  '--sky': '#5ec6ff', '--sky-soft': '#e9f7ff', '--sky-bd': '#bfe9ff',
  '--sun': '#ffcf33', '--sun-soft': '#fff6d6', '--sun-bd': '#ffe79e',
  '--coral': '#ff6f61', '--coral-soft': '#ffe6e2', '--coral-bd': '#ffc7c0',
  '--mint': '#2fd0a6', '--mint-soft': '#dcfbf1', '--mint-bd': '#b7f3e3',
  '--grape': '#9b6bff', '--grape-soft': '#efe6ff', '--grape-bd': '#d9c8ff',
  '--amber': '#ff9f43',
};

// section type -> accent CSS var (drives the coloured section header + icon disc)
const SECTION_ACCENT = {
  objectives: '--coral',
  materials: '--sun',
  introduction: '--sky',
  explore: '--sky',
  explanation: '--grape',
  picture_equation: '--sky',
  picture_cards: '--sky',
  guided_practice: '--mint',
  assessment: '--amber',
  differentiation: '--grape',
  generic: '--ink',
};

function tokensCss() {
  const decls = Object.entries(PALETTE).map(([k, v]) => `${k}:${v}`).join(';');
  return `:root{${decls}}`;
}

module.exports = { tokensCss, SECTION_ACCENT, PALETTE };
