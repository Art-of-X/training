import { ref } from 'vue'

// Types
type RGB = { r: number; g: number; b: number }
type HSL = { h: number; s: number; l: number }

// Global RGB CSS strings for direct :style use (SSR-safe defaults)
export const primaryColor = ref<string>('rgb(100, 100, 100)')
export const secondaryColor = ref<string>('rgb(200, 200, 200)')

const rgbToCss = ({ r, g, b }: RGB) => `rgb(${r}, ${g}, ${b})`

const getRandomColorRGB = (): RGB => {
  const randomValue = () => Math.floor(Math.random() * 200) + 28 // 28-227
  const randomMaxValue = () => (Math.random() < 0.67 ? 255 : randomValue())
  const randomMinValue = () => (Math.random() < 0.67 ? 0 : randomValue())

  let values = [randomMaxValue(), randomMaxValue(), randomValue()]
  if (values.filter((val) => val === 255).length > 2) {
    values = [randomMaxValue(), randomValue(), randomValue()]
  }
  if (values.filter((val) => val === 0).length > 2) {
    values = [randomMinValue(), randomValue(), randomValue()]
  }

  values.sort(() => Math.random() - 0.5)

  const color: RGB = { r: values[0], g: values[1], b: values[2] }

  // Ensure brightness is below a threshold
  while (getBrightnessRGB(color) > 200) {
    values = [randomValue(), randomValue(), randomValue()]
    values.sort(() => Math.random() - 0.5)
    color.r = values[0]
    color.g = values[1]
    color.b = values[2]
  }

  return color
}

const getBrightnessRGB = ({ r, g, b }: RGB) => {
  return (r * 299 + g * 587 + b * 114) / 1000
}

// HSL conversion used internally to produce Tailwind-like shade variables
const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0,
    s,
    l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Expose a generator compatible with existing callers (returns HSL and RGB + CSS)
export const generateColors = (): {
  primary: HSL
  secondary: HSL
  primaryRGB: RGB
  secondaryRGB: RGB
  primaryCss: string
  secondaryCss: string
} => {
  let primaryRGB: RGB
  let secondaryRGB: RGB
  do {
    primaryRGB = getRandomColorRGB()
    secondaryRGB = getRandomColorRGB()
  } while (Math.abs(getBrightnessRGB(primaryRGB) - getBrightnessRGB(secondaryRGB)) < 100)

  const primary = rgbToHsl(primaryRGB.r, primaryRGB.g, primaryRGB.b)
  const secondary = rgbToHsl(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b)

  return {
    primary,
    secondary,
    primaryRGB,
    secondaryRGB,
    primaryCss: rgbToCss(primaryRGB),
    secondaryCss: rgbToCss(secondaryRGB),
  }
}

export function useDynamicColors() {
  const setColors = () => {
    const { primary, secondary, primaryCss, secondaryCss } = generateColors()

    // Update global RGB strings for direct :style usage
    primaryColor.value = primaryCss
    secondaryColor.value = secondaryCss

    // Update CSS variables for theme shades (client-only)
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Main primary color
    root.style.setProperty('--color-primary-500', `${primary.h} ${primary.s}% ${primary.l}%`)

    // Generate shades
    root.style.setProperty('--color-primary-50', `${primary.h} ${primary.s}% ${Math.min(primary.l + 45, 95)}%`)
    root.style.setProperty('--color-primary-100', `${primary.h} ${primary.s}% ${Math.min(primary.l + 35, 95)}%`)
    root.style.setProperty('--color-primary-200', `${primary.h} ${primary.s}% ${Math.min(primary.l + 25, 95)}%`)
    root.style.setProperty('--color-primary-300', `${primary.h} ${primary.s}% ${Math.min(primary.l + 15, 95)}%`)
    root.style.setProperty('--color-primary-400', `${primary.h} ${primary.s}% ${Math.min(primary.l + 5, 95)}%`)
    root.style.setProperty('--color-primary-600', `${primary.h} ${primary.s}% ${Math.max(primary.l - 5, 5)}%`)
    root.style.setProperty('--color-primary-700', `${primary.h} ${primary.s}% ${Math.max(primary.l - 15, 5)}%`)
    root.style.setProperty('--color-primary-800', `${primary.h} ${primary.s}% ${Math.max(primary.l - 25, 5)}%`)
    root.style.setProperty('--color-primary-900', `${primary.h} ${primary.s}% ${Math.max(primary.l - 35, 5)}%`)
    root.style.setProperty('--color-primary-950', `${primary.h} ${primary.s}% ${Math.max(primary.l - 45, 5)}%`)

    // Border variations using primary color
    root.style.setProperty('--color-border-primary', `${primary.h} ${primary.s}% ${primary.l}%`)
    root.style.setProperty('--color-border-primary-light', `${primary.h} ${primary.s}% ${Math.min(primary.l + 20, 95)}%`)
    root.style.setProperty('--color-border-primary-dark', `${primary.h} ${primary.s}% ${Math.max(primary.l - 20, 5)}%`)
    root.style.setProperty('--header-nav-color', primaryCss)
    root.style.setProperty('--header-nav-hover-color', secondaryCss)
    root.style.setProperty('--header-nav-active-color', secondaryCss)
    root.style.setProperty('--header-nav-active-bg', secondaryCss)

    // Dropdown item styles
    root.style.setProperty('--dropdown-item-color', secondaryCss)
    root.style.setProperty('--dropdown-item-hover-bg', secondaryCss)
    root.style.setProperty('--dropdown-item-hover-color', primaryCss)

    // Sidebar link styles
    root.style.setProperty('--sidebar-link-color', primaryCss)
    root.style.setProperty('--sidebar-link-hover-bg', primaryCss)
    root.style.setProperty('--sidebar-link-hover-color', secondaryCss)
    root.style.setProperty('--sidebar-link-active-bg', primaryCss)
    root.style.setProperty('--sidebar-link-active-color', secondaryCss)
  }

  return { setColors, primaryColor, secondaryColor, generateColors }
}
