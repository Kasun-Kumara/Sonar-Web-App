<script lang="ts">
  import { Github, Mail, User, Briefcase, Lock, Building2, Eye, EyeOff, Check } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { validateTeamCredentials, registerTeam } from "$lib/appwrite";

  let isLogin = $state(true);
  let rememberMe = $state(false);
  let acceptTerms = $state(false);
  let accountType = $state("individual"); // 'individual' | 'organization'
  let showPassword = $state(false);
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let loading = $state(false);
  let error = $state("");

  function toggleMode() {
    isLogin = !isLogin;
    error = "";
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    loading = true;
    error = "";

    try {
      // Extract team name from email (use email as team name)
      const teamName = email.split("@")[0] || email;

      if (isLogin) {
        // LOGIN MODE
        const team = await validateTeamCredentials(teamName, password);

        if (team) {
          // Store session in localStorage
          localStorage.setItem('sonar_session', JSON.stringify(team));

          // Check if admin and redirect accordingly
          if (team.role === 'admin') {
            goto("/admin-panel");
          } else {
            goto("/");
          }
        } else {
          error = "Invalid team name or password";
        }
      } else {
        // SIGNUP MODE
        if (!acceptTerms) {
          error = "You must accept the Terms & Conditions";
          loading = false;
          return;
        }

        if (password !== confirmPassword) {
          error = "Passwords do not match";
          loading = false;
          return;
        }

        if (password.length < 4) {
          error = "Password must be at least 4 characters";
          loading = false;
          return;
        }

        // Register new team
        const result = await registerTeam(teamName, password, []);

        if (result.success) {
          // Auto-login after registration
          const team = await validateTeamCredentials(teamName, password);
          if (team) {
            localStorage.setItem('sonar_session', JSON.stringify(team));
            goto("/");
          } else {
            error = "Account created but login failed. Please try logging in.";
          }
        } else {
          error = result.error || "Failed to create account";
        }
      }
    } catch (err) {
      error = isLogin ? "Login failed. Please try again." : "Account creation failed. Please try again.";
      console.error("Auth error:", err);
    } finally {
      loading = false;
    }
  }
</script>

<section
  class="relative flex min-h-[calc(100vh-80px)] w-full items-center justify-center px-4 py-12 sm:px-6"
