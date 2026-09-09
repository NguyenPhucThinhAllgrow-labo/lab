export default defineNuxtRouteMiddleware(
  async (to) => {
    const {
      user,
      initialized,
      fetchUser,
    } = useAuth()

    if (!initialized.value) {
      await fetchUser()
    }

    if (to.path.startsWith('/admin') && user.value?.role === 'admin') {
      return navigateTo('/admin')
    }

    if (to.path === '/login' && user.value?.role === 'user') {
      return navigateTo('/games/pandora/detective')
    }
  },
)
