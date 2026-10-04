import { defineConfig } from 'vite'

// The app engine (@nextgent/app-engine) is linked from App-build-; it imports
// react as a peer. dedupe keeps it on this app's single React copy.
export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom'] },
})
