import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthRefresh } from './components/AuthRefresh'
import { routes } from './routes'
import { Toaster } from './components/ui/sonner'

const router = createBrowserRouter(routes)

const App = () => {
  return (
    <>
      <AuthRefresh>
        <RouterProvider router={router} />
      </AuthRefresh>
      <Toaster />
    </>
  )
}

export default App
