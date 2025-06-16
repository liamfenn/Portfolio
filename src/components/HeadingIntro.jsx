// =============================
// HeadingIntro.jsx - Bio/Intro Section
// =============================

import './HeadingIntro.css';

export default function HeadingIntro() {
  return (
    <div className="heading-wrapper">
      <header className="heading-intro">
        <p>
          Liam Fennell is a product designer interested in fashion, culture, Web3, and artificial intelligence.
        </p>
        <p>
          Currently designing at <a href="https://shop.app" target="_blank" rel="noopener noreferrer">Shop</a> and building <a href="https://palea.com" target="_blank" rel="noopener noreferrer">Palea</a>, a thoughtful hardware company.
        </p>
        <p>
          Previously at <a href="https://openpurpose.com" target="_blank" rel="noopener noreferrer">OpenPurpose<sup>®</sup></a>, <a href="https://fitag.com" target="_blank" rel="noopener noreferrer">Fitag</a>
        </p>
      </header>
    </div>
  );
} 
