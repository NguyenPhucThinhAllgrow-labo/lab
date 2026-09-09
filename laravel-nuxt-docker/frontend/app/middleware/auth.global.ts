export default defineNuxtRouteMiddleware(async (to) => {
  const isAdminLogin = to.path === '/admin/login'
  const isUserLogin = to.path === '/login'
  const requiredRole = to.path.startsWith('/admin')
    ? 'admin'
    : to.path.startsWith('/games')
      ? 'user'
      : null

  if (!requiredRole && !isUserLogin) {
    return
  }

  const {
    user,
    initialized,
    fetchUser,
  } = useAuth()

  if (!initialized.value) {
    await fetchUser()
  }

  if (isAdminLogin) {
    if (user.value?.role === 'admin') {
      return navigateTo('/admin')
    }

    return
  }

  if (isUserLogin) {
    if (user.value?.role === 'user') {
      const redirect = typeof to.query.redirect === 'string'
        ? to.query.redirect
        : '/games/pandora/detective'

      return navigateTo(redirect)
    }

    return
  }

  if (user.value?.role !== requiredRole) {
    const loginPath = requiredRole === 'admin'
      ? '/admin/login'
      : '/login'

    return navigateTo({
      path: loginPath,
      query: {
        redirect: to.fullPath,
      },
    })
  }
})
