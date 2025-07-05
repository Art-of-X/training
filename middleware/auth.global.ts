// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // If at root, redirect to login
  if (to.path === '/') {
    return navigateTo('/login')
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/confirm', '/password-reset', '/legal']
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => to.path.startsWith(route))
  
  // If user is not authenticated and trying to access protected route
  if (!user.value && !isPublicRoute) {
    return navigateTo('/login')
  }
  
  // If user is authenticated and trying to access auth pages, redirect to training
  if (user.value && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/training/dashboard')
  }
}) 