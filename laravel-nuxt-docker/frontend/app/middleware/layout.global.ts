export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    setPageLayout('admin')
  } else {
    
  }
})