>
  <div class="relative z-10 w-full max-w-md mx-auto">
    <div
      class="mx-auto w-full overflow-hidden rounded-[2.5rem] border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/5 backdrop-blur-xl transition-all duration-300 hover:shadow-cyan-500/5 dark:border-white/8 dark:bg-[#0d1520]/80 dark:shadow-black/30"
    >
      <div class="w-full p-8 sm:p-12">
        <div class="mb-10 flex flex-col items-center">
          <h1 class="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isLogin ? "Welcome back" : "Get started"}
          </h1>
          <p class="mt-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {isLogin
              ? "Sign in to your account to continue"
              : "Launch your next project with Sonar IDE"}
          </p>
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/70 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            aria-label="Login with Google"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Google</span>
          </button>
          <button
            type="button"
            class="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/70 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
            aria-label="Login with GitHub"
          >
            <Github class="h-4 w-4" />
            <span>GitHub</span>
          </button>
        </div>

        <div class="relative my-2 sm:my-3">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-zinc-200 dark:border-white/10"></span>
          </div>
          <div class="relative flex justify-center">
            <span class="bg-white px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:bg-[#0d1520]/72 dark:text-zinc-400">
              or
            </span>
          </div>
        </div>

        <form class="space-y-5" onsubmit={handleSubmit}>
          {#if !isLogin}
            <div class="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 p-1 dark:border-white/10">
              <button
                type="button"
                class={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${accountType === "individual"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"}`}
                onclick={() => (accountType = "individual")}
              >
                Individual
              </button>
              <button
                type="button"
                class={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${accountType === "organization"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-white/5"}`}
                onclick={() => (accountType = "organization")}
              >
                Organization
              </button>
            </div>
          {/if}

          {#if !isLogin && accountType === "organization"}
            <label class="relative block group">
              <Building2 class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text"
                placeholder="Organization Name"
                class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
              />
            </label>
          {/if}

          {#if !isLogin}
            <label class="relative block group">
              <User class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text"
                placeholder="Name"
                class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
              />
            </label>
          {/if}

          {#if !isLogin && accountType === "organization"}
            <label class="relative block group">
              <Briefcase class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type="text"
                placeholder="Your role in organization"
                class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
              />
            </label>
          {/if}

          <label class="relative block group">
            <Mail class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
            <input
              type="email"
              placeholder="Team Name / Email"
              bind:value={email}
              class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
            />
          </label>

          <label class="relative block group">
            <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              bind:value={password}
              class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-10 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors"
              onclick={() => (showPassword = !showPassword)}
            >
              {#if showPassword}
                <EyeOff class="h-4 w-4" />
              {:else}
                <Eye class="h-4 w-4" />
              {/if}
            </button>
          </label>

          {#if error}
            <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/30 dark:bg-red-900/10 dark:text-red-400">
              {error}
            </div>
          {/if}

          {#if !isLogin}
            <label class="relative block group">
              <Lock class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 group-focus-within:text-cyan-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                bind:value={confirmPassword}
                class="h-11 w-full rounded-xl border border-zinc-200 bg-white/70 pl-9 pr-10 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
              />
            </label>
          {/if}

          {#if isLogin}
            <div class="flex items-center justify-between">
              <label class="flex cursor-pointer items-center group">
                <div class="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    bind:checked={rememberMe}
                    class="peer sr-only"
                  />
                  <!-- Custom Checkbox -->
                  <div class="h-4.5 w-4.5 rounded border-2 border-zinc-300 bg-white transition-all duration-200 
                    peer-checked:border-cyan-500 peer-checked:bg-cyan-500
                    group-hover:border-cyan-400
                    dark:border-white/20 dark:bg-transparent dark:peer-checked:bg-cyan-500">
                    <!-- Animated Checkmark (Write Symbol) -->
                    <svg 
                      class="h-3.5 w-3.5 text-white transition-all duration-300 ease-out"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="4" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"
                    >
                      <polyline 
                        points="20 6 9 17 4 12" 
                        class="transition-all duration-500 ease-in-out"
                        style="stroke-dasharray: 22; stroke-dashoffset: {rememberMe ? '0' : '22'}; opacity: {rememberMe ? '1' : '0'};"
                      />
                    </svg>
                  </div>
                </div>
                <span class="ml-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">Remember me</span>
              </label>
              <a
                href="/forgot-password"
                class="text-xs font-bold text-cyan-600 hover:text-cyan-500 hover:underline decoration-2 underline-offset-4 dark:text-cyan-400"
              >
                Forgot your password?
              </a>
            </div>
          {:else}
            <div class="mt-4 px-1 text-left">
              <label class="flex cursor-pointer items-start group">
                <div class="relative flex-none mt-0.5">
                  <input
                    type="checkbox"
                    bind:checked={acceptTerms}
                    class="peer sr-only"
                  />
                  <!-- Custom Checkbox (Same style as login) -->
                  <div class="h-4.5 w-4.5 rounded border-2 border-zinc-300 bg-white transition-all duration-200 
                    peer-checked:border-cyan-500 peer-checked:bg-cyan-500
                    group-hover:border-cyan-400
                    dark:border-white/20 dark:bg-transparent dark:peer-checked:bg-cyan-500">
                    <!-- Animated Checkmark (Write Symbol) -->
                    <svg 
                      class="h-3.5 w-3.5 text-white transition-all duration-300 ease-out"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      stroke-width="4" 
                      stroke-linecap="round" 
                      stroke-linejoin="round"
                    >
                      <polyline 
                        points="20 6 9 17 4 12" 
                        class="transition-all duration-500 ease-in-out"
                        style="stroke-dasharray: 22; stroke-dashoffset: {acceptTerms ? '0' : '22'}; opacity: {acceptTerms ? '1' : '0'};"
                      />
                    </svg>
                  </div>
                </div>
                <span class="ml-3 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  I accept the 
                  <a href="/terms" class="font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 underline decoration-cyan-500/30 underline-offset-2">Terms & Conditions</a> and <a href="/privacy" class="font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 underline decoration-cyan-500/30 underline-offset-2 whitespace-nowrap">Privacy Policy</a>
                </span>
              </label>
            </div>
          {/if}

          <button
            type="submit"
            disabled={loading}
            class="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-linear-to-r from-cyan-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <div class="mt-6 flex justify-center">
          <button
            onclick={toggleMode}
            class="inline-flex cursor-pointer items-center justify-center rounded-full border border-cyan-400/40 bg-white/80 px-5 py-2 text-xs font-semibold text-cyan-700 transition-all hover:bg-cyan-50 hover:border-cyan-500/50 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:bg-cyan-500/20"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
