import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthRefresh } from './components/AuthRefresh'
import { AppErrorBoundary } from './components/shared/AppErrorBoundary'
import { routes } from './routes'
import { Toaster } from './components/ui/sonner'

const router = createBrowserRouter(routes)

const App = () => {
  return (
    <AppErrorBoundary>
      <AuthRefresh>
        <RouterProvider router={router} />
      </AuthRefresh>
      <Toaster />
    </AppErrorBoundary>
  )
}

export default App
