// Throttle function for performance
export function throttle(func, limit) {
  let inThrottle;
  let lastResult;
  
  return function(...args) {
    if (!inThrottle) {
      lastResult = func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
    
    return lastResult;
  };
}

// Debounce function
export function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/*
// Throttle function: Execute at most once every 'limit' milliseconds
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Debounce function: Execute only after 'delay' milliseconds of inactivity
export function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Optimized drawing function for 60fps
export function requestAnimationThrottle(func) {
  let ticking = false;
  
  return function(...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        func.apply(this, args);
        ticking = false;
      });
      
      ticking = true;
    }
  };
}
*/