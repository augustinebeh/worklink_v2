import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Provides smooth page transition animations
 * Simplified to avoid stale children state issues that cause white screens
 */
export function PageTransition({ children }) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only animate on actual path changes
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      setIsVisible(false);
      // Quick fade-in after path change
      const timer = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [location.pathname]);

  return (
    <div
      className="page-transition"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
      }}
    >
      {children}
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
