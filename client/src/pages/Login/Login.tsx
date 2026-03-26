import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormikInput from '../../components/ui/FormikInput';
import Button from '../../components/ui/Button';

interface LoginFormValues {
  email: string;
  password: string;
}

const loginValidationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = true
  const authError = false
  const isLoading = false

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const initialValues: LoginFormValues = {
    email: '',
    password: '',
  };

  const handleSubmit = async (_values: LoginFormValues) => {
    try {
      // await login(values).unwrap(); --- IGNORE ---
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link 
              to="/auth/register" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <Formik
          initialValues={initialValues}
          validationSchema={loginValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="space-y-4">
                <FormikInput
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  autoComplete="email"
                />
                
                <FormikInput
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>

              {authError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {authError}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading || isSubmitting}
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Login;