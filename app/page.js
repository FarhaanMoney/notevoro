'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, Upload, Sparkles, FileText, CheckCircle, Play, ArrowRight, Menu, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/dashboard');
      }
    });
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [router]);

  const handleGetStarted = () => {
    router.push('/login');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const runDemo = () => {
    setDemoActive(true);
    setDemoStep(0);
    
    const steps = [
      () => setDemoStep(1),
      () => setDemoStep(2),
      () => setDemoStep(3),
      () => setDemoStep(4),
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        steps[currentStep]();
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDemoActive(false);
          setDemoStep(0);
        }, 2000);
      }
    }, 800);
    
    return () => clearInterval(interval);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-gray-200 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'}}>
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Notevoro</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition">Pricing</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition">About</a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900" onClick={handleLogin}>
                Login
              </Button>
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <div className="px-6 py-4 space-y-4">
              <a href="#features" className="block text-sm text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="block text-sm text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#about" className="block text-sm text-gray-600 hover:text-gray-900">About</a>
              <div className="pt-4 space-y-2">
                <Button variant="ghost" className="w-full" onClick={handleLogin}>Login</Button>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={handleGetStarted}>Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6">
            Study Smarter.<br />Not Harder.
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Turn notes, PDFs, lectures, and videos into quizzes, flashcards, visual explanations, and AI-powered study sessions in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              className="bg-blue-500 hover:bg-blue-600 text-white h-12 px-8 text-base"
              onClick={handleGetStarted}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-8 text-base border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Dashboard Screenshot */}
          <div className="relative">
            <div className="rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
              <div className="bg-gray-100 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Dashboard Screenshot</p>
                  <p className="text-sm text-gray-400">Real Notevoro Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-6 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-600 mb-8">Trusted by students worldwide</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-bold text-gray-900">Millions</p>
              <p className="text-sm text-gray-600">of study materials processed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">Thousands</p>
              <p className="text-sm text-gray-600">of quizzes generated daily</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">Every Day</p>
              <p className="text-sm text-gray-600">students studying smarter</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <Upload className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Upload</h3>
              <p className="text-gray-600">Upload notes, PDFs, slides, lectures, or videos.</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Generate</h3>
              <p className="text-gray-600">AI instantly creates study tools.</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Master</h3>
              <p className="text-gray-600">Study using quizzes, flashcards, visual learning, and AI tutoring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-24 px-6 md:px-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
            <p className="text-gray-600">Try the demo below to see how Notevoro works</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
            {!demoActive ? (
              <div className="text-center">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 mb-6">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drop a PDF</p>
                  <p className="text-sm text-gray-400">or paste your notes</p>
                </div>
                <Button 
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={runDemo}
                >
                  Try Demo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {demoStep >= 1 && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-900">Quiz Generated</span>
                  </div>
                )}
                {demoStep >= 2 && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-900">Flashcards Generated</span>
                  </div>
                )}
                {demoStep >= 3 && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-900">Visual Learning Generated</span>
                  </div>
                )}
                {demoStep >= 4 && (
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-900">Study Notes Generated</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Features</h2>
          </div>

          {/* Feature 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Notes</h3>
              <p className="text-gray-600 leading-relaxed">Transform lectures and PDFs into organized notes.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-100 aspect-video flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 rounded-xl border border-gray-200 bg-gray-100 aspect-video flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Quizzes</h3>
              <p className="text-gray-600 leading-relaxed">Generate quizzes instantly from your materials.</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Flashcards</h3>
              <p className="text-gray-600 leading-relaxed">Review and remember faster.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-100 aspect-video flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
          </div>

          {/* Feature 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1 rounded-xl border border-gray-200 bg-gray-100 aspect-video flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Visual Learning</h3>
              <p className="text-gray-600 leading-relaxed">Turn difficult concepts into visual explanations.</p>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Tutor</h3>
              <p className="text-gray-600 leading-relaxed">Ask questions and get personalized explanations.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-100 aspect-video flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Notevoro */}
      <section className="py-24 px-6 md:px-12 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Notevoro</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Personalized Learning</h3>
              <p className="text-gray-600">AI adapts to your learning style and pace.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Built For Students</h3>
              <p className="text-gray-600">Designed specifically for academic success.</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Everything In One Place</h3>
              <p className="text-gray-600">Notes, quizzes, flashcards, and tutoring together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Your next exam starts today.</h2>
          <p className="text-xl text-gray-600 mb-10">Join students studying smarter with Notevoro.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-blue-500 hover:bg-blue-600 text-white h-12 px-8 text-base"
              onClick={handleGetStarted}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-8 text-base border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleLogin}
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'}}>
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Notevoro</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <a href="#features" className="hover:text-gray-900">Features</a>
              <a href="#pricing" className="hover:text-gray-900">Pricing</a>
              <a href="#" className="hover:text-gray-900">Privacy</a>
              <a href="#" className="hover:text-gray-900">Terms</a>
              <a href="#" className="hover:text-gray-900">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Notevoro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
