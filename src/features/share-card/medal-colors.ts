// ImageResponse cannot resolve CSS variables; mirror the medal tokens.
const shared = {
  'white': '#ffffff',
  'disc': '#0a0b0c',
  'disc-edge': '#050505',
  'ground': '#000000',
  'locked-dark': '#0c0d0e',
  'locked-hi': '#45484c',
  'locked-gem': '#111111',
  'locked-lock': '#55595e',
  'locked-s0': '#3a3d40',
  'locked-s1': '#2a2c2f',
  'locked-s2': '#1b1c1e',
  'locked-s3': '#0e0f10',
  'locked-s4': '#232527',
  'locked-s5': '#34373a',
};

export const medalColors = [
  { ...shared, s0: '#f1f3f5', s1: '#a3a9b0', s2: '#5d636a', s3: '#2c3035', s4: '#8e959c', s5: '#d9dde1' },
  { ...shared, s0: '#ffe2c6', s1: '#e09a63', s2: '#9a5527', s3: '#4a220b', s4: '#c47a42', s5: '#ffd0a6' },
  { ...shared, s0: '#ffffff', s1: '#d7dde3', s2: '#8f9aa5', s3: '#3e4650', s4: '#b9c3cc', s5: '#f4f7fa' },
  { ...shared, s0: '#fffbe0', s1: '#ffd96b', s2: '#d39b26', s3: '#6e4708', s4: '#e8b23e', s5: '#fff0b0' },
  { ...shared, s0: '#ffffff', s1: '#d9fff5', s2: '#8fd9c7', s3: '#2f6e62', s4: '#b5ecdf', s5: '#f0fffb' },
  { ...shared, s0: '#ffffff', s1: '#cfe3ff', s2: '#7aa8ff', s3: '#1f3f99', s4: '#a9c8ff', s5: '#eef5ff' },
  { ...shared, s0: '#fffbe6', s1: '#f4ffb8', s2: '#b6e94f', s3: '#40600a', s4: '#e6c65a', s5: '#fff3c4', gem: '#d8ff86' },
] as const;
