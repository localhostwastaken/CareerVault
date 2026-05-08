import { Link, useNavigate } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/app/hooks";
import { setAuthenticated, setRole, type Role } from "@/app/slices/roleSlice";

interface Values {
  email: string;
  password: string;
}

const schema = Yup.object({
  email: Yup.string().email("Enter a valid email").required("Required"),
  password: Yup.string().min(6, "At least 6 characters").required("Required"),
});

const inferRoleFromEmail = (email: string): Role => {
  const local = email.toLowerCase();
  if (local.startsWith("admin")) return "admin";
  if (local.startsWith("hr")) return "hr";
  if (local.startsWith("manager") || local.startsWith("mark")) return "manager";
  if (local.startsWith("recruiter") || local.startsWith("verifier")) return "verifier";
  return "holder";
};

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = (values: Values) => {
    dispatch(setRole(inferRoleFromEmail(values.email)));
    dispatch(setAuthenticated(true));
    navigate("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg) px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <ShieldCheck className="size-6 text-white" strokeWidth={2.25} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Sign in to CareerVault</h1>
          <p className="mt-1 text-sm text-text-muted">
            New here?{" "}
            <Link to="/auth/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <Formik initialValues={{ email: "", password: "" }} validationSchema={schema} onSubmit={handleSubmit}>
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(touched.email && errors.email)}
                  placeholder="anuj@somaiya.edu"
                />
                {touched.email && errors.email ? (
                  <p className="text-xs text-revoked">{errors.email}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-invalid={Boolean(touched.password && errors.password)}
                />
                {touched.password && errors.password ? (
                  <p className="text-xs text-revoked">{errors.password}</p>
                ) : null}
              </div>

              <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
                Sign in
              </Button>

              <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-3 text-xs text-text-muted">
                <span className="font-semibold text-text">Demo:</span> use any email/password. Prefix with{" "}
                <code className="font-mono">admin@</code>, <code className="font-mono">hr@</code>,{" "}
                <code className="font-mono">manager@</code>, or <code className="font-mono">recruiter@</code> to land in that role.
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </main>
  );
};

export default Login;
