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
  const fullText = 'Le foot te fait vibrer. Garde la lucidité.';

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
      badge: "Modèles IA",
      title: "Modèles de Probabilités",
      description: "Tendance du match, profil de marquage, effets de game-state. Entrées visibles, sorties compréhensibles. Fini le brouillard d'infos - tu gardes la lucidité même quand ça chauffe.",
      image: featureAi
    },
    {
      icon: Clock,
      badge: "Real-Time", 
      title: "Signaux des Moments Clés",
      description: "Compos, blessures, bascules tactiques… résumés en signaux nets. Recevez en temps utile les informations vraiment importantes, sans le bruit de fond.",
      image: featureAnalytics
    },
    {
      icon: Shield,
      badge: "Enterprise",
      title: "Qualité & Sécurité",
      description: "Pipelines validés, versions publiées, rôles & accès. Votre cadre d'analyse reste solide et sécurisé, match après match, saison après saison.",
      image: featureSecurity
    },
    {
      icon: Bot,
      badge: "Automated",
      title: "Routine qui Rassure",
      description: "Vues, notes, exports CSV/API, traçabilité. Même exigence, chaque match. Développez une routine fiable qui tient même sous pression.",
      image: featureAutomation
    }
  ];

  const testimonials = [
    {
      name: "Marcus Thompson",
      role: "Analyste, club pro",
      content: "Je prépare les gros matchs sans stress et avec une lecture cohérente. Les modèles expliqués m'ont donné un cadre qui tient, même sur les matchs les plus tendus.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "Elena Kowalski",
      role: "Producteur TV", 
      content: "Les probabilités expliquées ont clarifié nos émissions d'avant-match. Toute l'équipe suit maintenant le même cadre d'analyse, c'est plus fluide et crédible.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b0e9?w=60&h=60&fit=crop&crop=face"
    },
    {
      name: "David Chen",
      role: "Lead Data",
      content: "Exports propres, API simple : toute l'équipe suit le même cadre. Routine fiable qui nous fait gagner un temps précieux sur l'analyse quotidienne.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face"
    }
  ];

  const pricingPlans = [
    {
      name: "Explorer",
      price: "Free",
      description: "Perfect for football fans",
      features: [
        "Basic football predictions",
        "5 major leagues access",
        "Standard match analysis",
        "Community support"
      ]
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "For football professionals",
      features: [
        "Advanced football AI models",
        "All leagues & tournaments",
        "Real-time match insights",
        "Priority support",
        "Custom team analysis",
        "API access"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "For football analysis teams",
      features: [
        "Everything in Professional",
        "Multi-league management",
        "Custom integrations", 
        "Dedicated support",
        "White-label solutions",
        "Team collaboration tools"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-slate-50 to-background relative overflow-hidden">
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
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border animate-fade-in-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 animate-fade-in-left">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center animate-ai-pulse">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Football Analytics Pro</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8 animate-fade-in-up">
              <a href="#features" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Football AI</a>
              <a href="#pricing" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Pricing</a>
              <a href="#testimonials" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110">Football Experts</a>
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
              <Badge className="mb-6 bg-success/20 text-success border-success/30 animate-scale-in hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-4 h-4 mr-2" />
                Quand tout s'accélère, ton cadre doit tenir
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                <div className="inline-block animate-fade-in-left">
                  {typedText}
                  <span className="animate-blink text-primary">|</span>
                </div>
              </h1>
              
              <div className="animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  <strong className="text-destructive">Marre des lectures qui déraillent sur les gros matchs ?</strong> Notre IA transforme le brouillard d'infos en repères clairs et expliqués. 
                  <strong className="text-success">Enfin, un cadre clair pour lire les gros matchs sans te laisser embarquer.</strong> Tu vis le frisson… avec la tête froide.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'both' }}>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-gradient-primary hover:shadow-glow text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
                >
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={handleWatchDemo}
                  className="border-primary/30 text-primary hover:bg-primary/10 text-lg px-8 py-6 hover:scale-105 transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Voir la démo (2 min)
                </Button>
              </div>
              
              {/* Stats remplacées par des chips neutres */}
              <div ref={statsRef} className="flex flex-wrap justify-center gap-4 text-center">
                <div className={`transition-all duration-500 ${visibleStats.has(0) ? 'animate-scale-in' : 'opacity-0 scale-75'}`}>
                  <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2 text-sm">
                    Modèles explicables
                  </Badge>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(1) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.2s' }}>
                  <Badge className="bg-success/20 text-success border-success/30 px-4 py-2 text-sm">
                    Compétitions majeures
                  </Badge>
                </div>
                <div className={`transition-all duration-500 ${visibleStats.has(2) ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.4s' }}>
                  <Badge className="bg-success/20 text-success border-success/30 px-4 py-2 text-sm">
                    API & exports
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative animate-fade-in-right">
              <div className="relative group">
                <img 
                  src={heroImage}
                  alt="Football Analytics Dashboard" 
                  className="rounded-2xl shadow-elegant transition-all duration-500 hover:scale-105 hover:shadow-ai-glow"
                />
                <div className="absolute top-4 left-4 bg-success/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-success/30 animate-fade-in-down" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                  <div className="flex items-center gap-2 text-success text-sm">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    AI Football Analysis Active
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-4 py-3 border border-primary/30 animate-fade-in-up" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                  <div className="text-2xl font-bold text-primary animate-glow">45+</div>
                  <div className="text-xs text-foreground/70">Football Leagues</div>
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
            <Badge className="mb-4 bg-success/20 text-success border-success/30 animate-scale-in">
              <Bot className="w-4 h-4 mr-2" />
              Football AI Technology
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Quand tout s'accélère,{' '}
              <span className="bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                ton cadre doit tenir
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-destructive">Infos partout, essentiel nulle part.</strong> La compo tombe, ta lecture vacille. Chaque soir un autre rituel : impossible d'être constant. 
              <strong className="text-success">Notre IA transforme le chaos en repères fiables.</strong>
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
                  <Badge className="w-fit bg-success/20 text-success border-success/30 mb-2 animate-scale-in">
                    {feature.badge}
                  </Badge>
                  <CardTitle className="text-foreground text-xl flex items-center gap-3 group-hover:text-success transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-success group-hover:animate-ai-pulse" />
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 group-hover:text-foreground/80 transition-colors duration-300">{feature.description}</p>
                  <Button variant="link" className="text-success hover:text-success/80 p-0 hover:scale-105 transition-all duration-300">
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
            <Badge className="mb-4 bg-success/20 text-success border-success/30 animate-scale-in">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing Plans
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Choisissez Votre{' '}
              <span className="bg-gradient-success bg-clip-text text-transparent">
                Niveau d'Analyse.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-primary">Trouvez le cadre qui correspond à vos besoins d'analyse.</strong> Chaque match analysé sans structure solide vous fait perdre en clarté. 
              <strong className="text-success">Choisissez l'approche qui vous donnera enfin une routine fiable.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`bg-card/50 border-border backdrop-blur-sm relative hover:bg-card/80 transition-all duration-500 hover:scale-105 animate-fade-in-up group ${
                  plan.popular ? 'ring-2 ring-success scale-105 shadow-success-glow' : ''
                }`}
                style={{ animationDelay: `${index * 0.2}s`, animationFillMode: 'both' }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-float">
                    <Badge className="bg-gradient-success text-white shadow-success-glow">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-foreground text-2xl group-hover:text-success transition-colors duration-300">{plan.name}</CardTitle>
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
                        ? 'bg-gradient-success hover:shadow-success-glow' 
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
              De la Confusion à{' '}
              <span className="bg-gradient-success bg-clip-text text-transparent">
                la Clarté
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              <strong className="text-primary">Ils cherchaient aussi une approche plus cohérente.</strong> Fatigués des lectures approximatives et des doutes constants sur les gros matchs. 
              <strong className="text-success">Voici comment ils ont trouvé leur routine d'analyse fiable.</strong>
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
      <section className="py-20 px-4 bg-gradient-success">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4 animate-fade-in-up">
            Retrouvez le plaisir des gros matchs, en gardant la tête froide
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <strong>Chaque match vécu dans la confusion vous éloigne du vrai plaisir du foot.</strong> Rejoignez des milliers de passionnés qui ont retrouvé la sérénité face aux gros matchs. 
            <strong>Votre routine d'analyse claire commence maintenant.</strong>
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="bg-white text-success hover:bg-white/90 hover:scale-105 transition-all duration-300 text-lg px-8 py-6 animate-fade-in-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-muted/50 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-success rounded flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-foreground">Football Analytics Pro</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-muted-foreground text-sm mb-2">
                © 2024 Football Analytics Pro. Plateforme d'analyse sportive.
              </p>
              <p className="text-muted-foreground text-xs">
                Plateforme d'analyse. Aucun conseil financier ou de mise. Aucun résultat n'est garanti.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;