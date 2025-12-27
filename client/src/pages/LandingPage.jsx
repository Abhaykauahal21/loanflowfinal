import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BackgroundBeams } from '../components/ui/background-beams';
import { BackgroundGradient } from '../components/ui/background-gradient';
import { TypewriterEffect } from '../components/ui/typewriter-effect';
import { WavyBackground } from '../components/ui/wavy-background';
import { LampContainer } from '../components/ui/lamp';
import { motion } from 'framer-motion';
import { 
  IconArrowRight, 
  IconBuildingBank, 
  IconCoin, 
  IconShieldLock, 
  IconUserCheck,
  IconRocket,
  IconTrendingUp,
  IconClock,
  IconAward
} from '@tabler/icons-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const MotionH1 = motion.h1;
  const MotionP = motion.p;
  const MotionDiv = motion.div;

  const words = [
    { text: "Smart", className: "text-blue-400" },
    { text: "Secure", className: "text-violet-400" },
    { text: "Loan", className: "text-cyan-400" },
    { text: "Solutions", className: "text-pink-400" }
  ];

  const features = [
    {
      icon: <IconRocket className="h-10 w-10" />,
      title: "Instant Approval",
      description: "Get loan approval within 2 hours with our AI-powered processing system",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <IconShieldLock className="h-10 w-10" />,
      title: "Bank-Grade Security",
      description: "256-bit encryption and multi-factor authentication protect your data",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <IconTrendingUp className="h-10 w-10" />,
      title: "Best Rates",
      description: "Competitive interest rates starting from 8.5% with flexible terms",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <IconClock className="h-10 w-10" />,
      title: "24/7 Support",
      description: "Round-the-clock customer support for all your loan needs",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const processSteps = [
    {
      title: "Apply Online",
      description: "Complete our simple 5-minute application form with basic details",
      icon: "📝",
      color: "blue"
    },
    {
      title: "Get Verified",
      description: "Quick document verification with our automated KYC process",
      icon: "✅",
      color: "green"
    },
    {
      title: "Receive Funds",
      description: "Instant disbursement to your bank account upon approval",
      icon: "💰",
      color: "purple"
    }
  ];

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const stats = [
    { number: "50K+", label: "Happy Customers" },
    { number: "₹500Cr+", label: "Loan Disbursed" },
    { number: "98%", label: "Approval Rate" },
    { number: "2Hrs", label: "Average Processing" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Enhanced Hero Section with Lamp Effect */}
      <div className="relative">
        <LampContainer>
          <MotionH1
            initial={{ opacity: 0.5, y: 100 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
          >
            <TypewriterEffect words={words} />
          </MotionH1>
        </LampContainer>
        
        <div className="relative z-20 max-w-6xl mx-auto px-4 -mt-20">
          <div className="text-center space-y-8">
            <MotionP 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              Transform your financial journey with our AI-powered loan platform. 
              Fast, transparent, and designed for your success.
            </MotionP>
            
            <MotionDiv 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <BackgroundGradient className="rounded-[20px] p-1">
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center rounded-[19px] px-12 py-4 text-lg font-bold bg-slate-950 text-white hover:bg-slate-900 transition-all duration-300 group"
                >
                  {user ? 'Go to Dashboard' : 'Start Your Application'}
                  <IconArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </BackgroundGradient>
              
              {!user && (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center px-8 py-4 text-lg font-semibold text-slate-300 hover:text-white border border-slate-700 rounded-[19px] hover:border-slate-500 transition-all duration-300 group"
                >
                  Existing Customer
                  <IconArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </MotionDiv>

            {/* Stats Section */}
            <MotionDiv 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-slate-400 text-sm md:text-base mt-2">{stat.label}</div>
                </div>
              ))}
            </MotionDiv>
          </div>
        </div>
      </div>

      {/* Enhanced Features Section with Wavy Background */}
      {!user && (
        <>
          <WavyBackground className="max-w-7xl mx-auto px-4 py-24">
            <div className="relative z-10">
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-20"
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Why We're The{' '}
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Best Choice
                  </span>
                </h2>
                <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                  Experience the future of lending with our cutting-edge platform
                </p>
              </MotionDiv>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <MotionDiv
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="group"
                  >
                    <BackgroundGradient className="rounded-2xl p-8 h-full">
                      <div className="space-y-6 text-center">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300`}>
                          <div className="text-white">
                            {feature.icon}
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                        <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                      </div>
                    </BackgroundGradient>
                  </MotionDiv>
                ))}
              </div>
            </div>
          </WavyBackground>

          {/* How It Works Section */}
          <div className="bg-slate-900 py-24">
            <div className="max-w-6xl mx-auto px-4">
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-center mb-20"
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  How It{' '}
                  <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                    Works
                  </span>
                </h2>
                <p className="text-xl text-slate-300">Get your loan in three simple steps</p>
              </MotionDiv>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {processSteps.map((step, index) => (
                  <MotionDiv
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className="relative"
                  >
                    <BackgroundGradient className="rounded-2xl p-8 h-full">
                      <div className="text-center space-y-6">
                        <div className="text-4xl">{step.icon}</div>
                        <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <h3 className="text-2xl font-bold text-white">{step.title}</h3>
                        <p className="text-slate-300">{step.description}</p>
                      </div>
                    </BackgroundGradient>
                  </MotionDiv>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced CTA Section */}
          <div className="relative py-24">
            <BackgroundBeams />
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
              <MotionDiv
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7 }}
              >
                <BackgroundGradient className="rounded-3xl p-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <IconAward className="h-16 w-16 text-yellow-400 mx-auto" />
                      <h2 className="text-4xl md:text-5xl font-bold">
                        Ready to <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Transform</span> Your Future?
                      </h2>
                      <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        Join over 50,000 customers who have achieved their dreams with our financial solutions
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                      <button
                        onClick={handleGetStarted}
                        className="inline-flex items-center rounded-full px-12 py-4 text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 group shadow-2xl"
                      >
                        Apply Now
                        <IconRocket className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                      
                      <button
                        onClick={handleLogin}
                        className="inline-flex items-center rounded-full px-8 py-4 text-lg font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 transition-all duration-300 group"
                      >
                        Customer Login
                        <IconArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    
                    <div className="pt-8 border-t border-slate-700">
                      <p className="text-slate-400 text-sm">
                        ⚡ No hidden fees • 🔒 100% Secure • 🏆 Award-winning service
                      </p>
                    </div>
                  </div>
                </BackgroundGradient>
              </MotionDiv>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LandingPage;
