"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ArrowLeft } from "lucide-react";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Mock signup; would call backend in real app
      await new Promise((r) => setTimeout(r, 800));
      localStorage.setItem("velto-session", JSON.stringify({ email }));
      router.push("/home");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-4">
      <Card className="w-full max-w-md border-0 bg-[#1e2642] text-white shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="text-[#9ca3af] hover:text-white p-2" onClick={() => router.push("/")} title="Back to Login">
              <ArrowLeft size={18} />
            </Button>
            <div className="flex-1 flex flex-col items-center -ml-8">
              <Brain className="w-10 h-10 text-[#8b5cf6]" />
              <CardTitle className="mt-2 text-xl font-bold text-white">Create your Velto account</CardTitle>
              <CardDescription className="text-[#9ca3af]">Sign up to get started</CardDescription>
            </div>
            <div className="w-9" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#9ca3af]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#1a1f3a] border-[#2d3561] text-white"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#9ca3af]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-[#1a1f3a] border-[#2d3561] text-white"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-[#6366f1] hover:bg-[#8b5cf6]">
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            <div className="mt-1 text-center text-sm text-[#9ca3af]">
              Already have an account? <a href="/" className="text-[#8b5cf6] hover:underline">Sign in</a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
