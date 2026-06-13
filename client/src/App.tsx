import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes'
import { Toaster } from './components/ui/sonner'

const router = createBrowserRouter(routes)

const App = () => {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

export default App
