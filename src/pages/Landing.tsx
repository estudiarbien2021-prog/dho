import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Play, 
  Target, 
  BarChart3, 
  Shield, 
  Zap,
  Clock,
  Globe,
  DollarSign,
  Award,
  Users,
  CheckCircle
} from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';
import featureAi from '@/assets/feature-ai.jpg';
import featureAnalytics from '@/assets/feature-analytics.jpg';
import featureSecurity from '@/assets/feature-security.jpg';
import featureAutomation from '@/assets/feature-automation.jpg';
import ParticleBackground from '@/components/ParticleBackground';
import { useScrollAnimation, useStaggeredAnimation } from '@/hooks/useScrollAnimation';

const Landing = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [typedText, setTypedText] = useState('');
  const fullText = 'The Future of Sports Betting';

  const heroRef = useScrollAnimation();
  const featuresRef = useScrollAnimation();
  const pricingRef = useScrollAnimation();
  const testimonialsRef = useScrollAnimation();
  const { elementRef: statsRef, visibleItems: visibleStats } = useStaggeredAnimation(3, 200);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setTypedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleWatchDemo = () => {
    // Placeholder for demo functionality
    console.log('Watch demo clicked');
  };

  const features = [
    {
      icon: BarChart3,
      badge: "Core Feature",
      title: "Advanced Odds Analysis",
      description: "Leverage cutting-edge algorithms for intelligent odds comparison and value betting opportunities.",
      image: featureAi
    },
    {
      icon: Clock,
      badge: "Popular",
      title: "Real-time Data",
      description: "Get instant updates with live odds monitoring and real-time match statistics.",
      image: featureAnalytics
    },
    {
      icon: Shield,
      badge: "Secure",
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption and compliance standards.",
      image: featureSecurity
    },
    {
      icon: Zap,
      badge: "Powerful",
      title: "Smart Automation",
      description: "Automate your betting strategy with intelligent filters and advanced sorting.",
      image: featureAutomation
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Professional Bettor",
      content: "Hype Odds has revolutionized my betting strategy. The real-time data and analysis tools are game-changing.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b0e9?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Michael Chen",
      role: "Sports Analyst",
      content: "The most comprehensive odds platform I've ever used. The filtering system saves me hours every day.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Emma Rodriguez",
      role: "Betting Consultant",
      content: "Finally, a platform that understands what serious bettors need. The value detection is incredible.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for beginners",
      features: [
        "Basic odds comparison",
        "5 competitions access",
        "Standard filters",
        "Community support"
      ]
    },
    {
      name: "Professional",
      price: "$29",
      period: "/month",
      description: "For serious bettors",
      features: [
        "Advanced analytics",
        "All competitions",
        "Value bet alerts",
        "Priority support",
        "Custom filters",
        "Export data"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "/month",
      description: "For betting professionals",
      features: [
        "Everything in Professional",
        "API access",
        "Custom integrations",
        "Dedicated support",
        "Advanced reporting",
        "Team collaboration"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Custom Cursor */}
      <div 
        className="fixed w-6 h-6 pointer-events-none z-50 mix-blend-difference"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transition: 'all 0.1s ease-out'
        }}
      >
        <div className="w-full h-full bg-white rounded-full animate-pulse-slow"></div>
      </div>

      {/* Particle Background */}
      <ParticleBackground />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10 animate-fade-in-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 animate-fade-in-left">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-glow">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Hype Odds</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8 animate-fade-in-up">
              <a href="#features" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110">How it Works</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-all duration-300 hover:scale-110">Testimonials</a>
            </nav>

            <div className="flex items-center gap-4 animate-fade-in-right">
              <Button variant="ghost" className="text-white hover:text-purple-300 hover:scale-105 transition-all duration-300">
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 animate-glow"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        ref={heroRef.elementRef}
        className={`pt-32 pb-20 px-4 transition-all duration-1000 ${
          heroRef.isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30 animate-scale-in hover:scale-110 transition-transform duration-300">
                ✨ Introducing Hype Odds AI
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                <div className="inline-block animate-fade-in-left">
                  {typedText}
                  <span className="animate-blink">|</span>
                </div>
              </h1>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  Transform your betting strategy with our cutting-edge odds platform. 
                  Streamline analysis, boost profitability, and unlock unprecedented insights 
                  with intelligent automation that adapts to your needs.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6 hover:scale-105 transition-all duration-300 animate-glow"
                >
                  Start Free Trial
                  <TrendingUp className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleWatchDemo}
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats */}
              <div ref={statsRef} className="grid grid-cols-3 gap-8 text-center">
                <div className={`transition-all duration-500 ${visibleStats.has(0) ? 'animate-scale-in' : 'opacity-0 scale-75'}`}>
                  <div className="text-3xl font-bold text-purple-400 mb-2 animate-float">99.9%</div>
                  <div className="text-gray-400">Uptime</div>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(1) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.2s' }}>
                  <div className="text-3xl font-bold text-purple-400 mb-2 animate-float" style={{ animationDelay: '0.5s' }}>10M+</div>
                  <div className="text-gray-400">Bets Analyzed</div>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(2) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.4s' }}>
                  <div className="text-3xl font-bold text-purple-400 mb-2 animate-float" style={{ animationDelay: '1s' }}>500%</div>
                  <div className="text-gray-400">ROI Improvement</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative animate-fade-in-right">
              <div className="relative group">
                <img 
                  src={heroImage}
                  alt="Sports Betting Analytics" 
                  className="rounded-2xl shadow-2xl transition-all duration-500 hover:scale-105 hover:shadow-glow"
                />
                <div className="absolute top-4 left-4 bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-500/30 animate-fade-in-down" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-2 text-green-300 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    AI Processing Active
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-purple-500/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30 animate-fade-in-up" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                  <div className="text-2xl font-bold text-purple-300 animate-glow">24/7</div>
                  <div className="text-xs text-gray-300">Always Learning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features" 
        ref={featuresRef.elementRef}
        className={`py-20 px-4 transition-all duration-1000 ${
          featuresRef.isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30 animate-scale-in">
              ✨ Features
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Powerful Features for{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Modern Bettors
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover how our AI-powered platform transforms the way you bet with intelligent 
              analysis, real-time insights, and enterprise-grade security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-glow group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                <CardHeader>
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-48 object-cover transition-all duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <Badge className="w-fit bg-purple-500/20 text-purple-300 border-purple-500/30 mb-2 animate-scale-in">
                    {feature.badge}
                  </Badge>
                  <CardTitle className="text-white text-xl flex items-center gap-3 group-hover:text-purple-300 transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-purple-400 group-hover:animate-pulse" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4 group-hover:text-gray-200 transition-colors duration-300">{feature.description}</p>
                  <Button variant="link" className="text-purple-400 hover:text-purple-300 p-0 hover:scale-105 transition-all duration-300">
                    Learn more →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section 
        id="pricing" 
        ref={pricingRef.elementRef}
        className={`py-20 px-4 transition-all duration-1000 ${
          pricingRef.isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30 animate-scale-in">
              💰 Pricing
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Perfect Plan
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Start free and upgrade as you grow. All plans include our core features 
              with advanced options for serious bettors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-white/5 border-white/10 backdrop-blur-sm relative hover:bg-white/10 transition-all duration-500 hover:scale-105 animate-fade-in-up group ${
                  plan.popular ? 'ring-2 ring-purple-500 scale-105 animate-glow' : ''
                }`}
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-float">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white animate-glow">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-white text-2xl group-hover:text-purple-300 transition-colors duration-300">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-purple-400 my-4 group-hover:animate-pulse">
                    {plan.price}
                    {plan.period && <span className="text-lg text-gray-400">{plan.period}</span>}
                  </div>
                  <p className="text-gray-300 group-hover:text-gray-200 transition-colors duration-300">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-gray-300 group-hover:text-gray-200 transition-all duration-300 hover:scale-105">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 group-hover:animate-pulse" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full hover:scale-105 transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 animate-glow' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    onClick={handleGetStarted}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        id="testimonials" 
        ref={testimonialsRef.elementRef}
        className={`py-20 px-4 transition-all duration-1000 ${
          testimonialsRef.isVisible ? 'animate-fade-in-up' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30 animate-scale-in">
              💬 Testimonials
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              What Our{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Users Say
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:shadow-glow group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                <CardContent className="p-6">
                  <p className="text-gray-300 mb-6 italic group-hover:text-gray-200 transition-colors duration-300">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow"
                    />
                    <div>
                      <div className="text-white font-semibold group-hover:text-purple-300 transition-colors duration-300">{testimonial.name}</div>
                      <div className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 animate-fade-in-up">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl p-12 border border-purple-500/30 hover:shadow-glow transition-all duration-500 group">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 group-hover:animate-pulse">
              Ready to Transform Your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Betting Strategy?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto group-hover:text-gray-200 transition-colors duration-300">
              Join thousands of successful bettors who trust Hype Odds for their daily analysis.
            </p>
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-12 py-6 hover:scale-110 transition-all duration-300 animate-glow"
            >
              Start Your Free Trial Today
              <TrendingUp className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 animate-fade-in-up">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0 hover:scale-105 transition-transform duration-300">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center animate-glow">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Hype Odds</span>
            </div>
            <div className="text-gray-400 text-sm hover:text-gray-300 transition-colors duration-300">
              © 2024 Hype Odds. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;