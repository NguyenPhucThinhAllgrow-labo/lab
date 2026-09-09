<script setup lang="ts">
import AdminDataTable from '~/components/admin/AdminDataTable.vue'
import AdminFilterBar from '~/components/admin/AdminFilterBar.vue'
import AdminPagination from '~/components/admin/AdminPagination.vue'
import type { AdminPagination as Pagination } from '~/types/admin/table'
import {
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
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
  per_page: 10,
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

    <section class="rounded-2xl border border-white/[0.06] bg-[#11111b]">
      <AdminFilterBar>
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

      </AdminFilterBar>
      <AdminDataTable
      title="Danh sách người dùng" :rows="users" :columns="['ID', 'Người dùng', 'Vai trò', 'Xác thực email', 'Ngày tạo']"
      :row-key="item => item.id" :loading="loading" :error="errorMessage" empty-text="Không tìm thấy người dùng" empty-description="Thử thay đổi từ khóa hoặc vai trò đang lọc." @retry="loadUsers(1)"
    >
      <template #row="{ row: item }">
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

      </template>
    </AdminDataTable>
      <AdminPagination v-if="!errorMessage" :pagination="pagination" :loading="loading" item-label="tài khoản" @page-change="changePage" />
    </section>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/users.css"></style>
