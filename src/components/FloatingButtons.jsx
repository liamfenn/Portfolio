import './FloatingButtons.css'

export default function FloatingButtons() {
  return (
    <div className="floating-buttons">
      <a 
        href="mailto:info@fennell.cv" 
        className="floating-button floating-button-light"
      >
        Email
      </a>
      <a 
        href="https://x.com/xyzfennell" 
        target="_blank" 
        rel="noopener noreferrer"
        className="floating-button floating-button-light"
      >
        X
      </a>
      <a 
        href="https://instagram.com/xyzfennell" 
        target="_blank" 
        rel="noopener noreferrer"
        className="floating-button floating-button-light"
      >
        IG
      </a>
      <a 
        href="https://are.na/liam-fennell" 
        target="_blank" 
        rel="noopener noreferrer"
        className="floating-button floating-button-light"
      >
        Are.na
      </a>
    </div>
  )
} 
