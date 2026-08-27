export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) {
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

  if (!user.value) {
    return navigateTo('/login')
  }
})