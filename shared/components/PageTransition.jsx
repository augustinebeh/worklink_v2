import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Provides smooth page transition animations
 * Wraps route content with fade/slide animations
 *
 * Shared component used by both Worker and Admin apps
 */
export function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start exit animation
    setIsAnimating(true);

    // After exit animation, swap content and start enter animation
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsAnimating(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  return (
    <div
      className={`page-transition ${isAnimating ? 'page-exit' : 'page-enter'}`}
      style={{
        animation: isAnimating
          ? 'page-fade-out 0.15s ease-out forwards'
          : 'page-fade-in 0.2s ease-out forwards',
      }}
    >
      {displayChildren}
      <style>{`
        @keyframes page-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes page-fade-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * SlideIn - Component that slides in from a direction
 */
export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 300,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(20px)',
    right: 'translateX(-20px)',
  };

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0)' : transforms[direction],
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * FadeIn - Simple fade in animation
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * StaggeredList - Animates list items with staggered delays
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className = '',
}) {
  return (
    <div className={className}>
      {Array.isArray(children) ? children.map((child, index) => (
        <SlideIn key={index} delay={initialDelay + (index * staggerDelay)} direction="up">
          {child}
        </SlideIn>
      )) : children}
    </div>
  );
}

/**
 * ScaleIn - Scale animation for emphasis
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

export default PageTransition;
