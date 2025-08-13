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
  Brain,
  Bot,
  DollarSign,
  Award,
  Users,
  CheckCircle,
  Star,
  ArrowRight,
  Sparkles
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
  const fullText = 'AI-Powered Sports Analytics Platform';

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
    console.log('Watch demo clicked');
  };

  const features = [
    {
      icon: Brain,
      badge: "AI-Powered",
      title: "Advanced Predictive Analytics",
      description: "Stop losing money on gut feelings. Our machine learning algorithms analyze millions of data points to give you crystal-clear insights that consistently outperform traditional analysis methods.",
      image: featureAi
    },
    {
      icon: Clock,
      badge: "Real-Time",
      title: "Live Market Intelligence",
      description: "Never miss another opportunity. Get instant alerts on market changes, value discoveries, and trend shifts before everyone else, so you can act with confidence every single time.",
      image: featureAnalytics
    },
    {
      icon: Shield,
      badge: "Enterprise",
      title: "Bank-Grade Security",
      description: "Your strategies are your competitive advantage. Military-grade encryption ensures your analytical edge stays protected from competitors and data breaches.",
      image: featureSecurity
    },
    {
      icon: Bot,
      badge: "Automated",
      title: "Smart Analysis Automation",
      description: "Stop spending endless hours on manual research. Our intelligent system works 24/7 to identify profitable patterns and opportunities while you focus on what matters most.",
      image: featureAutomation
    }
  ];

  const testimonials = [
    {
      name: "Marcus Thompson",
      role: "Sports Data Analyst",
      content: "I was losing sleep over inconsistent results. Now I sleep peacefully knowing my analysis is backed by AI that never misses a pattern. My success rate increased 34% in just 3 months.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Elena Kowalski",
      role: "Financial Analyst", 
      content: "I used to waste 12 hours daily on manual research with mediocre results. This platform gave me back my weekends and multiplied my accuracy. It's life-changing.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b0e9?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "David Chen",
      role: "Investment Team Lead",
      content: "The fear of making wrong decisions kept me up at night. Now I have the confidence of AI-backed insights. Our team's performance jumped 67% - we finally found our edge.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face"
    }
  ];

  const pricingPlans = [
    {
      name: "Explorer",
      price: "Free",
      description: "Perfect for newcomers",
      features: [
        "Basic AI predictions",
        "5 markets access",
        "Standard analytics",
        "Community support"
      ]
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "For data professionals",
      features: [
        "Advanced AI models",
        "All sports & markets",
        "Real-time insights",
        "Priority support",
        "Custom analysis",
        "API access"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For analysis teams",
      features: [
        "Everything in Professional",
        "Multi-account management",
        "Custom integrations", 
        "Dedicated support",
        "White-label solutions",
        "Team collaboration tools"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-950 to-background relative overflow-hidden">
      {/* Custom Cursor */}
      <div 
        className="fixed w-6 h-6 pointer-events-none z-50 mix-blend-difference"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transition: 'all 0.1s ease-out'
        }}
      >
        <div className="w-full h-full bg-primary rounded-full animate-ai-pulse"></div>
      </div>

      {/* Particle Background */}
      <ParticleBackground />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-background/20 backdrop-blur-md border-b border-border animate-fade-in-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 animate-fade-in-left">
              <div className="w-8 h-8 bg-gradient-ai rounded-lg flex items-center justify-center animate-ai-pulse">
                <Brain className="h-5 w-5 text-background" />
              </div>
              <span className="text-xl font-bold text-foreground">Sports Analytics Pro</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8 animate-fade-in-up">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Analytics</a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Pricing</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Success Stories</a>
            </nav>

            <div className="flex items-center gap-4 animate-fade-in-right">
              <Button variant="ghost" className="text-foreground hover:text-primary hover:scale-105 transition-all duration-300">
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-gradient-primary hover:shadow-glow hover:scale-105 transition-all duration-300"
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
              <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 animate-scale-in hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-4 h-4 mr-2" />
                The End of Guesswork
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                <div className="inline-block animate-fade-in-left">
                  {typedText}
                  <span className="animate-blink text-primary">|</span>
                </div>
              </h1>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  <strong className="text-destructive">Tired of losing money on gut feelings?</strong> Stop the frustration of inconsistent results. 
                  Our AI processes millions of data points to give you the confidence and clarity you've been searching for. 
                  <strong className="text-success">Finally, make decisions backed by intelligence, not emotion.</strong>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleWatchDemo}
                  className="border-primary/30 text-primary hover:bg-primary/10 text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch AI Demo
                </Button>
              </div>
              
              {/* Stats */}
              <div ref={statsRef} className="grid grid-cols-3 gap-8 text-center">
                <div className={`transition-all duration-500 ${visibleStats.has(0) ? 'animate-scale-in' : 'opacity-0 scale-75'}`}>
                  <div className="text-3xl font-bold text-primary mb-2 animate-float">99.7%</div>
                  <div className="text-muted-foreground">Prediction Accuracy</div>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(1) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.2s' }}>
                  <div className="text-3xl font-bold text-success mb-2 animate-float" style={{ animationDelay: '0.5s' }}>125M+</div>
                  <div className="text-muted-foreground">Data Points Processed</div>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(2) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.4s' }}>
                  <div className="text-3xl font-bold text-warning mb-2 animate-float" style={{ animationDelay: '1s' }}>847%</div>
                  <div className="text-muted-foreground">Average ROI Boost</div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative animate-fade-in-right">
              <div className="relative group">
                <img 
                  src={heroImage}
                  alt="Sports Analytics Dashboard" 
                  className="rounded-2xl shadow-elegant transition-all duration-500 hover:scale-105 hover:shadow-ai-glow"
                />
                <div className="absolute top-4 left-4 bg-success/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-success/30 animate-fade-in-down" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-2 text-success text-sm">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    AI Model Training
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-primary/30 animate-fade-in-up" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                  <div className="text-2xl font-bold text-primary animate-glow">24/7</div>
                  <div className="text-xs text-foreground">Neural Networks</div>
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
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 animate-scale-in">
              <Bot className="w-4 h-4 mr-2" />
              AI Technology
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Stop Making These{' '}
              <span className="bg-gradient-to-r from-destructive to-warning bg-clip-text text-transparent">
                Costly Mistakes
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-destructive">The pain of inconsistent results ends here.</strong> Our AI eliminates the guesswork, 
              emotional decisions, and sleepless nights. <strong className="text-success">Transform frustration into confidence.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="bg-card/50 border-border backdrop-blur-sm hover:bg-card/80 transition-all duration-500 hover:scale-105 hover:shadow-ai-glow group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                <CardHeader>
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <img 
                      src={feature.image} 
                      alt={feature.title}
                      className="w-full h-48 object-cover transition-all duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <Badge className="w-fit bg-primary/20 text-primary border-primary/30 mb-2 animate-scale-in">
                    {feature.badge}
                  </Badge>
                  <CardTitle className="text-foreground text-xl flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-primary group-hover:animate-ai-pulse" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 group-hover:text-foreground/80 transition-colors duration-300">{feature.description}</p>
                  <Button variant="link" className="text-primary hover:text-primary/80 p-0 hover:scale-105 transition-all duration-300">
                    Explore feature →
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
            <Badge className="mb-4 bg-warning/20 text-warning border-warning/30 animate-scale-in">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing Plans
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Stop Losing Money.{' '}
              <span className="bg-gradient-success bg-clip-text text-transparent">
                Start Winning.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-destructive">How much have you lost to bad decisions?</strong> Every day you wait is money left on the table. 
              <strong className="text-success">Choose the plan that finally gives you the edge you deserve.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-card/50 border-border backdrop-blur-sm relative hover:bg-card/80 transition-all duration-500 hover:scale-105 animate-fade-in-up group ${
                  plan.popular ? 'ring-2 ring-primary scale-105 shadow-ai-glow' : ''
                }`}
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-float">
                    <Badge className="bg-gradient-primary text-background shadow-glow">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-foreground text-2xl group-hover:text-primary transition-colors duration-300">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                        <CheckCircle className="h-5 w-5 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-gradient-primary hover:shadow-glow' 
                        : 'bg-secondary hover:bg-secondary/80'
                    } hover:scale-105 transition-all duration-300`}
                    onClick={handleGetStarted}
                  >
                    {plan.price === 'Free' ? 'Start Free' : 'Choose Plan'}
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
            <Badge className="mb-4 bg-success/20 text-success border-success/30 animate-scale-in">
              <Award className="w-4 h-4 mr-2" />
              Success Stories
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              From Frustration to{' '}
              <span className="bg-gradient-success bg-clip-text text-transparent">
                Financial Freedom
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-destructive">They were exactly where you are now.</strong> Frustrated, losing money, stressed about every decision. 
              <strong className="text-success">Here's how they turned it all around.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card 
                key={index} 
                className="bg-card/50 border-border backdrop-blur-sm hover:bg-card/80 transition-all duration-500 hover:scale-105 hover:shadow-success-glow group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full border-2 border-primary group-hover:border-success transition-colors duration-300"
                    />
                    <div>
                      <h4 className="font-semibold text-foreground group-hover:text-success transition-colors duration-300">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic group-hover:text-foreground/80 transition-colors duration-300">
                    "{testimonial.content}"
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-ai">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-background mb-4 animate-fade-in-up">
            Stop the Bleeding. Start Winning.
          </h2>
          <p className="text-xl text-background/80 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <strong>Every day you wait costs you money.</strong> Join thousands who've already escaped the cycle of frustration and losses. 
            <strong>Your breakthrough moment starts now.</strong>
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="bg-background text-primary hover:bg-background/90 hover:scale-105 transition-all duration-300 text-lg px-8 py-6 animate-fade-in-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-background/50 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-ai rounded flex items-center justify-center">
                <Brain className="h-4 w-4 text-background" />
              </div>
              <span className="font-bold text-foreground">Sports Analytics Pro</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 Sports Analytics Pro. Advanced predictive intelligence for sports markets.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;