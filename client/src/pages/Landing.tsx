import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CheckIcon,
  ArrowRightIcon,
  ScaleIcon,
  GlobeAltIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const Landing: React.FC = () => {
  const features = [
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'AI-Powered Legal Consultation',
      description: 'Get instant answers to your legal questions based on Jordanian law and constitution.',
    },
    {
      icon: DocumentTextIcon,
      title: 'Comprehensive Legal Database',
      description: 'Access to complete Jordanian legal framework including civil, criminal, and commercial law.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Confidential',
      description: 'Your legal consultations are protected with enterprise-grade security and privacy.',
    },
    {
      icon: ClockIcon,
      title: '24/7 Availability',
      description: 'Get legal guidance anytime, anywhere. No appointment necessary.',
    },
    {
      icon: UserGroupIcon,
      title: 'Lawyer-Verified Content',
      description: 'All responses are based on verified legal documents and reviewed by qualified lawyers.',
    },
    {
      icon: ScaleIcon,
      title: 'Case Law References',
      description: 'Get relevant case law and legal precedents to support your legal research.',
    },
  ];

  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'month',
      description: 'Perfect for occasional legal questions',
      features: [
        '10 queries per month',
        'Basic legal consultation',
        'Email support',
        'Access to constitution',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Basic',
      price: '29',
      period: 'month',
      description: 'Ideal for small law firms and individual lawyers',
      features: [
        '100 queries per month',
        'Advanced legal analysis',
        'Priority support',
        'Full legal database access',
        'Case law references',
        'Document templates',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Professional',
      price: '99',
      period: 'month',
      description: 'For established law firms and legal departments',
      features: [
        '500 queries per month',
        'Expert legal consultation',
        '24/7 phone support',
        'Custom legal research',
        'API access',
        'Team collaboration',
        'Advanced analytics',
        'White-label options',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const testimonials = [
    {
      name: 'Ahmad Al-Rashid',
      title: 'Senior Partner, Al-Rashid Law Firm',
      content: 'Jordan LawBot has revolutionized how we conduct legal research. The AI provides accurate, instant answers backed by our legal framework.',
      avatar: '/api/placeholder/64/64',
    },
    {
      name: 'Fatima Al-Zahra',
      title: 'Legal Consultant',
      content: 'As a solo practitioner, this tool has been invaluable. It\'s like having a legal library and research assistant available 24/7.',
      avatar: '/api/placeholder/64/64',
    },
    {
      name: 'Omar Khalil',
      title: 'Corporate Lawyer',
      content: 'The accuracy and depth of legal analysis provided by Jordan LawBot is impressive. It has significantly improved our efficiency.',
      avatar: '/api/placeholder/64/64',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <ScaleIcon className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Jordan LawBot</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Legal Consultation
              <span className="block text-primary-600">for Jordanian Law</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get instant, accurate legal guidance based on Jordan's constitution and legal framework. 
              Trusted by lawyers, law firms, and legal professionals across Jordan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn btn-primary btn-lg inline-flex items-center"
              >
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <button className="btn btn-secondary btn-lg">
                Watch Demo
              </button>
            </div>
            <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckIcon className="h-4 w-4 text-green-500 mr-1" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckIcon className="h-4 w-4 text-green-500 mr-1" />
                14-day free trial
              </div>
              <div className="flex items-center">
                <CheckIcon className="h-4 w-4 text-green-500 mr-1" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose Jordan LawBot?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Combining cutting-edge AI technology with comprehensive Jordanian legal knowledge 
              to provide you with the most accurate and reliable legal consultation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg mb-4">
                  <feature.icon className="h-8 w-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-primary-200">Legal Consultations</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-primary-200">Registered Lawyers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.5%</div>
              <div className="text-primary-200">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-primary-200">Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">
              Flexible pricing options to suit lawyers and law firms of all sizes
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white rounded-lg shadow-lg p-8 ${
                  plan.popular ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-primary-500 text-white px-4 py-1 text-sm font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 px-4 rounded-lg font-medium ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Legal Professionals
            </h2>
            <p className="text-xl text-gray-600">
              See what lawyers and legal experts are saying about Jordan LawBot
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Legal Practice?
          </h2>
          <p className="text-xl text-primary-200 mb-8 max-w-3xl mx-auto">
            Join hundreds of legal professionals who are already using Jordan LawBot 
            to provide better, faster legal consultation to their clients.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg inline-flex items-center"
            >
              Start Your Free Trial
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <button className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 btn-lg">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <ScaleIcon className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">Jordan LawBot</span>
              </div>
              <p className="text-gray-400">
                AI-powered legal consultation platform for Jordanian law.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Jordan LawBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;