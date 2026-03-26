import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import FormikInput from '../../components/ui/FormikInput';
import Button from '../../components/ui/Button';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const registerValidationSchema = Yup.object({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = true
  const authError = false
  const isLoading = false


  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const initialValues: RegisterFormValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const handleSubmit = async (_values: RegisterFormValues) => {
    try {
      // await register(values).unwrap(); --- IGNORE ---
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link 
              to="/auth/login" 
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <Formik
          initialValues={initialValues}
          validationSchema={registerValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="mt-8 space-y-6">
              <div className="space-y-4">
                <FormikInput
                  name="name"
                  type="text"
                  label="Full Name"
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
                
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
                  placeholder="Create a password"
                  helperText="Must contain uppercase, lowercase, and number"
                  autoComplete="new-password"
                />
                
                <FormikInput
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
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
                  Create Account
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Register;
