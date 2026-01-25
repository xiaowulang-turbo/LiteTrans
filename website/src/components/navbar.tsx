"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-3" : "py-5"
      }`}
    >
      <nav className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <span className="font-semibold text-lg">LiteTrans</span>
        </a>

        {/* 导航链接 */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            功能
          </a>
          <a href="#download" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            下载
          </a>
          <a
            href="https://github.com/ArcMichael/LiteTrans"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={() => document.getElementById("download")?.scrollIntoView({ behavior: "smooth" })}
        >
          下载
        </Button>
      </nav>
    </header>
  );
}
