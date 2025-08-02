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
      <section className="w-full relative" style={{ height: '620px' }}>
        {/* Background Image */}
        <img 
          src="/images/KarooSync Background.png" 
          alt="KarooSync Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Header */}
        <header className="w-full px-6 py-4 flex items-center justify-between relative z-10">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/favicon.svg" 
              alt="KarooSync Logo" 
              className="w-12 h-12"
            />
          </div>

          {/* Company Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">KarooSync</span>
              <span className="text-gray-600 ml-2">BETA</span>
            </h1>
          </div>

          {/* Try Beta Button */}
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl">
            Try BETA
          </button>
        </header>

        {/* Hero Text Content */}
        <div className="absolute inset-0 flex items-center justify-start z-10 pl-12">
          <div className="text-left">
            <h2 className="text-8xl font-black mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              KarooSync
            </h2>
            <p className="text-4xl font-bold text-gray-600">
              WooCommerce Management Made Easy
            </p>
          </div>
        </div>

        {/* Open Beta Button - Bottom Left */}
        <div className="absolute bottom-8 left-8 z-10">
          <button className="bg-transparent border-2 border-gray-600 text-gray-600 px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:border-blue-500 hover:text-white">
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
      <section className="w-full relative py-20" style={{
        backgroundImage: 'url(/images/Background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="max-w-7xl mx-auto px-6">
          {/* Gallery Title */}
          <h3 className="text-4xl font-bold text-gray-600 text-center mb-16">
            Explore Our Flow
          </h3>

          {/* Gallery Container */}
          <div className="relative">
            {/* Image and Content */}
            <div className="flex flex-col items-center gap-12">
              {/* Large Image */}
              <div className="w-full max-w-4xl">
                <img
                  src={galleryItems[currentSlide].image}
                  alt={galleryItems[currentSlide].title}
                  className="w-full h-auto rounded-xl shadow-2xl"
                />
              </div>

              {/* Text Content Below Image */}
              <div className="text-center max-w-3xl">
                <h4 className="text-4xl font-bold text-gray-800 mb-6">
                  {galleryItems[currentSlide].title}
                </h4>
                <p className="text-2xl text-gray-600 leading-relaxed">
                  {galleryItems[currentSlide].description}
                </p>
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center mt-16 space-x-4">
              {galleryItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KarooSync Mix Image Section */}
      <section className="w-full">
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
      </section>
    </div>
  );
};

export default MarketingApp;