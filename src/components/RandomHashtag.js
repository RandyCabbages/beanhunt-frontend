import React, { useState, useEffect, useRef } from 'react';

// The pool of taglines. Pulled randomly per mount (so different visitors / different tabs
// see different starting tags) and then rotated every few seconds while the page is open.
const TAGS = [
  '#joinbeancore',
  '#fat',
  '#beantwitch',
  '#ProportianalyBest',
  '#isaac',
  '#maxwin',
  '#oink',
  '#meow',
  '#yo',
  '#quackquack',
  '#semendemon',
  '#bestie',
  '#same5',
  '#doordash',
  '#rainbet',
  '#AtTheEndOfTheDay',
  '#simulation',
  '#RealEyesRealizeRealLies',
  '#RealEyes',
  '#Realize',
  '#RealLies',
  '#lightningroulette',
  '#onlychild',
  '#suckmydicka',
  '#CrapsRuns',
  '#DuckPunt',
  '#bingbingbing',
  '#amazingTTS',
  '#upthebetpussy',
  '#randomupgrade',
  '#imbouttoprint',
  '#thatsrightladies',
  '#SHUTTHEFUCKUPWITHTHESTUPIDASSTTS',
  '#JoinBeanCore',
  '#alwayshitYES',
];

// How long to wait between flips, and how long the fade-out animation runs.
const ROTATE_MS = 4500;
const FADE_MS   = 320;

export default function RandomHashtag({
  fontSize = 16,
  letterSpacing = '0.1em',
  href = 'https://discord.com/invite/beantwitch',
}) {
  // Random starting index per mount so two open tabs / two viewers don't sync up.
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TAGS.length));
  const [fading, setFading] = useState(false);
  const idxRef = useRef(idx);
  idxRef.current = idx;

  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a new index that isn't the current one
      let next;
      do { next = Math.floor(Math.random() * TAGS.length); } while (next === idxRef.current && TAGS.length > 1);
      setFading(true);
      const t = setTimeout(() => {
        setIdx(next);
        setFading(false);
      }, FADE_MS);
      return () => clearTimeout(t);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <span style={{
        fontFamily: "'Chakra Petch',sans-serif",
        fontSize, fontWeight: 700, letterSpacing,
        background: 'linear-gradient(90deg,#9146ff,#c6f135)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}>
        {TAGS[idx]}
      </span>
    </a>
  );
}
