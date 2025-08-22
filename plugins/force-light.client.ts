export default defineNuxtPlugin(() => {
  if (process.server) return
  const colorMode = useColorMode()
  // Force light mode immediately and keep it enforced
  colorMode.preference = 'light' as any
  colorMode.value = 'light' as any
  // Ensure root does not have dark class
  document.documentElement.classList.remove('dark')
})


