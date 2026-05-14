import React, { useState, useEffect, useRef } from 'react';

const TypewriterText = ({ text, delay = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        if (onCompleteRef.current) onCompleteRef.current();
      }
    }, delay);
    
    return () => clearInterval(timer);
  }, [text, delay]);

  return <span>{displayedText}</span>;
};

export default TypewriterText;
