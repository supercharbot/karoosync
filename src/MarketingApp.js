import React, { useState } from 'react';
import { Store, ArrowRight, Check, Zap, Shield, BarChart3, Menu, X, Star, Users, Clock, Play, Smartphone, Monitor, TrendingUp, RefreshCw } from 'lucide-react';

// Floating Islands Header
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-8 left-8 right-8 z-50">
      <div className="flex justify-between items-center">
        {/* Logo Island */}
        <div className="backdrop-blur-md rounded-3xl shadow-lg px-8 py-5" style={{backgroundColor: 'rgba(255, 255, 255, 0.1)'}}>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Store className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        
        {/* Center Brand Island */}
        <div className="hidden md:block backdrop-blur-md rounded-3xl shadow-lg px-10 py-5" style={{backgroundColor: 'rgba(255, 255, 255, 0.1)'}}>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            KarooSync Beta
          </span>
        </div>

        {/* Try Beta Button Island */}
        <div className="backdrop-blur-md rounded-3xl shadow-lg px-8 py-5" style={{backgroundColor: 'rgba(255, 255, 255, 0.1)'}}>
          <div className="flex items-center space-x-4">
            <a 
              href="/app" 
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-2xl hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold text-lg"
            >
              Try Beta
            </a>
            
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Island */}
      {isMenuOpen && (
        <div className="md:hidden mt-6 backdrop-blur-md rounded-3xl shadow-lg px-8 py-6" style={{backgroundColor: 'rgba(255, 255, 255, 0.1)'}}>
          <div className="flex flex-col space-y-4 text-center">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              KarooSync Beta
            </span>
            <a href="#features" className="text-white hover:text-blue-300 py-3 text-lg">Features</a>
            <a href="#demo" className="text-white hover:text-blue-300 py-3 text-lg">Demo</a>
            <a href="#contact" className="text-white hover:text-blue-300 py-3 text-lg">Contact</a>
          </div>
        </div>
      )}
    </header>
  );
};

// Hero Video Section with Local Videos
const Hero = () => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const handleVideoError = (e) => {
    console.log('Video error:', e);
    setVideoError(true);
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  return (
    <section className="relative w-full" style={{height: 'calc(100vh - 120px)', marginTop: '120px'}}>
      {/* Desktop Video Background */}
      <div className="hidden md:block absolute inset-0 w-full h-full bg-black">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
          preload="metadata"
          onError={(e) => {
            console.log('Desktop video error:', e.target.error);
            setVideoError(true);
          }}
          onLoadedData={() => {
            console.log('Desktop video loaded');
            setVideoLoaded(true);
          }}
        >
          <source src="/videos/karoosync-hero.mov" type="video/quicktime" />
        </video>
        
        {/* Fallback gradient if video fails */}
        {videoError && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{background: 'linear-gradient(to bottom right, #dbeafe, #e9d5ff)'}}>
            <div className="text-center text-gray-800">
              <h2 className="text-2xl font-light mb-4">Loading Experience...</h2>
              <p className="text-sm">Professional video loading</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Video Background */}
      <div className="md:hidden absolute inset-0 w-full h-full bg-black">
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
          preload="metadata"
          onError={(e) => {
            console.log('Mobile video error:', e.target.error);
            setVideoError(true);
          }}
          onLoadedData={() => {
            console.log('Mobile video loaded');
            setVideoLoaded(true);
          }}
        >
          <source src="/videos/karoosync-hero-mobile.mov" type="video/quicktime" />
        </video>
        
        {/* Fallback gradient if video fails */}
        {videoError && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{background: 'linear-gradient(to bottom right, #dbeafe, #e9d5ff)'}}>
            <div className="text-center text-gray-800">
              <h2 className="text-xl font-light mb-4">Loading Experience...</h2>
              <p className="text-xs">Professional video loading</p>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Content Overlay */}
      <div className="absolute inset-0 z-10 flex items-end justify-center pb-16">
        <div className="text-center text-white px-6">
          <h1 className="text-3xl md:text-5xl font-light mb-4 leading-tight">
            Better WooCommerce Management
          </h1>
          <a 
            href="/app"
            className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-3 rounded-2xl text-lg font-medium hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
          >
            Try Beta Free
            <ArrowRight className="ml-3 w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

// Clean Product Showcase Section
const ImageShowcase = () => {
  return (
    <section className="py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-light text-gray-900 mb-8">
            One Platform, Every Device
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
            Manage your entire WooCommerce store from any device with the same powerful interface
          </p>
        </div>
        
        <div className="relative">
          <img 
            src="/images/KarooSync Mix Image.png" 
            alt="KarooSync interface across desktop, tablet, and mobile devices"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
};

// Professional Features Section
const Features = () => {
  const features = [
    {
      title: "Lightning Fast Performance",
      description: "Modern architecture delivers 10x faster loading than traditional WooCommerce admin",
      icon: <Zap className="w-12 h-12 text-gray-400" />
    },
    {
      title: "Bulk Operations",
      description: "Edit hundreds of products simultaneously with intelligent batch processing",
      icon: <RefreshCw className="w-12 h-12 text-gray-400" />
    },
    {
      title: "Smart Organization",
      description: "Advanced search, filtering, and categorization for effortless inventory management",
      icon: <BarChart3 className="w-12 h-12 text-gray-400" />
    }
  ];

  return (
    <section id="features" className="py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-light text-gray-900 mb-8">
            Built for Scale
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
            Every feature designed to handle thousands of products with enterprise-grade performance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="mb-8">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-6">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed font-light">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Clean CTA Section
const FreeTrial = () => {
  return (
    <section id="trial" className="py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-light text-gray-900 mb-8">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-gray-600 mb-12 font-light max-w-2xl mx-auto">
          Join hundreds of store owners already using KarooSync to manage their WooCommerce products more efficiently
        </p>
        
        <a 
          href="/app"
          className="inline-flex items-center bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-2xl text-xl font-medium hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-6"
        >
          Start Free Trial
          <ArrowRight className="ml-3 w-6 h-6" />
        </a>
        
        <p className="text-gray-500 font-light">
          14-day free trial • No credit card required
        </p>
      </div>
    </section>
  );
};

// Simple Contact Section
const Contact = () => {
  return (
    <section id="contact" className="py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-light text-gray-900 mb-8">
          Get in Touch
        </h2>
        <p className="text-xl text-gray-600 mb-12 font-light max-w-2xl mx-auto">
          Questions about KarooSync? We're here to help you optimize your WooCommerce workflow
        </p>
        <a 
          href="mailto:hello@karoosync.com" 
          className="inline-flex items-center text-2xl font-light text-gray-900 hover:text-blue-600 transition-colors"
        >
          hello@karoosync.com
        </a>
      </div>
    </section>
  );
};

// Clean Footer
const Footer = () => {
  return (
    <footer className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-8 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-light text-gray-900">KarooSync</span>
          </div>
          <div className="text-gray-500 font-light">
            &copy; 2025 KarooSync. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Marketing App Component
const MarketingApp = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <ImageShowcase />
        <Features />
        <FreeTrial />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingApp;