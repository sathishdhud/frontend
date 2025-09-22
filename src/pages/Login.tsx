import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../contexts/AuthContext";

const Login: React.FC = () => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  const hotelImages = [
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2070&q=80",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === hotelImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [hotelImages.length]);

  useEffect(() => {
    if (user) {
      const isHousekeeping =
        user.userTypeRole === "HOUSEKEEPING" ||
        user.userTypeId === "HOUSEKEEPING" ||
        (user.roles && user.roles.includes("HOUSEKEEPING"));

      navigate(isHousekeeping ? "/housekeeping" : "/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!userName || !password) {
      setError("Please enter both username and password");
      return;
    }
    setIsLoading(true);
    setError("");

    const success = await login(userName, password);
    if (!success) {
      setError("Invalid username or password");
    }
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row bg-gray-50">
      {/* Left side - Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 sm:px-10 lg:px-16 relative bg-gradient-to-br from-white to-gray-50">
        <div className="w-full max-w-md">
          {/* Logo and Brand */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-8 0H3m2 0h6m-8 0V9a2 2 0 012-2h2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your hotel seamlessly with{" "}
              <span className="font-semibold text-indigo-600">
                HotelManager Pro
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Streamline bookings, monitor housekeeping, and deliver premium guest
              experiences.
            </p>
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-lg bg-white/80 rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300">
            <div className="p-8">
              {error && (
                <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm">
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="userName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    User ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="userName"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your user ID"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium py-3 rounded-lg shadow-lg hover:opacity-90 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              {/* Demo credentials */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Demo: <span className="font-medium text-gray-800">admin / admin123</span>
              </div>
            </div>
          </div>

          {/* Footer Text */}
          <p className="mt-6 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} HotelManager Pro · Built for Smart Hotels
          </p>
        </div>
      </div>

      {/* Right side - Image Carousel */}
      <div className="w-full md:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60 z-10"></div>

        {hotelImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={image} className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="absolute inset-0 flex flex-col justify-center items-center z-20 text-center px-6 py-12">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Transform Your Hotel Operations Today
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">
              Experience the future of hospitality management with our intuitive platform. 
              From seamless check-ins to real-time analytics, empower your team to deliver 
              exceptional guest experiences while optimizing operational efficiency.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
                <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white font-medium">Real-time Dashboard</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
                <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white font-medium">Smart Automation</span>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-lg border border-white/20">
                <svg className="w-5 h-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white font-medium">Guest Insights</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
              <p className="text-white italic">
                "HotelManager Pro revolutionized how we operate. Our guest satisfaction scores 
                increased by 35% within the first quarter of implementation."
              </p>
              <p className="text-white/80 mt-2">— Sarah Johnson, Hotel Manager</p>
            </div>
          </div>
        </div>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2 z-20">
          {hotelImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;