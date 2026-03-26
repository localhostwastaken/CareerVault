import React, { Suspense } from "react";
import { Navigate, Outlet } from 'react-router-dom'
import type { RouteObject } from "react-router-dom";

// imports from components
import ImplementAuth from "./components/ImplementAuth";
import LoadingScreen from "./components/LoadingScreen";

// imports from pages

// public pages
const Hero = React.lazy(() => import("./pages/Hero/Hero"));

// auth pages
const Login = React.lazy(() => import("./pages/Login/Login"));
const Register = React.lazy(() => import("./pages/Register/Register"));

// protected pages
const Profile = React.lazy(() => import("./pages/Profile/Profile"));



export const routes: Array<RouteObject> = [
  {
    path: "/",
    element: <Suspense fallback={<LoadingScreen />}><Hero /></Suspense>,
  },
  {
    path: "/auth",
    element: <Suspense fallback={<LoadingScreen />}><Outlet /></Suspense>,
    children: [
      { index: true, element: <Navigate to="/auth/login" replace /> },
      { path: "login", element: <Login /> },
      {
        path: "register",
        element: <Register />,
      },
    ],
  },
  {
    path: "/",
    element: <Suspense fallback={<LoadingScreen />}><ImplementAuth /></Suspense>,
    children: [
      {
        path: "profile", 
        element: <Profile />,
      },
    ]
  },
  {
    // Redirect all other paths to a "not found" page or the hero page
    path: "*",
    element: <Navigate to="/" replace />
  }
];

