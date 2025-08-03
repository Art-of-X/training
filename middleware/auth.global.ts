// middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const client = useSupabaseClient();

  // On initial load, the user object might not be populated yet.
  // We need to properly wait for the session to be restored.
  if (process.client && !user.value) {
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      // Session exists. Wait longer for the user object to populate
      // and use a more robust waiting mechanism
      let retries = 0;
      const maxRetries = 20; // 2 seconds max wait
      
      while (!user.value && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
    }
  }

  // If at root, redirect to login
  if (to.path === '/') {
    return navigateTo('/login')
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/confirm', '/password-reset', '/legal', '/hfbk']
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => to.path.startsWith(route))
  
  // Re-check user after waiting
  const currentUser = useSupabaseUser();

  // If user is not authenticated and trying to access protected route
  if (!currentUser.value && !isPublicRoute) {
    return navigateTo('/login')
  }
  
  // If user is authenticated and trying to access auth pages, redirect to training
  if (currentUser.value && (to.path === '/login' || to.path === '/register')) {
    return navigateTo('/training/dashboard')
  }
}) 