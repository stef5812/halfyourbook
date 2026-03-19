import { Routes, Route, Navigate } from "react-router-dom";
import AppHeader from "./components/AppHeader.jsx";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Forgot from "./pages/Forgot.jsx";
import Reset from "./pages/Reset.jsx";
import Books from "./pages/Books.jsx";
import BookDetail from "./pages/BookDetail.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Home from "./pages/Home.jsx";
import AdminHome from "./pages/AdminHome.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminBooks from "./pages/AdminBooks.jsx";
import BookSections from "./pages/BookSections";
import Authors from "./pages/Authors";
import AuthorDetail from "./pages/AuthorDetail";
import About from "./pages/About";

export default function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminHome />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/books" element={<AdminBooks />} />
        <Route path="/dashboard/sections" element={<BookSections />} />
        <Route path="/authors" element={<Authors />} />
        <Route path="/authors/:id" element={<AuthorDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
