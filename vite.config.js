import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/26b-website/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf': ['pdfjs-dist', 'react-pdf'],
          'feature-admin': [
            './src/pages/admin/AdminDashboard.jsx',
            './src/pages/admin/BanUsers.jsx',
            './src/pages/admin/ContentReports.jsx',
            './src/pages/admin/PermissionApprovals.jsx',
            './src/pages/admin/PermissionRequest.jsx',
            './src/pages/admin/RegisterApprovals.jsx',
            './src/pages/admin/SuperuserPanel.jsx',
            './src/pages/admin/Announcement.jsx',
          ],
          'feature-journal': ['./src/pages/static/Journal.jsx', './src/pages/static/Handbook.jsx'],
        },
      },
    },
  },
})
