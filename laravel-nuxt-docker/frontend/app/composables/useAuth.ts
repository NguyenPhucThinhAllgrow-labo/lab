interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

interface LoginResponse {
  message: string
  user: User
}

interface UserResponse {
  user: User
}

interface LogoutResponse {
  message: string
}

export const useAuth = () => {
  const api = useApi()

  const user = useState<User | null>(
    'auth-user',
    () => null,
  )

  const initialized = useState<boolean>(
    'auth-initialized',
    () => false,
  )

  /**
   * Lấy CSRF cookie từ Laravel
   */
  const csrf = async () => {
    await api('/sanctum/csrf-cookie')
  }

  /**
   * Login
   */
  const login = async (
    email: string,
    password: string,
  ) => {
    // Lấy CSRF cookie trước
    await csrf()

    const response = await api<LoginResponse>(
      '/api/login',
      {
        method: 'POST',

        body: {
          email,
          password,
        },
      },
    )

    user.value = response.user

    return response
  }

  const adminLogin = async (
    email: string,
    password: string,
  ) => {
    await csrf()

    const response = await api<LoginResponse>(
      '/api/admin/login',
      {
        method: 'POST',
        body: {
          email,
          password,
        },
      },
    )

    user.value = response.user

    return response
  }

  const register = async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    await csrf()

    const response = await api<LoginResponse>('/api/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      },
    })

    user.value = response.user

    return response
  }

  /**
   * Lấy user hiện tại
   */
  const fetchUser = async () => {
    try {
      const response = await api<UserResponse>(
        '/api/user',
      )

      user.value = response.user

      return response.user
    } catch {
      user.value = null

      return null
    } finally {
      initialized.value = true
    }
  }

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await api<LogoutResponse>(
        '/api/logout',
        {
          method: 'POST',
        },
      )
    } finally {
      user.value = null
    }
  }

  return {
    user,
    initialized,

    login,
    register,
    adminLogin,
    fetchUser,
    logout,
  }
}
