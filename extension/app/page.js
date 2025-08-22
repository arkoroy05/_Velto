"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Mock login - in a real app, you would validate credentials with your backend
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save session to localStorage (mock)
      localStorage.setItem('velto-session', JSON.stringify({ email }));
      
      // Redirect to home/dashboard
      router.push('/home');
    } catch (error) {
      console.error('Login failed:', error);
      // Handle login error (show toast/notification)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] p-4">
      <Card className="w-full max-w-md border-0 bg-[#1e2642] text-white shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex flex-col items-center space-y-2">
            <div className="mb-2">
              <Brain className="w-12 h-12 text-[#8b5cf6]" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Welcome to Velto</CardTitle>
            <CardDescription className="text-[#9ca3af]">
              Sign in to continue to your account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#9ca3af]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1a1f3a] border-[#2d3561] text-white placeholder:text-[#4a5c8c] focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f3a]"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#9ca3af]">
                  Password
                </Label>
                <a
                  href="#"
                  className="text-sm font-medium text-[#8b5cf6] hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1a1f3a] border-[#2d3561] text-white placeholder:text-[#4a5c8c] focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1f3a]"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#6366f1] hover:bg-[#8b5cf6] text-white font-medium transition-colors duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-[#9ca3af]">
            Don&apos;t have an account?{" "}
            <a href="/signup" className="text-[#8b5cf6] hover:underline">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
