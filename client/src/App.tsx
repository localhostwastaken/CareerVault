import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppErrorBoundary } from './components/shared/AppErrorBoundary'
import { routes } from './routes'
import { Toaster } from './components/ui/sonner'

const router = createBrowserRouter(routes)

const App = () => {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
      <Toaster />
    </AppErrorBoundary>
  )
}

export default App
