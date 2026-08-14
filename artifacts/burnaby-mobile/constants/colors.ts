/**
 * Design tokens synced from the Burnaby web app (burnaby-app/src/index.css).
 * Sky-blue palette — bright primary, light lavender secondary, warm yellow accent.
 */
const colors = {
  light: {
    // Legacy aliases
    text: '#1c2a4a',
    tint: '#1a8ef1',

    // Core surfaces
    background: '#f0f5fc',
    foreground: '#1c2a4a',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#1c2a4a',

    // Primary — bright sky blue
    primary: '#1a8ef1',
    primaryForeground: '#ffffff',

    // Secondary — light lavender
    secondary: '#e8e3f7',
    secondaryForeground: '#6543af',

    // Muted — soft blue-gray
    muted: '#e2eaf5',
    mutedForeground: '#6d7d9c',

    // Accent — warm yellow
    accent: '#fff2cc',
    accentForeground: '#935f00',

    // Destructive — red
    destructive: '#e83535',
    destructiveForeground: '#ffffff',

    // Borders and inputs
    border: '#cad4e6',
    input: '#d6e0ef',

    // Status semantic colors
    success: '#16a34a',
    successBg: '#dcfce7',
    warning: '#d97706',
    warningBg: '#fef3c7',
    info: '#1a8ef1',
    infoBg: '#dbeafe',
  },

  // Border radius in px — matches --radius: 0.875rem (14px) in web app
  radius: 14,
};

export default colors;
