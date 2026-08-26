export default defineNuxtRouteMiddleware(
  async () => {
    const {
      user,
      initialized,
      fetchUser,
    } = useAuth()

    // Chưa kiểm tra session
    if (!initialized.value) {
      await fetchUser()
    }

    // Không đăng nhập
    if (!user.value) {
      return navigateTo('/login')
    }
  },
)