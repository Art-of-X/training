import { ref, onMounted } from 'vue'

const getRandomColorRGB = () => {
  const randomValue = () => Math.floor(Math.random() * 200) + 28; // Values between 28 and 227
  const randomMaxValue = () => Math.random() < 0.67 ? 255 : randomValue(); // 67% chance to be 255
  const randomMinValue = () => Math.random() < 0.67 ? 0 : randomValue(); // 67% chance to be 0

  let values = [randomMaxValue(), randomMaxValue(), randomValue()];
  if (values.filter(val => val === 255).length > 2) {
    values = [randomMaxValue(), randomValue(), randomValue()];
  }
  if (values.filter(val => val === 0).length > 2) {
    values = [randomMinValue(), randomValue(), randomValue()];
  }

  values.sort(() => Math.random() - 0.5);

  const color = { r: values[0], g: values[1], b: values[2] };

  // Ensure brightness is below a threshold
  while (getBrightnessRGB(color) > 200) {
    values = [randomValue(), randomValue(), randomValue()];
    values.sort(() => Math.random() - 0.5);
    color.r = values[0];
    color.g = values[1];
    color.b = values[2];
  }

  return color;
};

const getBrightnessRGB = ({ r, g, b }: { r: number, g: number, b: number }) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}


const generateColors = () => {
    let primaryColorRGB, secondaryColorRGB;
    do {
        primaryColorRGB = getRandomColorRGB();
        secondaryColorRGB = getRandomColorRGB();
    } while (Math.abs(getBrightnessRGB(primaryColorRGB) - getBrightnessRGB(secondaryColorRGB)) < 100);

    const primaryHSL = rgbToHsl(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    
    return {
        primary: primaryHSL,
        secondary: rgbToHsl(secondaryColorRGB.r, secondaryColorRGB.g, secondaryColorRGB.b)
    };
};

export function useDynamicColors() {
    const setColors = () => {
        if(typeof document === 'undefined') return;

        const { primary, secondary } = generateColors();

        const root = document.documentElement;
        
        // Main primary color
        root.style.setProperty('--color-primary-500', `${primary.h} ${primary.s}% ${primary.l}%`);

        // Generate shades
        root.style.setProperty('--color-primary-50', `${primary.h} ${primary.s}% ${Math.min(primary.l + 45, 95)}%`);
        root.style.setProperty('--color-primary-100', `${primary.h} ${primary.s}% ${Math.min(primary.l + 35, 95)}%`);
        root.style.setProperty('--color-primary-200', `${primary.h} ${primary.s}% ${Math.min(primary.l + 25, 95)}%`);
        root.style.setProperty('--color-primary-300', `${primary.h} ${primary.s}% ${Math.min(primary.l + 15, 95)}%`);
        root.style.setProperty('--color-primary-400', `${primary.h} ${primary.s}% ${Math.min(primary.l + 5, 95)}%`);
        root.style.setProperty('--color-primary-600', `${primary.h} ${primary.s}% ${Math.max(primary.l - 5, 5)}%`);
        root.style.setProperty('--color-primary-700', `${primary.h} ${primary.s}% ${Math.max(primary.l - 15, 5)}%`);
        root.style.setProperty('--color-primary-800', `${primary.h} ${primary.s}% ${Math.max(primary.l - 25, 5)}%`);
        root.style.setProperty('--color-primary-900', `${primary.h} ${primary.s}% ${Math.max(primary.l - 35, 5)}%`);
        root.style.setProperty('--color-primary-950', `${primary.h} ${primary.s}% ${Math.max(primary.l - 45, 5)}%`);
    }

    return { setColors, generateColors };
} 

export { generateColors };