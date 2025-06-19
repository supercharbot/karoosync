import React, { useState } from 'react';
import { Store, ArrowRight, Check, Zap, Shield, BarChart3, Menu, X, Star, Users, Clock } from 'lucide-react';

// Header Component
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Karoosync
            </span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#trial" className="text-gray-600 hover:text-gray-900 transition-colors">Free Trial</a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            <a 
              href="/app" 
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Start Free Trial
            </a>
          </nav>

          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#trial" className="text-gray-600 hover:text-gray-900">Free Trial</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
              <a href="/app" className="bg-blue-500 text-white px-4 py-2 rounded-lg text-center">
                Start Free Trial
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Hero Section
const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Sync Your 
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}WooCommerce{" "}
            </span>
            Products Effortlessly
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Streamline your product management with our powerful WooCommerce synchronization tool. 
            Edit, update, and manage thousands of products with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/app"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <button className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition-colors">
              Watch Demo
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
        </div>
      </div>
    </section>
  );
};

// Features Section
const Features = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: "Lightning Fast Sync",
      description: "Synchronize thousands of products in seconds with our optimized API connections."
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with AWS infrastructure ensures your data is always safe."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-purple-500" />,
      title: "Advanced Analytics",
      description: "Track sync performance and product updates with detailed insights and reporting."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Why Choose Karoosync?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Built specifically for WooCommerce stores that need powerful, reliable product management.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-6 shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Free Trial Section (replaces Pricing)
const FreeTrial = () => {
  const benefits = [
    "14-day free trial with full access",
    "Sync up to 1,000 products",
    "Real-time product updates",
    "Email support included",
    "No setup fees or contracts",
    "Cancel anytime"
  ];

  const testimonials = [
    { name: "Sarah M.", business: "Fashion Store", text: "Saved me hours every week!" },
    { name: "Mike T.", business: "Electronics Shop", text: "Game changer for product management." },
    { name: "Lisa K.", business: "Home Decor", text: "So easy to use and powerful." }
  ];

  return (
    <section id="trial" className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Start Your Free Trial Today
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the power of Karoosync with our 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div>
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <div className="flex items-center mb-6">
                <div className="bg-green-100 rounded-full p-3 mr-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Everything Included</h3>
              </div>
              
              <ul className="space-y-4 mb-8">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>1,000+ happy customers</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-500" />
                    <span>4.9/5 rating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - CTA */}
          <div className="text-center">
            <div className="bg-white rounded-2xl p-8 shadow-xl mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-white" />
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-8">
                Join thousands of WooCommerce store owners who trust Karoosync for their product management.
              </p>
              
              <a 
                href="/app"
                className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-lg text-xl font-semibold hover:shadow-xl transition-all duration-300 transform hover:scale-105 mb-4"
              >
                Start Free Trial
              </a>
              
              <p className="text-sm text-gray-500">
                14 days free • No credit card required
              </p>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 gap-4">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white/70 backdrop-blur-sm rounded-lg p-4 text-left">
                  <p className="text-sm text-gray-700 italic mb-2">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs font-bold">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-xs text-gray-500">{testimonial.business}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Contact Section
const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-8">Contact Us</h2>
        <p className="text-xl text-gray-600 mb-8">
          Have questions? We'd love to hear from you.
        </p>
        <div className="bg-gray-50 p-8 rounded-2xl shadow-lg">
          <div className="space-y-6">
            <input 
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input 
              type="email"
              name="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea 
              name="message"
              placeholder="Your Message"
              rows="6"
              value={formData.message}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            ></textarea>
            <button 
              onClick={handleSubmit}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Karoosync</span>
          </div>
          <div className="flex space-x-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#trial" className="text-gray-400 hover:text-white transition-colors">Free Trial</a>
            <a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Karoosync. All rights reserved.</p>
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
        <Features />
        <FreeTrial />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default MarketingApp;