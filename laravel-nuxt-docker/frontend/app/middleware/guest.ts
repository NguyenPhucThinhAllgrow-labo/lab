export default defineNuxtRouteMiddleware(
  async () => {
    const {
      user,
      initialized,
      fetchUser,
    } = useAuth()

    if (!initialized.value) {
      await fetchUser()
    }

    // Đã login rồi
    if (user.value) {
      return navigateTo('/admin')
    }
  },
)