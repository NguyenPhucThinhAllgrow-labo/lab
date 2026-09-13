<script setup lang="ts">
import AdminDataTable from '~/components/admin/AdminDataTable.vue'
import AdminFilterBar from '~/components/admin/AdminFilterBar.vue'
import AdminPagination from '~/components/admin/AdminPagination.vue'
import type { AdminPagination as Pagination } from '~/types/admin/table'
import {
  Plus, Pencil, Trash2, X,
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
const { user: currentUser } = useAuth()
const dialog = ref<HTMLDialogElement | null>(null)
const mode = ref<'create' | 'edit' | 'delete'>('create')
const selectedUser = ref<AdminUser | null>(null)
const saving = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string[]>>({})
const form = reactive({ name: '', email: '', role: 'user' as 'admin' | 'user', password: '', password_confirmation: '' })
const dialogTitle = computed(() => ({ create: 'Thêm người dùng', edit: 'Sửa người dùng', delete: 'Xóa người dùng?' })[mode.value])
function openDialog(action: 'create' | 'edit' | 'delete', item: AdminUser | null = null) {
  mode.value = action
  selectedUser.value = item
  formError.value = ''
  fieldErrors.value = {}
  Object.assign(form, { name: item?.name || '', email: item?.email || '', role: item?.role || 'user', password: '', password_confirmation: '' })
  dialog.value?.showModal()
}
function closeDialog() {
  if (saving.value) return
  dialog.value?.close()
  form.password = form.password_confirmation = ''
}
async function submitUser() {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}
  try {
    const id = selectedUser.value?.id
    const response = await api<{ data?: AdminUser }>(`/api/admin/users${mode.value === 'create' ? '' : `/${id}`}`, {
      method: mode.value === 'delete' ? 'DELETE' : mode.value === 'create' ? 'POST' : 'PUT',
      ...(mode.value === 'delete' ? {} : { body: { ...form } }),
    })
    if (response.data && currentUser.value?.id === response.data.id) {
      currentUser.value = { id: response.data.id, name: response.data.name, email: response.data.email, role: response.data.role }
    }
    dialog.value?.close()
    form.password = form.password_confirmation = ''
    await loadUsers(mode.value === 'create' ? 1 : mode.value === 'delete' && users.value.length === 1 ? Math.max(1, pagination.value.current_page - 1) : pagination.value.current_page)
  } catch (error: any) {
    formError.value = error?.data?.message || 'Không thể lưu thay đổi. Vui lòng thử lại.'
    fieldErrors.value = error?.data?.errors || {}
  } finally { saving.value = false }
}
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

      <div class="admin-users-actions">
      <button class="admin-users-button is-primary" type="button" @click="openDialog('create')"><Plus :size="16" /> Thêm mới</button>
      <button class="admin-users-refresh" type="button" :disabled="loading" @click="loadUsers()">
        <RefreshCw :class="{ 'is-spinning': loading }" />
        Làm mới
      </button>
      </div>
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
      title="Danh sách người dùng" :rows="users" :columns="['ID', 'Người dùng', 'Vai trò', 'Xác thực email', 'Ngày tạo', 'Thao tác']"
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
                <td><div class="admin-users-actions">
                  <button class="admin-users-button is-icon" type="button" :aria-label="`Sửa ${item.name}`" title="Sửa người dùng" @click="openDialog('edit', item)"><Pencil :size="16" /></button>
                  <button class="admin-users-button is-icon is-danger" type="button" :disabled="item.id === currentUser?.id" :aria-label="`Xóa ${item.name}`" :title="item.id === currentUser?.id ? 'Không thể xóa tài khoản đang đăng nhập' : 'Xóa người dùng'" @click="openDialog('delete', item)"><Trash2 :size="16" /></button>
                </div></td>

      </template>
    </AdminDataTable>
      <AdminPagination v-if="!errorMessage" :pagination="pagination" :loading="loading" item-label="tài khoản" @page-change="changePage" />
    </section>
    <Teleport to="body">
      <dialog ref="dialog" class="admin-users-dialog" aria-labelledby="user-dialog-title" @cancel.prevent="closeDialog">
        <header><h2 id="user-dialog-title">{{ dialogTitle }}</h2><button type="button" class="admin-users-button is-icon" aria-label="Đóng" :disabled="saving" @click="closeDialog"><X :size="20" /></button></header>
        <form @submit.prevent="submitUser">
          <p v-if="mode === 'delete'" class="admin-users-delete-description">Xóa tài khoản <strong>{{ selectedUser?.name }}</strong> ({{ selectedUser?.email }})? Người dùng sẽ không thể đăng nhập bằng tài khoản này nữa.</p>
          <fieldset v-else :disabled="saving">
            <label>Họ tên<input v-model="form.name" required maxlength="255" autocomplete="name" autofocus><span v-if="fieldErrors.name" class="admin-users-form-error">{{ fieldErrors.name[0] }}</span></label>
            <label>Email<input v-model="form.email" type="email" required maxlength="255" autocomplete="email"><span v-if="fieldErrors.email" class="admin-users-form-error">{{ fieldErrors.email[0] }}</span></label>
            <label>Vai trò<select v-model="form.role" :disabled="selectedUser?.id === currentUser?.id"><option value="user">Người chơi</option><option value="admin">Quản trị viên</option></select><span v-if="fieldErrors.role" class="admin-users-form-error">{{ fieldErrors.role[0] }}</span></label>
            <label>{{ mode === 'edit' ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu' }}<input v-model="form.password" type="password" :required="mode === 'create'" minlength="8" maxlength="255" autocomplete="new-password"><span v-if="fieldErrors.password" class="admin-users-form-error">{{ fieldErrors.password[0] }}</span></label>
            <label>Xác nhận mật khẩu<input v-model="form.password_confirmation" type="password" :required="!!form.password" autocomplete="new-password"></label>
          </fieldset>
          <p v-if="formError" class="admin-users-form-error" role="alert">{{ formError }}</p>
          <footer><button type="button" class="admin-users-button" :autofocus="mode === 'delete'" :disabled="saving" @click="closeDialog">Hủy</button><button type="submit" class="admin-users-button" :class="mode === 'delete' ? 'is-danger-solid' : 'is-primary'" :disabled="saving">{{ saving ? 'Đang xử lý…' : mode === 'delete' ? 'Xóa người dùng' : 'Lưu' }}</button></footer>
        </form>
      </dialog>
    </Teleport>
  </main>
</template>

<style scoped src="~/assets/css/pages/admin/users.css"></style>
