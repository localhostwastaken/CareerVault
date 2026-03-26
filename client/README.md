# React Redux Template

A comprehensive, production-ready React boilerplate with authentication, protected routes, TailwindCSS styling, and Redux Toolkit state management. This template demonstrates best practices and modern development patterns for building scalable React applications.

## 🚀 Features

- ⚛️ **React 19** with TypeScript for type safety
- 🔄 **Redux Toolkit** for efficient state management
- 🌐 **RTK Query** for data fetching and caching
- 🛡️ **Authentication System** with JWT token management
- 🔒 **Protected Routes** with automatic redirects
- 🎨 **TailwindCSS** for modern, responsive design
- 📝 **Formik & Yup** for robust form handling and validation
- 🏗️ **Clean Architecture** with organized folder structure
- 📱 **Responsive Design** optimized for all devices
- ⚡ **Vite** for fast development and building
- 🔧 **ESLint** for code quality and consistency

## 📁 Project Structure

```
src/
├── apis/                    # API layer
│   ├── APISlice.tsx        # Base RTK Query setup
│   ├── auth/               # Authentication API
│   │   ├── authApiSlice.tsx
│   │   └── authSlice.tsx
│   └── project/            # Example feature API
├── components/             # Reusable components
│   ├── layout/            # Layout components
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── ui/                # UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── FormikInput.tsx
│   ├── ImplementAuth.tsx   # Route protection
│   └── LoadingScreen.tsx   # Loading component
├── config/                 # Configuration files
│   └── APIEndpoints.tsx    # API endpoints config
├── pages/                  # Page components
│   ├── Hero/              # Landing page
│   ├── Login/             # Authentication pages
│   ├── Register/
│   └── Profile/           # Protected pages
├── styles/                # Global styles
│   └── globals.css
├── App.tsx                # Root component
├── main.tsx              # Entry point
├── routes.tsx            # Route configuration
└── store.tsx             # Redux store setup
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd career-vault-client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_APP_ENV=local
   VITE_API_URL_LOCAL=http://localhost:3001
   VITE_API_URL_DEV=https://dev-api.yourapp.com
   VITE_API_URL_PROD=https://api.yourapp.com
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔐 Authentication System

### Overview

The template includes a complete authentication system with:

- User registration and login
- JWT token management
- Automatic token refresh
- Protected route handling
- User profile management
- Password change functionality

### Key Components

#### Auth Slice (`src/apis/auth/authSlice.tsx`)
```typescript
// State management for authentication
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

#### Auth API Slice (`src/apis/auth/authApiSlice.tsx`)
```typescript
// API endpoints for authentication
export const authApiSlice = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>(),
    register: builder.mutation<AuthResponse, RegisterRequest>(),
    me: builder.query<{ user: User }, void>(),
    updateProfile: builder.mutation<{ user: User }, Partial<User>>(),
    changePassword: builder.mutation<{ message: string }, PasswordChange>(),
  }),
});
```

#### Protected Routes (`src/components/ImplementAuth.tsx`)
```typescript
const ImplementAuth: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const token = useSelector(selectAuthToken);
  
  // Authentication logic and automatic redirects
  if (!token || !isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return <Outlet />;
};
```

## 📝 Form Management

### Formik Integration

The template uses Formik with Yup for powerful form handling:

```typescript
// Login form example
const loginValidationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

// Usage in component
<Formik
  initialValues={{ email: '', password: '' }}
  validationSchema={loginValidationSchema}
  onSubmit={handleSubmit}
>
  {({ isSubmitting }) => (
    <Form>
      <FormikInput name="email" type="email" label="Email" />
      <FormikInput name="password" type="password" label="Password" />
      <Button type="submit" isLoading={isSubmitting}>
        Sign In
      </Button>
    </Form>
  )}
</Formik>
```

### Custom Input Components

- **FormikInput**: Integrated with Formik for automatic validation
- **Button**: Flexible button component with loading states
- **Input**: Standalone input component for non-Formik forms

## 🎨 Styling & Components

### TailwindCSS Configuration

The template includes comprehensive TailwindCSS setup with:

- Custom utility classes
- Responsive design patterns
- Component-specific styles
- Animation utilities

### UI Component Library

#### Button Component
```typescript
<Button variant="primary" size="lg" isLoading={loading}>
  Click Me
</Button>

// Variants: primary, secondary, danger, outline
// Sizes: sm, md, lg
```

