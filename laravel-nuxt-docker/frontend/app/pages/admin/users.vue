<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-vue-next'

interface AdminUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  email_verified_at: string | null
  created_at: string | null
}

interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface UserListResponse {
  data: {
    users: AdminUser[]
    pagination: Pagination
  }
}

useHead({ title: 'Users | Admin' })

const api = useApi()
const users = ref<AdminUser[]>([])
const pagination = ref<Pagination>({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
  from: null,
  to: null,
})
const search = ref('')
const selectedRole = ref('')
const loading = ref(true)
const errorMessage = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
let requestSequence = 0

async function loadUsers(page = pagination.value.current_page) {
  const requestId = ++requestSequence
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await api<UserListResponse>('/api/admin/users', {
      query: {
        search: search.value.trim() || undefined,
        role: selectedRole.value || undefined,
        page,
        per_page: pagination.value.per_page,
      },
    })

    if (requestId !== requestSequence) return

    users.value = response.data.users
    pagination.value = response.data.pagination
  } catch (error: any) {
    if (requestId !== requestSequence) return
    errorMessage.value = error?.data?.message || 'Không thể tải danh sách người dùng.'
  } finally {
    if (requestId === requestSequence) loading.value = false
  }
}

function changePage(page: number) {
  if (page < 1 || page > pagination.value.last_page || loading.value) return
  void loadUsers(page)
}

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

watch([search, selectedRole], () => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    void loadUsers(1)
  }, 300)
})

onMounted(() => void loadUsers(1))

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <main class="admin-users-page">
    <header class="admin-users-header">
      <div>
        <div class="admin-users-eyebrow">
          <Users />
          USER MANAGEMENT
        </div>
        <h1>Danh sách người dùng</h1>
        <p>Quản lý và tra cứu các tài khoản đang có trong hệ thống.</p>
      </div>

      <button class="admin-users-refresh" type="button" :disabled="loading" @click="loadUsers()">
        <RefreshCw :class="{ 'is-spinning': loading }" />
        Làm mới
      </button>
    </header>

    <section class="admin-users-panel">
      <div class="admin-users-toolbar">
        <label class="admin-users-search">
          <Search />
          <input v-model="search" type="search" placeholder="Tìm theo tên hoặc email...">
        </label>

        <label class="admin-users-role-filter">
          <ShieldCheck />
          <select v-model="selectedRole">
            <option value="">Tất cả vai trò</option>
            <option value="user">Người chơi</option>
            <option value="admin">Quản trị viên</option>
          </select>
        </label>

        <span class="admin-users-total">{{ pagination.total }} tài khoản</span>
      </div>

      <div v-if="errorMessage" class="admin-users-state admin-users-state--error">
        <strong>{{ errorMessage }}</strong>
        <button type="button" @click="loadUsers(1)">Thử lại</button>
      </div>

      <div v-else-if="loading && !users.length" class="admin-users-loading">
        <i v-for="row in 8" :key="row"></i>
      </div>

      <div v-else-if="!users.length" class="admin-users-state">
        <UserRound />
        <strong>Không tìm thấy người dùng</strong>
        <span>Thử thay đổi từ khóa hoặc vai trò đang lọc.</span>
      </div>

      <div v-else class="admin-users-table-area">
        <div v-if="loading" class="admin-users-filter-loading">
          <RefreshCw />
          <span>Đang tải dữ liệu...</span>
        </div>

        <div class="admin-users-table-wrap" :class="{ 'is-loading': loading }">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Xác thực email</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in users" :key="item.id">
                <td class="admin-users-id">#{{ item.id }}</td>
                <td>
                  <div class="admin-user-identity">
                    <span>{{ item.name.slice(0, 1).toUpperCase() }}</span>
                    <div>
                      <strong>{{ item.name }}</strong>
                      <small>{{ item.email }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="admin-user-role" :class="`is-${item.role}`">
                    <ShieldCheck v-if="item.role === 'admin'" />
                    <UserRound v-else />
                    {{ item.role === 'admin' ? 'Admin' : 'User' }}
                  </span>
                </td>
                <td>
                  <span class="admin-user-verification" :class="{ 'is-verified': item.email_verified_at }">
                    <UserRoundCheck />
                    {{ item.email_verified_at ? 'Đã xác thực' : 'Chưa xác thực' }}
                  </span>
                </td>
                <td class="admin-users-date">{{ formatDate(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <footer v-if="pagination.total" class="admin-users-pagination">
        <span>
          Hiển thị {{ pagination.from }}–{{ pagination.to }} trong {{ pagination.total }} tài khoản
        </span>
        <div>
          <button type="button" :disabled="pagination.current_page <= 1 || loading" @click="changePage(pagination.current_page - 1)">
            <ChevronLeft />
          </button>
          <strong>{{ pagination.current_page }} / {{ pagination.last_page }}</strong>
          <button type="button" :disabled="pagination.current_page >= pagination.last_page || loading" @click="changePage(pagination.current_page + 1)">
            <ChevronRight />
          </button>
        </div>
      </footer>
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/users.css"></style>
