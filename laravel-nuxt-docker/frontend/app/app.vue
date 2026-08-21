<script setup>
const config = useRuntimeConfig()

console.log('apiUrl=', config.public.apiUrl)

const { data, error } = await useFetch(
  `${config.public.apiUrl}/ping`
)

</script>

<template>
  <pre>{{ data }}</pre>
  <pre>{{ error }}</pre>
</template>