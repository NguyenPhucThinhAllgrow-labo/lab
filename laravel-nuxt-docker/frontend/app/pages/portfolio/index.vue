<script setup lang="ts">
const skills = [
  'Vue.js',
  'Nuxt.js',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'Node.js',
  'Git',
  'Figma'
]

const projects = [
  {
    title: 'E-Commerce Platform',
    description:
      'Modern e-commerce website with product management, shopping cart and responsive UI.',
    tech: ['Nuxt', 'TypeScript', 'Tailwind'],
    link: '#'
  },
  {
    title: 'Dashboard System',
    description:
      'Admin dashboard with analytics, charts, tables and a clean responsive interface.',
    tech: ['Vue', 'Nuxt', 'Tailwind'],
    link: '#'
  },
  {
    title: 'Booking Application',
    description:
      'Booking platform focused on performance, usability and mobile-first design.',
    tech: ['Nuxt', 'Vue', 'API'],
    link: '#'
  }
]
</script>

<template>
  <div class="min-h-screen bg-[#09090b] text-white">

    <!-- ==================== NAVBAR ==================== -->
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl"
    >
      <div
        class="container-custom flex h-16 items-center justify-between"
      >

        <!-- Logo -->
        <a
          href="#home"
          class="text-xl font-bold tracking-tight transition-colors duration-300 hover:text-violet-300"
        >
          <span class="text-violet-400">&lt;</span>
          YourName
          <span class="text-violet-400">/&gt;</span>
        </a>

        <!-- Navigation -->
        <nav class="hidden items-center gap-8 md:flex">

          <a
            href="#about"
            class="text-sm text-zinc-400 transition-colors duration-300 hover:text-violet-300"
          >
            About
          </a>

          <a
            href="#skills"
            class="text-sm text-zinc-400 transition-colors duration-300 hover:text-violet-300"
          >
            Skills
          </a>

          <a
            href="#projects"
            class="text-sm text-zinc-400 transition-colors duration-300 hover:text-violet-300"
          >
            Projects
          </a>

          <a
            href="#contact"
            class="text-sm text-zinc-400 transition-colors duration-300 hover:text-violet-300"
          >
            Contact
          </a>

        </nav>

        <!-- CTA -->
        <a
          href="#contact"
          class="rounded-full border border-violet-400/40 px-4 py-2 text-sm text-violet-300 transition-all duration-300 hover:border-violet-400 hover:bg-violet-500 hover:text-white hover:shadow-lg hover:shadow-violet-500/20"
        >
          Let's talk
        </a>

      </div>
    </header>

    <main>

      <!-- ==================== HERO ==================== -->
      <section
        id="home"
        class="relative flex min-h-screen items-center overflow-hidden"
      >

        <!-- Main violet glow -->
        <div
          class="absolute left-1/4 top-1/4 -z-10 h-96 w-96 rounded-full bg-violet-600/15 blur-[130px]"
        />

        <!-- Indigo glow -->
        <div
          class="absolute right-10 top-1/3 -z-10 h-80 w-80 rounded-full bg-indigo-600/15 blur-[120px]"
        />

        <!-- Small pink glow -->
        <div
          class="absolute bottom-10 left-1/2 -z-10 h-64 w-64 rounded-full bg-fuchsia-600/5 blur-[100px]"
        />

        <div class="container-custom w-full py-32">

          <div
            class="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]"
          >

            <!-- ==================== HERO LEFT ==================== -->
            <div>

              <p
                class="mb-5 font-mono text-sm text-violet-400"
              >
                Hello, I'm
              </p>

              <h1
                class="text-5xl font-black tracking-tight sm:text-6xl lg:text-8xl"
              >
                Your Name
              </h1>

              <h2
                class="mt-4 text-3xl font-bold text-zinc-400 sm:text-4xl lg:text-6xl"
              >
                Frontend Developer.
              </h2>

              <p
                class="mt-8 max-w-2xl text-lg leading-8 text-zinc-400"
              >
                I build modern, performant and beautiful web applications
                using Vue.js, Nuxt.js and TypeScript.
              </p>

              <!-- Buttons -->
              <div class="mt-10 flex flex-wrap gap-4">

                <!-- Primary -->
                <a
                  href="#projects"
                  class="rounded-lg bg-violet-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-xl hover:shadow-violet-500/25"
                >
                  View my work
                </a>

                <!-- Secondary -->
                <a
                  href="#contact"
                  class="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white transition-all duration-300 hover:border-violet-400/50 hover:bg-violet-500/5 hover:text-violet-300"
                >
                  Contact me
                </a>

              </div>

              <!-- Social -->
              <div class="mt-16 flex items-center gap-6">

                <a
                  href="#"
                  class="text-sm text-zinc-600 transition-colors duration-300 hover:text-violet-400"
                >
                  GitHub
                </a>

                <a
                  href="#"
                  class="text-sm text-zinc-600 transition-colors duration-300 hover:text-violet-400"
                >
                  LinkedIn
                </a>

                <a
                  href="#"
                  class="text-sm text-zinc-600 transition-colors duration-300 hover:text-violet-400"
                >
                  Facebook
                </a>

              </div>

            </div>

            <!-- ==================== HERO RIGHT ==================== -->
            <div class="group relative hidden lg:block">

              <!-- Outer glow -->
              <div
                class="absolute inset-10 rounded-full bg-violet-500/10 blur-3xl transition-all duration-700 group-hover:scale-110 group-hover:bg-violet-500/20"
              />

              <!-- Decorative grid -->
              <div
                class="absolute -inset-10 -z-10 opacity-20 transition-all duration-700 group-hover:opacity-40"
                style="
                  background-image:
                    linear-gradient(rgba(139,92,246,0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px);
                  background-size: 40px 40px;
                  mask-image: radial-gradient(circle, black, transparent 70%);
                  -webkit-mask-image: radial-gradient(circle, black, transparent 70%);
                "
              />

              <!-- ==================== TERMINAL ==================== -->
              <div
                class="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#11111b]/90 shadow-2xl shadow-violet-950/30 backdrop-blur-xl transition-all duration-500 ease-out group-hover:-translate-y-3 group-hover:rotate-[1deg] group-hover:border-violet-400/40 group-hover:shadow-[0_25px_80px_-20px_rgba(139,92,246,0.4)]"
              >

                <!-- Hover shine -->
                <div
                  class="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent transition-transform duration-1000 group-hover:translate-x-full"
                />

                <!-- ==================== TERMINAL HEADER ==================== -->
                <div
                  class="relative flex items-center border-b border-zinc-800 px-5 py-4 transition-colors duration-500 group-hover:border-violet-400/20"
                >

                  <!-- macOS Controls -->
                  <div
                    class="mac-controls flex items-center gap-[7px]"
                  >

                    <!-- RED / CLOSE -->
                    <button
                      type="button"
                      aria-label="Close"
                      class="mac-dot bg-[#ff5f57]"
                    >
                      <svg
                        viewBox="0 0 8 8"
                        fill="none"
                        class="mac-icon"
                      >
                        <path
                          d="M2 2L6 6M6 2L2 6"
                          stroke="#86181D"
                          stroke-width="1.2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>

                    <!-- YELLOW / MINIMIZE -->
                    <button
                      type="button"
                      aria-label="Minimize"
                      class="mac-dot bg-[#febc2e]"
                    >
                      <svg
                        viewBox="0 0 8 8"
                        fill="none"
                        class="mac-icon"
                      >
                        <path
                          d="M1.5 4H6.5"
                          stroke="#995700"
                          stroke-width="1.2"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>

                    <!-- GREEN / MAXIMIZE -->
                    <button
                      type="button"
                      aria-label="Maximize"
                      class="mac-dot bg-[#28c840]"
                    >
                      <svg
                        viewBox="0 0 8 8"
                        fill="none"
                        class="mac-icon"
                      >
                        <path
                          d="M2 6L6 2"
                          stroke="#0B6B22"
                          stroke-width="1.1"
                          stroke-linecap="round"
                        />

                        <path
                          d="M4.2 2H6V3.8"
                          stroke="#0B6B22"
                          stroke-width="1.1"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />

                        <path
                          d="M3.8 6H2V4.2"
                          stroke="#0B6B22"
                          stroke-width="1.1"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </button>

                  </div>

                  <!-- File name -->
                  <span
                    class="ml-3 font-mono text-xs text-zinc-600 transition-colors duration-300 group-hover:text-violet-400/70"
                  >
                    portfolio.ts
                  </span>

                </div>

                <!-- ==================== CODE ==================== -->
                <div
                  class="relative p-7 font-mono text-sm leading-8"
                >

                  <!-- const -->
                  <div>
                    <span class="text-violet-400">
                      const
                    </span>

                    <span class="text-white">
                      developer
                    </span>

                    <span class="text-zinc-500">
                      =
                    </span>

                    <span class="text-indigo-300">
                      {
                    </span>
                  </div>

                  <!-- name -->
                  <div class="pl-5">
                    <span class="text-violet-300">
                      name:
                    </span>

                    <span class="text-emerald-300">
                      'Your Name'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- role -->
                  <div class="pl-5">
                    <span class="text-violet-300">
                      role:
                    </span>

                    <span class="text-emerald-300">
                      'Frontend Developer'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- location -->
                  <div class="pl-5">
                    <span class="text-violet-300">
                      location:
                    </span>

                    <span class="text-emerald-300">
                      'Vietnam'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- stack -->
                  <div class="pl-5">
                    <span class="text-violet-300">
                      stack:
                    </span>

                    <span class="text-indigo-300">
                      [
                    </span>
                  </div>

                  <!-- Vue -->
                  <div
                    class="pl-10 transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <span class="text-emerald-300">
                      'Vue.js'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- Nuxt -->
                  <div
                    class="pl-10 transition-transform delay-75 duration-300 group-hover:translate-x-2"
                  >
                    <span class="text-emerald-300">
                      'Nuxt.js'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- TypeScript -->
                  <div
                    class="pl-10 transition-transform delay-100 duration-300 group-hover:translate-x-3"
                  >
                    <span class="text-emerald-300">
                      'TypeScript'
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- close stack -->
                  <div class="pl-5">
                    <span class="text-indigo-300">
                      ]
                    </span>

                    <span class="text-zinc-500">
                      ,
                    </span>
                  </div>

                  <!-- available -->
                  <div class="pl-5">

                    <span class="text-violet-300">
                      available:
                    </span>

                    <span
                      class="text-emerald-400 transition-all duration-300 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    >
                      true
                    </span>

                  </div>

                  <!-- close object -->
                  <div>
                    <span class="text-indigo-300">
                      }
                    </span>
                  </div>

                  <!-- Terminal footer -->
                  <div
                    class="mt-6 flex items-center gap-2 border-t border-zinc-800 pt-5 transition-colors duration-500 group-hover:border-violet-400/20"
                  >

                    <span
                      class="text-violet-400 transition-transform duration-300 group-hover:translate-x-1"
                    >
                      ➜
                    </span>

                    <span
                      class="text-zinc-500 transition-colors duration-300 group-hover:text-zinc-300"
                    >
                      Let's build something great.
                    </span>

                    <span
                      class="h-4 w-2 animate-pulse bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.9)]"
                    />

                  </div>

                </div>
              </div>

              <!-- ==================== VUE BADGE ==================== -->
              <div
                class="absolute -right-5 top-12 rounded-xl border border-violet-400/20 bg-[#09090b] px-4 py-3 shadow-xl shadow-violet-950/20 transition-all duration-500 group-hover:-translate-y-3 group-hover:translate-x-2 group-hover:border-violet-400/50 group-hover:shadow-violet-500/20"
              >

                <span
                  class="text-sm font-medium text-violet-400 transition-all duration-300 group-hover:text-violet-300 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]"
                >
                  &lt;/&gt; Vue.js
                </span>

              </div>

              <!-- ==================== AVAILABLE BADGE ==================== -->
              <div
                class="absolute -right-4 bottom-24 flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090b] px-4 py-3 shadow-xl transition-all duration-500 group-hover:translate-x-2 group-hover:translate-y-1 group-hover:border-emerald-400/30"
              >

                <span
                  class="h-2 w-2 animate-pulse rounded-full bg-emerald-400 transition-shadow duration-300 group-hover:shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                />

                <span
                  class="text-xs text-zinc-400 transition-colors duration-300 group-hover:text-emerald-300"
                >
                  Available for work
                </span>

              </div>

            </div>
          </div>
        </div>
      </section>

      <!-- ==================== ABOUT ==================== -->
      <section
        id="about"
        class="border-t border-white/5 py-24"
      >
        <div class="container-custom">

          <div
            class="grid gap-12 lg:grid-cols-2"
          >

            <!-- Title -->
            <div>

              <p
                class="font-mono text-sm text-violet-400"
              >
                01. About me
              </p>

              <h2
                class="mt-3 text-4xl font-bold"
              >
                I love building things for the web.
              </h2>

            </div>

            <!-- Content -->
            <div
              class="space-y-5 leading-7 text-zinc-400"
            >

              <p>
                I'm a frontend developer passionate about
                creating high-quality digital experiences.
              </p>

              <p>
                My focus is writing clean, maintainable code
                while transforming ideas and designs into fast
                and intuitive web applications.
              </p>

              <p>
                When I'm not coding, I enjoy learning new
                technologies, exploring design and working on
                side projects.
              </p>

            </div>

          </div>
        </div>
      </section>

      <!-- ==================== SKILLS ==================== -->
      <section
        id="skills"
        class="border-t border-white/5 py-24"
      >
        <div class="container-custom">

          <p
            class="font-mono text-sm text-violet-400"
          >
            02. Skills
          </p>

          <h2
            class="mt-3 text-4xl font-bold"
          >
            Technologies I work with
          </h2>

          <div
            class="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
          >

            <div
              v-for="skill in skills"
              :key="skill"
              class="group rounded-xl border border-zinc-800 bg-[#11111b]/70 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/40 hover:bg-violet-500/5 hover:shadow-lg hover:shadow-violet-950/20"
            >

              <p
                class="font-medium text-zinc-200 transition-colors duration-300 group-hover:text-violet-400"
              >
                {{ skill }}
              </p>

            </div>

          </div>
        </div>
      </section>

      <!-- ==================== PROJECTS ==================== -->
      <section
        id="projects"
        class="border-t border-white/5 py-24"
      >
        <div class="container-custom">

          <p
            class="font-mono text-sm text-violet-400"
          >
            03. Projects
          </p>

          <h2
            class="mt-3 text-4xl font-bold"
          >
            Some things I've built
          </h2>

          <div
            class="mt-12 grid gap-6 md:grid-cols-3"
          >

            <article
              v-for="project in projects"
              :key="project.title"
              class="group rounded-2xl border border-zinc-800 bg-[#11111b]/70 p-6 transition-all duration-300 hover:-translate-y-2 hover:border-violet-400/40 hover:bg-violet-500/[0.04] hover:shadow-xl hover:shadow-violet-950/20"
            >

              <!-- Header -->
              <div
                class="mb-8 flex items-center justify-between"
              >

                <div
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/10 text-xl text-violet-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-violet-500/20 group-hover:shadow-lg group-hover:shadow-violet-500/20"
                >
                  &lt;/&gt;
                </div>

                <a
                  :href="project.link"
                  class="text-zinc-600 transition-all duration-300 hover:translate-x-1 hover:-translate-y-1 hover:text-violet-400"
                >
                  ↗
                </a>

              </div>

              <!-- Title -->
              <h3
                class="text-xl font-bold text-white transition-colors duration-300 group-hover:text-violet-300"
              >
                {{ project.title }}
              </h3>

              <!-- Description -->
              <p
                class="mt-4 text-sm leading-6 text-zinc-400"
              >
                {{ project.description }}
              </p>

              <!-- Tech -->
              <div
                class="mt-6 flex flex-wrap gap-2"
              >

                <span
                  v-for="tech in project.tech"
                  :key="tech"
                  class="rounded-full bg-zinc-800/80 px-3 py-1 text-xs text-zinc-400 transition-colors duration-300 group-hover:bg-violet-500/10 group-hover:text-violet-300"
                >
                  {{ tech }}
                </span>

              </div>

            </article>

          </div>
        </div>
      </section>

      <!-- ==================== EXPERIENCE ==================== -->
      <section
        class="border-t border-white/5 py-24"
      >
        <div class="container-custom">

          <p
            class="font-mono text-sm text-violet-400"
          >
            04. Experience
          </p>

          <div
            class="mt-12 max-w-3xl"
          >

            <div
              class="relative border-l border-zinc-800 pl-8"
            >

              <!-- Timeline dot -->
              <div
                class="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-violet-400 shadow-lg shadow-violet-500/50"
              />

              <p
                class="font-mono text-sm text-violet-400"
              >
                2024 — Present
              </p>

              <h3
                class="mt-2 text-2xl font-bold"
              >
                Frontend Developer
              </h3>

              <p
                class="mt-1 text-zinc-600"
              >
                Company Name
              </p>

              <p
                class="mt-5 leading-7 text-zinc-400"
              >
                Developing scalable web applications,
                building reusable components and
                collaborating with designers and backend
                developers to deliver high-quality products.
              </p>

            </div>

          </div>
        </div>
      </section>

      <!-- ==================== CONTACT ==================== -->
      <section
        id="contact"
        class="relative overflow-hidden border-t border-white/5 py-32"
      >

        <!-- Contact glow -->
        <div
          class="absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]"
        />

        <div
          class="container-custom text-center"
        >

          <p
            class="font-mono text-sm text-violet-400"
          >
            05. What's next?
          </p>

          <h2
            class="mt-4 text-5xl font-black"
          >
            Let's work together.
          </h2>

          <p
            class="mx-auto mt-6 max-w-xl text-zinc-400"
          >
            Have a project in mind or just want to say
            hello? My inbox is always open.
          </p>

          <a
            href="mailto:hello@example.com"
            class="mt-10 inline-block rounded-lg bg-violet-500 px-8 py-4 font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-violet-400 hover:shadow-xl hover:shadow-violet-500/30"
          >
            Say Hello
          </a>

        </div>
      </section>

    </main>

    <!-- ==================== FOOTER ==================== -->
    <footer
      class="border-t border-white/5 py-8"
    >
      <div
        class="container-custom text-center text-sm text-zinc-700"
      >
        Built with Nuxt.js & Tailwind CSS
      </div>
    </footer>

  </div>
</template>

<style scoped src="~/assets/css/pages/portfolio/index.css"></style>
