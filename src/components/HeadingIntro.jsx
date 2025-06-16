// =============================
// HeadingIntro.jsx - Bio/Intro Section
// =============================

import './HeadingIntro.css';

export default function HeadingIntro() {
  return (
    <div className="heading-wrapper">
      <header className="heading-intro">
        <p>
          Liam Fennell is an Atlanta based product designer interested in fashion, culture, Web3, and artificial intelligence.
        </p>
        <p>
          Currently designing at <a href="https://shop.app" target="_blank" rel="noopener noreferrer">Shop</a> and leading <a href="https://sift.studio" target="_blank" rel="noopener noreferrer">Sift</a>, a design practice experimenting with hardware and software in the fashion and lifestyle space.
        </p>
        <p>
          Previously at <a href="https://openpurpose.com" target="_blank" rel="noopener noreferrer">OpenPurpose<sup>®</sup></a>
        </p>
      </header>
    </div>
  );
} 
