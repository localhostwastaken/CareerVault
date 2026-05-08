import { Link, useNavigate } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/app/hooks";
import { setAuthenticated, setRole } from "@/app/slices/roleSlice";

const schema = Yup.object({
  name: Yup.string().min(2, "At least 2 characters").required("Required"),
  email: Yup.string().email("Enter a valid email").required("Required"),
  password: Yup.string()
    .min(8, "At least 8 characters")
    .matches(/[A-Z]/, "Must contain an uppercase letter")
    .matches(/[a-z]/, "Must contain a lowercase letter")
    .matches(/\d/, "Must contain a number")
    .required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
});

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = () => {
    dispatch(setRole("holder"));
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
          <h1 className="text-2xl font-bold tracking-tight text-text">Create your account</h1>
          <p className="mt-1 text-sm text-text-muted">
            Already have one?{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <Formik
          initialValues={{ name: "", email: "", password: "", confirmPassword: "" }}
          validationSchema={schema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form className="space-y-4">
              {(["name", "email", "password", "confirmPassword"] as const).map((field) => {
                const labels = { name: "Full name", email: "Email", password: "Password", confirmPassword: "Confirm password" };
                const types = { name: "text", email: "email", password: "password", confirmPassword: "password" };
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={field}>{labels[field]}</Label>
                    <Input
                      id={field}
                      name={field}
                      type={types[field]}
                      value={values[field]}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      aria-invalid={Boolean(touched[field] && errors[field])}
                    />
                    {touched[field] && errors[field] ? (
                      <p className="text-xs text-revoked">{errors[field]}</p>
                    ) : null}
                  </div>
                );
              })}

              <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
                Create account
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </main>
  );
};

export default Register;