#### Layout Components
```typescript
<Layout showNavbar={true} showFooter={true}>
  <YourContent />
</Layout>
```

## 🌐 API Configuration

### Environment-based Configuration

```typescript
// src/config/APIEndpoints.tsx
const apiConfig = {
  environment: import.meta.env.VITE_APP_ENV || "local",
  baseEndpoints: {
    prod: "https://api.yourapp.com",
    dev: "https://dev-api.yourapp.com",
    local: "http://localhost:3001",
  },
  getEndpoint(): string {
    // Returns appropriate endpoint based on environment
  },
  endpoints: {
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      // ... more endpoints
    }
  }
};
```

### RTK Query Setup

```typescript
// Base API slice with automatic token injection
const baseQuery = fetchBaseQuery({
  baseUrl: apiConfig.getEndpoint(),
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});
```

## 🛣️ Routing

### Route Configuration

```typescript
// src/routes.tsx
export const routes: RouteObject[] = [
  // Public routes
  { path: "/", element: <Hero /> },
  
  // Auth routes
  {
    path: "/auth",
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },
  
  // Protected routes
  {
    path: "/",
    element: <ImplementAuth />,
    children: [
      { path: "profile", element: <Profile /> },
    ],
  },
];
```

### Navigation

- **Automatic redirects** for unauthenticated users
- **Dynamic navigation** based on auth state
- **Loading states** during route transitions

## 📦 State Management

### Redux Store Setup

```typescript
// src/store.tsx
export const store = configureStore({
  reducer: {
    auth: authReducer,
    [APISlice.reducerPath]: APISlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(APISlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Usage Examples

```typescript
// Using auth state
const user = useSelector(selectCurrentUser);
const isAuthenticated = useSelector(selectIsAuthenticated);

// Using API mutations
const [login, { isLoading, error }] = useLoginMutation();

// Dispatching actions
const dispatch = useDispatch();
dispatch(logout());
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Testing (if configured)
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Code Quality

- **ESLint** for code linting
- **TypeScript** for type checking
- **Prettier** for code formatting (recommended)

## 🚀 Deployment

### Production Build

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Environment Variables

Make sure to set appropriate environment variables for production:

```env
VITE_APP_ENV=production
VITE_API_URL_PROD=https://your-production-api.com
```

## 🤝 Contributing

### Development Guidelines

1. **Follow TypeScript** best practices
2. **Use consistent naming** conventions
3. **Write meaningful comments** for complex logic
4. **Keep components focused** and reusable
5. **Test your changes** thoroughly

### Folder Structure Guidelines

- **Components**: Keep them small and focused
- **Pages**: Main route components
- **APIs**: Organized by feature
- **Types**: Use TypeScript interfaces
- **Styles**: Global styles in `styles/`

## 📋 Best Practices

### Component Development

```typescript
// ✅ Good: Typed component with proper interface
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  isLoading = false,
  children,
  ...props 
}) => {
  // Component implementation
};
```

### State Management

```typescript
// ✅ Good: Proper selector usage
const user = useSelector(selectCurrentUser);
const isLoading = useSelector(selectAuthLoading);

// ✅ Good: Proper mutation usage
const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
```

### Form Validation

```typescript
// ✅ Good: Comprehensive validation schema
const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain uppercase letter')
    .matches(/[a-z]/, 'Password must contain lowercase letter')
    .matches(/\d/, 'Password must contain a number')
    .required('Password is required'),
});
```

## 📚 Learning Resources

### React & TypeScript
- [React Documentation](https://reactjs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Redux Toolkit
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [RTK Query Guide](https://redux-toolkit.js.org/rtk-query/overview)

### Styling
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

### Forms
- [Formik Documentation](https://formik.org/docs/overview)
- [Yup Validation](https://github.com/jquense/yup)

## 🐛 Troubleshooting

### Common Issues

1. **Authentication not persisting**
   - Check if localStorage is available
   - Verify token expiration handling

2. **API calls failing**
   - Check environment variables
   - Verify API endpoint configuration

3. **Styling not applying**
   - Ensure TailwindCSS is properly configured
   - Check for CSS specificity issues

4. **Forms not validating**
   - Verify Yup schema configuration
   - Check Formik integration

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Support

If you have any questions or need help with this template:

1. Check the documentation above
2. Look through existing issues
3. Create a new issue with detailed information
4. Consider contributing improvements

---

**Happy coding! 🎉**

This template provides a solid foundation for building modern React applications with best practices and scalable architecture. Feel free to customize it according to your specific needs.