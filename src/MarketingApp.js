import React, { useState, useEffect } from 'react';

const MarketingApp = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const videoRef = React.useRef(null);

  // Gallery data
  const galleryItems = [
    {
      image: '/images/Sync Desktop.png',
      title: 'Sync Your Store',
      description: 'Connect and synchronize your WooCommerce store seamlessly'
    },
    {
      image: '/images/Category View Desktop.png',
      title: 'Explore your Categories',
      description: 'Browse and manage your product categories with ease'
    },
    {
      image: '/images/Product View Desktop.png',
      title: 'Explore Products Within your Categories',
      description: 'View and organize products within specific categories'
    },
    {
      image: '/images/Edit View Desktop.png',
      title: 'See Product Information and Make Changes',
      description: 'Edit product details and update information instantly'
    },
    {
      image: '/images/Create View Desktop.png',
      title: 'Creating Simple and Variable Products',
      description: 'Create new products with simple or complex variations'
    }
  ];

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Auto-advance gallery
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryItems.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [galleryItems.length]);

  const handleVideoError = (e) => {
    console.error('Video failed to load:', e);
    setVideoError(true);
  };

  const handleVideoCanPlay = (e) => {
    console.log('Video can play');
    const video = e.target;
    
    // Try to play the video
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Autoplay started successfully');
          setIsPlaying(true);
          setShowPlayButton(false);
        })
        .catch((error) => {
          console.log('Autoplay blocked, showing play button:', error);
          setShowPlayButton(true);
          setIsPlaying(false);
        });
    }
  };

  const handlePlayClick = () => {
    const video = document.querySelector('video');
    if (video) {
      video.play()
        .then(() => {
          setIsPlaying(true);
          setShowPlayButton(false);
        })
        .catch((error) => {
          console.error('Manual play failed:', error);
        });
    }
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Play/pause toggle failed:', error);
          });
      }
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Combined Header and Hero Section with Background Image */}
      <section className="w-full relative" style={{ height: isMobile ? '100vh' : '620px' }}>
        {/* Background Image */}
        <img 
          src={isMobile ? "/images/Mobile Background.png" : "/images/KarooSync Background.png"}
          alt="KarooSync Background" 
          className="absolute inset-0 w-full h-full object-cover"
          style={isMobile ? { 
            objectFit: 'cover',
            objectPosition: 'center top',
            minWidth: '100%',
            minHeight: '100%'
          } : {}}
        />
        
        {/* Header */}
        <header className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between relative z-20">
          {/* Logo - Always visible */}
          <div className="flex items-center drop-shadow-sm">
            <img 
              src="/favicon.svg" 
              alt="KarooSync Logo" 
              className="w-8 h-8 md:w-12 md:h-12"
            />
          </div>

          {/* Company Name - Always in center */}
          <div className="absolute left-1/2 transform -translate-x-1/2 drop-shadow-sm">
            <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">KarooSync</span>
              <span className="text-gray-600 ml-2">BETA</span>
            </h1>
          </div>

          {/* Try Beta Button */}
          <button 
            onClick={() => {
              console.log('Try BETA button clicked');
              window.location.href = '/app';
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-3 py-1.5 md:px-6 md:py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer drop-shadow-sm"
          >
            Try BETA
          </button>
        </header>

        {/* Mobile: Tagline below header, Desktop: Original hero text */}
        {isMobile ? (
          <div className="absolute top-16 left-0 right-0 z-10 px-4">
            <p className="text-lg font-bold text-gray-600 text-center">
              WooCommerce Management Made Easy
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-start z-10 pl-12">
            <div className="text-left">
              <h2 className="text-8xl font-black mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent leading-none" style={{ lineHeight: '1.1', paddingBottom: '0.1em' }}>
                KarooSync
              </h2>
              <p className="text-4xl font-bold text-gray-600">
                WooCommerce Management Made Easy
              </p>
            </div>
          </div>
        )}

        {/* Open Beta Button - Bottom Left */}
        <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 z-10">
          <button 
            onClick={() => window.location.href = '/app'}
            className="bg-transparent border-2 border-gray-600 text-gray-600 px-4 py-2 md:px-8 md:py-3 rounded-lg font-bold text-sm md:text-lg transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:border-blue-500 hover:text-white"
          >
            Open BETA
          </button>
        </div>
      </section>

      {/* Hero Video Section */}
      <section className="w-full relative">
        <div className="w-full relative">
          {videoError ? (
            <div className="w-full h-96 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <div className="text-white text-center">
                <h2 className="text-2xl font-bold mb-2">KarooSync</h2>
                <p>Video temporarily unavailable</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="metadata"
                className="w-full h-auto object-cover"
                style={{
                  maxWidth: '100%',
                  height: 'auto'
                }}
                onError={handleVideoError}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={handleVideoCanPlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              >
                <source
                  src={isMobile 
                    ? "https://karoosync.s3.ap-southeast-2.amazonaws.com/assets/KarooSync+Hero+Mobile.mp4"
                    : "https://karoosync.s3.ap-southeast-2.amazonaws.com/assets/KarooSync+Hero+Desktop.mp4"
                  }
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
              
              {/* Play Button Overlay */}
              {showPlayButton && !isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer"
                  onClick={handlePlayClick}
                >
                  <div className="bg-white bg-opacity-90 rounded-full p-6 hover:bg-opacity-100 transition-all duration-200 shadow-lg">
                    <svg 
                      className="w-16 h-16 text-blue-500" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Play/Pause Control Button - Bottom Right */}
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  onClick={toggleVideoPlayback}
                  className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-200"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section className="w-full relative py-10 md:py-20" style={{
        backgroundImage: 'url(/images/Background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Gallery Title */}
          <h3 className="text-2xl md:text-4xl font-bold text-gray-600 text-center mb-6 md:mb-8">
            Explore Our Flow
          </h3>

          {/* Gallery Container */}
          <div className="relative">
            {/* Image and Content */}
            <div className="flex flex-col items-center gap-4 md:gap-6">
              {/* Large Image with Navigation Dots */}
              <div className="w-full max-w-4xl relative">
                <img
                  src={galleryItems[currentSlide].image}
                  alt={galleryItems[currentSlide].title}
                  className="w-full h-auto rounded-lg md:rounded-xl shadow-2xl"
                />
                
                {/* Navigation Dots Overlay */}
                <div className="absolute bottom-3 md:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
                  {galleryItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 border-2 ${
                        index === currentSlide
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-white'
                          : 'bg-gray-800 border-white hover:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Text Content Below Image */}
              <div className="text-center max-w-3xl px-4">
                <h4 className="text-xl md:text-4xl font-bold text-gray-800 mb-2 md:mb-4">
                  {galleryItems[currentSlide].title}
                </h4>
                <p className="text-sm md:text-2xl text-gray-600 leading-relaxed">
                  {galleryItems[currentSlide].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Section - Mobile only */}
      {isMobile && (
        <section className="w-full relative">
          <img
            src="/images/Spacing.png"
            alt="Spacing"
            className="w-full h-auto"
          />
          
          {/* Continuous promotional text starting at top of spacing image */}
          <div className="absolute top-4 left-4 right-4 z-30">
            <h3 className="text-2xl font-bold text-gray-600 text-left leading-tight">
              Try the <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">BETA</span> for Free, No Credit Card, Just You and Your Store
            </h3>
          </div>
        </section>
      )}

      {/* KarooSync Mix Image Section */}
      <section className="w-full relative">
        <div className="w-full">
          <img
            src="/images/KarooSync Mix Image.png"
            alt="KarooSync Mix"
            className="w-full h-auto object-cover"
            style={{
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* Promotional Text Overlay - Desktop only */}
        {!isMobile && (
          <>
            <div className="absolute top-16 left-12 z-10 right-auto">
              <h3 className="text-6xl font-bold text-gray-600 max-w-3xl leading-tight">
                Try the <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">BETA</span> for Free, No Credit Card, Just You and Your Store
              </h3>
            </div>

            {/* Join Now Button - Desktop: Top Right */}
            <div className="absolute top-16 right-12 z-10">
              <button 
                onClick={() => window.location.href = '/app'}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 rounded-lg font-bold text-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Join Now
              </button>
            </div>
          </>
        )}

      </section>
    </div>
  );
};

export default MarketingApp;