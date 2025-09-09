// Genera un'anteprima SVG "segnaposto" (niente immagini reali necessarie)
export const placeholderSVG = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='720'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#111'/><stop offset='100%' stop-color='#333'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <rect x='60' y='60' width='1080' height='180' rx='18' fill='#1f1f1f' stroke='#555' stroke-width='2'/>
    <rect x='60' y='270' width='480' height='330' rx='16' fill='#1a1a1a' stroke='#555' stroke-width='2'/>
    <rect x='570' y='270' width='570' height='150' rx='12' fill='#1a1a1a' stroke='#555' stroke-width='2'/>
    <rect x='570' y='435' width='570' height='165' rx='12' fill='#1a1a1a' stroke='#555' stroke-width='2'/>
    <text x='80' y='150' fill='#c9b458' font-size='48' font-family='Inter, Arial' font-weight='700'>${label}</text>
    <text x='590' y='355' fill='#bbb' font-size='28' font-family='Inter, Arial'>Hero + CTA • Nav • Footer</text>
    <text x='590' y='515' fill='#bbb' font-size='28' font-family='Inter, Arial'>Cards • Testi • Immagini</text>
  </svg>
`)}`;
