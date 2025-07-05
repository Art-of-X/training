import { useDynamicColors } from '~/composables/useDynamicColors'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.server) {
    return
  }

  const { setColors } = useDynamicColors()

  const updateFavicon = () => {
    const rootStyle = getComputedStyle(document.documentElement)
    const primaryColorHSL = rootStyle.getPropertyValue('--color-primary-500').trim()

    if (!primaryColorHSL) {
      // Color not set yet, try again shortly
      setTimeout(updateFavicon, 50)
      return
    }

    const primaryColor = `hsl(${primaryColorHSL})`
    const randomRotation = Math.random() * 60 - 30 // -30 to 30 degrees

    // Calculate shadow color
    const [h, s, l] = primaryColorHSL.split(' ').map(val => parseFloat(val.replace('%', '')))
    const shadowLightness = Math.max(0, l - 15)
    const shadowColor = `hsl(${h}, ${s}%, ${shadowLightness}%)`

    const svgString = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${randomRotation} 32 32)">
          <path transform="translate(1.5 1.5)" d="M13.4,18.8 L18.8,13.4 L32,26.6 L45.2,13.4 L50.6,18.8 L37.4,32 L50.6,45.2 L45.2,50.6 L32,37.4 L18.8,50.6 L13.4,45.2 L26.6,32 Z" fill="${shadowColor}" opacity="0.6"/>
          <path d="M13.4,18.8 L18.8,13.4 L32,26.6 L45.2,13.4 L50.6,18.8 L37.4,32 L50.6,45.2 L45.2,50.6 L32,37.4 L18.8,50.6 L13.4,45.2 L26.6,32 Z" fill="${primaryColor}"/>
        </g>
      </svg>
    `.trim()

    const faviconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }

  const initFavicon = () => {
    setColors()
    updateFavicon()
  }

  nuxtApp.hook('app:mounted', initFavicon)
  nuxtApp.hook('page:finish', initFavicon)
}) 