import React from 'react';
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

const Landing = () => {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Hype Odds</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">How it Works</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</a>
            </nav>

            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-white hover:text-purple-300">
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
                ✨ Introducing Hype Odds AI
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                The Future of{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Sports
                </span>{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Betting
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Transform your betting strategy with our cutting-edge odds platform. 
                Streamline analysis, boost profitability, and unlock unprecedented insights 
                with intelligent automation that adapts to your needs.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-8 py-6"
                >
                  Start Free Trial
                  <TrendingUp className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleWatchDemo}
                  className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">99.9%</div>
                  <div className="text-gray-400">Uptime</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">10M+</div>
                  <div className="text-gray-400">Bets Analyzed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">500%</div>
                  <div className="text-gray-400">ROI Improvement</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <div className="relative">
                <img 
                  src={heroImage}
                  alt="Sports Betting Analytics" 
                  className="rounded-2xl shadow-2xl"
                />
                <div className="absolute top-4 left-4 bg-green-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-300 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    AI Processing Active
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-purple-500/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-purple-500/30">
                  <div className="text-2xl font-bold text-purple-300">24/7</div>
                  <div className="text-xs text-gray-300">Always Learning</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
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
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardHeader>
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <Badge className="w-fit bg-purple-500/20 text-purple-300 border-purple-500/30 mb-2">
                    {feature.badge}
                  </Badge>
                  <CardTitle className="text-white text-xl flex items-center gap-3">
                    <feature.icon className="h-6 w-6 text-purple-400" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">{feature.description}</p>
                  <Button variant="link" className="text-purple-400 hover:text-purple-300 p-0">
                    Learn more →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
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
                className={`bg-white/5 border-white/10 backdrop-blur-sm relative ${
                  plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-purple-400 my-4">
                    {plan.price}
                    {plan.period && <span className="text-lg text-gray-400">{plan.period}</span>}
                  </div>
                  <p className="text-gray-300">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-gray-300">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
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
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
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
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-6">
                  <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <div className="text-white font-semibold">{testimonial.name}</div>
                      <div className="text-gray-400 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl p-12 border border-purple-500/30">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Betting Strategy?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of successful bettors who trust Hype Odds for their daily analysis.
            </p>
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-lg px-12 py-6"
            >
              Start Your Free Trial Today
              <TrendingUp className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Hype Odds</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Hype Odds. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;